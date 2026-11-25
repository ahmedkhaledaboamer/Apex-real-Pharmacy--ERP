import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, PackageOpen, Undo2, Wallet } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { Badge, Button, Card, DataTable, PageHeader, SearchInput, StatCard, Tabs, Toolbar, downloadCsv, type Column } from '../../ui/kit';
import type { SaleReturn } from '../../types';
import { rangeStart, useRangeTabs, type RangeKey } from './shared';

export default function ReturnsPage() {
  const t = useTranslations('ErpSales.returns');
  const ti = useTranslations('ErpSales.invoices');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { productMap } = useCatalog();
  const rangeTabs = useRangeTabs();
  const [range, setRange] = useState<RangeKey>('90');
  const [scope, setScope] = useState<'branch' | 'all'>('all');
  const [q, setQ] = useState('');
  const saleNo = useMemo(() => new Map(d.sales.map((s) => [s._id, s.number])), [d.sales]);

  const rows = useMemo(() => {
    const from = rangeStart(range);
    const s = q.trim().toLowerCase();
    return d.returns
      .filter((r) => new Date(r.createdAt).getTime() >= from && (scope === 'all' || r.branchId === branch?._id))
      .filter((r) => !s || r.number.toLowerCase().includes(s) || (saleNo.get(r.saleId) ?? '').toLowerCase().includes(s))
      .reverse();
  }, [d.returns, range, scope, branch, q, saleNo]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = d.returns.filter((r) => new Date(r.createdAt).getTime() >= monthStart).reduce((s, r) => s + r.amount, 0);
  const units = rows.reduce((s, r) => s + r.items.reduce((n, i) => n + i.qty, 0), 0);

  const cols: Column<SaleReturn>[] = [
    { key: 'no', header: tc('number'), cell: (r) => <span className="font-semibold">{r.number}</span>, sort: (r) => r.number },
    { key: 'date', header: tc('date'), cell: (r) => <span className="text-slate-600 whitespace-nowrap">{fmt.dateTime(r.createdAt)}</span>, sort: (r) => r.createdAt },
    {
      key: 'inv',
      header: t('invoice'),
      cell: (r) => (
        <Link to={`/erp/invoices/${r.saleId}`} onClick={(e) => e.stopPropagation()} className="text-brand-gold font-medium hover:underline">
          {saleNo.get(r.saleId)}
        </Link>
      )
    },
    { key: 'items', header: tc('products'), cell: (r) => <span className="text-sm text-slate-600 line-clamp-1">{r.items.map((i) => `${name(productMap.get(i.productId))} × ${i.qty}`).join(', ')}</span> },
    { key: 'reason', header: t('reason'), cell: (r) => <span className="text-slate-600">{r.reason}</span> },
    { key: 'method', header: tc('method'), cell: (r) => <Badge tone={r.refundMethod === 'card' ? 'blue' : 'green'}>{tc(r.refundMethod)}</Badge> },
    { key: 'amt', header: t('refund'), cell: (r) => <span className="font-semibold text-rose-600 tabular-nums">− {fmt.money(r.amount)}</span>, sort: (r) => r.amount, align: 'end' }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Undo2}
        actions={
          <Button icon={Download} onClick={() => downloadCsv('returns.csv', [tc('number'), tc('date'), t('invoice'), t('reason'), tc('method'), t('refund')], rows.map((r) => [r.number, r.createdAt, saleNo.get(r.saleId) ?? '', r.reason, r.refundMethod, r.amount]))}>
            {tc('export')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('thisMonth')} value={fmt.money(thisMonth)} icon={Wallet} tone="rose" />
        <StatCard label={t('count')} value={fmt.int(rows.length)} icon={Undo2} tone="amber" />
        <StatCard label={t('units')} value={fmt.int(units)} icon={PackageOpen} tone="slate" />
      </div>
      <Card>
        <Toolbar>
          <Tabs value={range} onChange={setRange} items={rangeTabs} />
          <Tabs
            value={scope}
            onChange={setScope}
            items={[
              { value: 'branch', label: ti('thisBranch') },
              { value: 'all', label: tc('all') }
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="w-full sm:w-64 sm:ms-auto" />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(r) => r._id} onRowClick={(r) => navigate(`/erp/invoices/${r.saleId}`)} />
      </Card>
    </>
  );
}
