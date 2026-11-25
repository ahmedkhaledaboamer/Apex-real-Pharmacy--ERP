import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Download, History } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useFmt, useName } from '../../hooks';
import { today } from '../../store';
import type { MovementType, StockMovement } from '../../types';
import { Badge, Card, cx, DataTable, downloadCsv, EmptyState, Input, PageHeader, SearchInput, Select, StatCard, Toolbar, type Column, type Tone } from '../../ui/kit';
import { ProductCell, useBranchLookup, useBranchName, useTs } from './shared';

const TYPES: MovementType[] = ['sale', 'return', 'purchase', 'transfer_in', 'transfer_out', 'adjustment', 'write_off'];
const TONE: Record<MovementType, Tone> = { sale: 'blue', return: 'teal', purchase: 'green', transfer_in: 'purple', transfer_out: 'purple', adjustment: 'gray', write_off: 'red' };

export default function MovementsPage() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const tm = useTranslations('Erp.movementTypes');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const bl = useBranchLookup();
  const bn = useBranchName();
  const { branches, productMap } = useCatalog();
  const [type, setType] = useState('');
  const [branch, setBranch] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...d.movements]
      .reverse()
      .filter((m) => (!type || m.type === type) && (!branch || m.branchId === branch))
      .filter((m) => (!from || m.createdAt.slice(0, 10) >= from) && (!to || m.createdAt.slice(0, 10) <= to))
      .filter((m) => !s || name(productMap.get(m.productId)).toLowerCase().includes(s) || (m.refNo ?? '').toLowerCase().includes(s));
  }, [d, type, branch, from, to, q, name, productMap]);
  const inQty = rows.reduce((s, m) => s + (m.qty > 0 ? m.qty : 0), 0);
  const outQty = rows.reduce((s, m) => s + (m.qty < 0 ? -m.qty : 0), 0);

  const refLink = (m: StockMovement) => {
    if (!m.refNo) return <span className="text-slate-300">—</span>;
    const path = m.type === 'sale' || m.type === 'return' ? `/erp/invoices/${m.refId}` : m.type === 'purchase' ? `/erp/purchase-orders/${m.refId}` : m.type.startsWith('transfer') ? `/erp/transfers/${m.refId}` : m.refNo.startsWith('SC') ? `/erp/stock-counts/${m.refId}` : '';
    return path ? (
      <Link to={path} className="font-medium text-brand-gold hover:underline">
        {m.refNo}
      </Link>
    ) : (
      m.refNo
    );
  };
  const cols: Column<StockMovement>[] = [
    { key: 'date', header: tc('date'), sort: (m) => m.createdAt, cell: (m) => <span className="text-xs text-slate-500 whitespace-nowrap">{fmt.dateTime(m.createdAt)}</span> },
    { key: 'p', header: tc('product'), cell: (m) => <ProductCell id={m.productId} sub={m.note} /> },
    { key: 'type', header: t('movements.type'), cell: (m) => <Badge tone={TONE[m.type]}>{tm(m.type)}</Badge> },
    { key: 'br', header: tc('branch'), cell: (m) => <span className="text-sm">{bl(m.branchId)}</span> },
    { key: 'ref', header: t('movements.ref'), cell: refLink },
    { key: 'qty', header: tc('qty'), align: 'end', sort: (m) => m.qty, cell: (m) => <span dir="ltr" className={cx('font-semibold tabular-nums', m.qty > 0 ? 'text-emerald-600' : 'text-rose-600')}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span> }
  ];
  return (
    <>
      <PageHeader
        title={t('movements.title')}
        subtitle={t('movements.subtitle')}
        icon={History}
        actions={
          <button
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50"
            onClick={() =>
              downloadCsv(
                `stock-movements-${today()}.csv`,
                [tc('date'), tc('product'), t('movements.type'), tc('branch'), t('movements.ref'), tc('qty'), tc('notes')],
                rows.map((m) => [m.createdAt, name(productMap.get(m.productId)), tm(m.type), bl(m.branchId), m.refNo ?? '', m.qty, m.note ?? ''])
              )
            }>
            <Download className="w-4 h-4" />
            {tc('export')}
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('movements.count')} value={fmt.int(rows.length)} icon={History} tone="purple" />
        <StatCard label={t('movements.qtyIn')} value={`+${fmt.int(inQty)}`} icon={ArrowDownLeft} tone="teal" />
        <StatCard label={t('movements.qtyOut')} value={`-${fmt.int(outQty)}`} icon={ArrowUpRight} tone="rose" />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={t('movements.searchPh')} className="w-full sm:w-64" />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="!w-auto">
            <option value="">{t('movements.allTypes')}</option>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {tm(x)}
              </option>
            ))}
          </Select>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="!w-auto">
            <option value="">{t('stock.scopeAll')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {bn(b)}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-40" aria-label={tc('from')} />
            <span className="text-slate-400">–</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-40" aria-label={tc('to')} />
          </div>
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(m) => m._id} pageSize={20} dense empty={<EmptyState icon={History} title={t('movements.none')} description={t('movements.noneHint')} />} />
      </Card>
    </>
  );
}
