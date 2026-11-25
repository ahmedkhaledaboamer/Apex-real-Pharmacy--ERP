import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, ClipboardCheck, Plus, Save } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { erp, nowISO, postStockCount, stockOf } from '../../store';
import type { StockCount } from '../../types';
import { Badge, Button, Card, ConfirmDialog, cx, DataTable, EmptyState, Field, Input, Modal, PageHeader, Progress, SearchInput, Select, StatCard, StatusBadge, Tabs, Toolbar, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { ProductCell, useBranchLookup, useBranchName, useTs } from './shared';

function NewCountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const branch = useCurrentBranch();
  const bn = useBranchName();
  const { branches, categories, products } = useCatalog();
  const [b, setB] = useState(branch?._id ?? '');
  const [cat, setCat] = useState('');
  const n = products.filter((p) => !cat || p.category === cat).length;
  const start = () => {
    const lines = products.filter((p) => !cat || p.category === cat).map((p) => ({ productId: p._id, expected: stockOf(d, p._id, b), counted: null }));
    const rec = erp.insert('stockCounts', { number: erp.nextNumber('count', 'SC'), branchId: b, status: 'open', lines, createdAt: nowISO() });
    onClose();
    navigate(`/erp/stock-counts/${rec._id}`);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('counts.new')}
      subtitle={t('counts.newSub')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={start} disabled={!b || !n}>
            {t('counts.start', { n })}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={tc('branch')}>
          <Select value={b} onChange={(e) => setB(e.target.value)}>
            {branches.map((x) => (
              <option key={x._id} value={x._id}>
                {bn(x)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('counts.category')}>
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{t('stock.allCategories')}</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {name(c)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function CountList() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const bl = useBranchLookup();
  const [open, setOpen] = useState(false);
  const list = useMemo(() => [...d.stockCounts].reverse(), [d]);
  const cols: Column<StockCount>[] = [
    { key: 'no', header: tc('number'), cell: (x) => <span className="font-semibold">{x.number}</span>, sort: (x) => x.number },
    { key: 'br', header: tc('branch'), cell: (x) => bl(x.branchId) },
    {
      key: 'prog',
      header: t('counts.progressCol'),
      cell: (x) => {
        const done = x.lines.filter((l) => l.counted !== null).length;
        return (
          <div className="w-40">
            <div className="text-xs text-slate-500 mb-1 tabular-nums">{t('counts.progress', { done, total: x.lines.length })}</div>
            <Progress value={done} max={x.lines.length} />
          </div>
        );
      }
    },
    { key: 'var', header: t('counts.variances'), align: 'end', cell: (x) => <span className="tabular-nums">{fmt.int(x.lines.filter((l) => l.counted !== null && l.counted !== l.expected).length)}</span> },
    { key: 'date', header: tc('date'), sort: (x) => x.createdAt, cell: (x) => <span className="text-xs text-slate-500">{fmt.dateTime(x.createdAt)}</span> },
    { key: 'st', header: tc('status'), cell: (x) => <StatusBadge status={x.status} /> }
  ];
  return (
    <>
      <PageHeader
        title={t('counts.title')}
        subtitle={t('counts.subtitle')}
        icon={ClipboardCheck}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            {t('counts.new')}
          </Button>
        }
      />
      <Card>
        <DataTable
          rows={list}
          columns={cols}
          rowKey={(x) => x._id}
          onRowClick={(x) => navigate(`/erp/stock-counts/${x._id}`)}
          empty={
            <EmptyState
              icon={ClipboardCheck}
              title={t('counts.none')}
              description={t('counts.noneHint')}
              action={
                <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
                  {t('counts.new')}
                </Button>
              }
            />
          }
        />
      </Card>
      {open && <NewCountModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

function CountSheet() {
  const { id = '' } = useParams();
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const toast = useToast();
  const d = useErpState();
  const bl = useBranchLookup();
  const { productMap, meta } = useCatalog();
  const sc = d.stockCounts.find((x) => x._id === id);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [view, setView] = useState<'all' | 'pending' | 'variance'>('all');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (sc) setDraft(Object.fromEntries(sc.lines.map((l) => [l.productId, l.counted === null ? '' : String(l.counted)])));
  }, [sc?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => (sc ? sc.lines.map((l) => ({ ...l, counted: sc.status === 'posted' ? l.counted : draft[l.productId] === '' || draft[l.productId] === undefined ? null : Number(draft[l.productId]) })) : []), [sc, draft]);
  if (!sc) return <EmptyState title={t('counts.none')} action={<Link to="/erp/stock-counts"><Button icon={ArrowLeft}>{t('common.back')}</Button></Link>} />;
  const locked = sc.status === 'posted';
  const done = lines.filter((l) => l.counted !== null).length;
  const varLines = lines.filter((l) => l.counted !== null && l.counted !== l.expected);
  const varValue = varLines.reduce((s, l) => s + ((l.counted ?? 0) - l.expected) * (meta[l.productId]?.cost ?? 0), 0);
  const shown = lines.filter((l) => {
    const p = productMap.get(l.productId);
    const s = q.trim().toLowerCase();
    if (s && !name(p).toLowerCase().includes(s) && !meta[l.productId]?.barcode.includes(s)) return false;
    if (view === 'pending') return l.counted === null;
    if (view === 'variance') return l.counted !== null && l.counted !== l.expected;
    return true;
  });
  const save = () => {
    erp.update('stockCounts', sc._id, { lines: lines.map(({ productId, expected, counted }) => ({ productId, expected, counted })) });
    toast.success(t('counts.saved'));
  };
  const post = () => {
    erp.update('stockCounts', sc._id, { lines: lines.map(({ productId, expected, counted }) => ({ productId, expected, counted })) });
    postStockCount(sc._id);
    toast.success(t('counts.postedOk'));
  };
  type L = (typeof lines)[number];
  const cols: Column<L>[] = [
    { key: 'p', header: tc('product'), cell: (l) => <ProductCell id={l.productId} sub={`${meta[l.productId]?.location ?? ''} · ${meta[l.productId]?.barcode ?? ''}`} /> },
    { key: 'exp', header: t('counts.expected'), align: 'end', cell: (l) => <span className="tabular-nums text-slate-500">{fmt.int(l.expected)}</span> },
    {
      key: 'cnt',
      header: t('counts.counted'),
      align: 'end',
      cell: (l) =>
        locked ? (
          <span className="font-semibold tabular-nums">{l.counted ?? '—'}</span>
        ) : (
          <Input type="number" min={0} inputMode="numeric" value={draft[l.productId] ?? ''} onChange={(e) => setDraft({ ...draft, [l.productId]: e.target.value === '' ? '' : String(Math.max(0, Math.floor(Number(e.target.value)))) })} className="!w-24 !h-9 text-center ms-auto" />
        )
    },
    {
      key: 'var',
      header: t('counts.variance'),
      align: 'end',
      cell: (l) => {
        if (l.counted === null) return <span className="text-slate-300">—</span>;
        const v = l.counted - l.expected;
        return <span dir="ltr" className={cx('font-semibold tabular-nums', v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-slate-400')}>{v > 0 ? `+${v}` : v}</span>;
      }
    },
    { key: 'val', header: t('counts.varianceValue'), align: 'end', cell: (l) => (l.counted === null || l.counted === l.expected ? <span className="text-slate-300">—</span> : <span className="tabular-nums text-xs">{fmt.money((l.counted - l.expected) * (meta[l.productId]?.cost ?? 0))}</span>) }
  ];
  return (
    <>
      <Link to="/erp/stock-counts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('counts.title')}
      </Link>
      <PageHeader
        title={sc.number}
        subtitle={`${bl(sc.branchId)} · ${fmt.dateTime(sc.createdAt)}`}
        icon={ClipboardCheck}
        actions={
          locked ? (
            <Badge tone="green" dot>
              {t('counts.postedOn', { date: fmt.dateTime(sc.postedAt ?? sc.createdAt) })}
            </Badge>
          ) : (
            <>
              <Button icon={Save} onClick={save}>
                {t('counts.save')}
              </Button>
              <Button variant="primary" icon={CheckCheck} disabled={!done} onClick={() => setConfirm(true)}>
                {t('counts.post')}
              </Button>
            </>
          )
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('counts.progressCol')} value={`${Math.round((done / Math.max(1, lines.length)) * 100)}%`} hint={t('counts.progress', { done, total: lines.length })} icon={ClipboardCheck} tone="purple" />
        <StatCard label={t('counts.variances')} value={fmt.int(varLines.length)} icon={CheckCheck} tone="amber" />
        <StatCard label={t('counts.shortage')} value={fmt.int(varLines.filter((l) => (l.counted ?? 0) < l.expected).reduce((s, l) => s + l.expected - (l.counted ?? 0), 0))} hint={t('counts.shortageHint')} tone="rose" />
        <StatCard label={t('counts.varianceValue')} value={fmt.money(varValue)} tone={varValue < 0 ? 'rose' : 'teal'} />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={t('stock.searchPh')} className="w-full sm:w-72" />
          <Tabs
            className="sm:ms-auto"
            value={view}
            onChange={setView}
            items={[
              { value: 'all', label: tc('all'), count: lines.length },
              { value: 'pending', label: t('counts.notCounted'), count: lines.length - done },
              { value: 'variance', label: t('counts.variances'), count: varLines.length }
            ]}
          />
        </Toolbar>
        <DataTable rows={shown} columns={cols} rowKey={(l) => l.productId} pageSize={20} dense />
      </Card>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={post} title={t('counts.post')} message={t('counts.postConfirm', { n: varLines.length })} confirmLabel={t('counts.post')} />
    </>
  );
}

export default function StockCountsPage() {
  return (
    <Routes>
      <Route index element={<CountList />} />
      <Route path=":id" element={<CountSheet />} />
    </Routes>
  );
}
