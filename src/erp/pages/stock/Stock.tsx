import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Boxes, CircleDollarSign, Download, PackageX, Pencil, Plus, ScanBarcode, SlidersHorizontal, Tag, Trash2, Warehouse } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErp, useErpState, useFmt, useName } from '../../hooks';
import { addDays, adjustBatch, daysUntil, erp, receiveBatch, sellPrice, stockOf, toDay, today } from '../../store';
import type { Batch, ID } from '../../types';
import { BarChart } from '../../ui/charts';
import { Badge, Button, Card, CardHeader, DataTable, downloadCsv, EmptyState, Field, Input, KeyValue, Modal, PageHeader, ProductThumb, Progress, SearchInput, Select, StatCard, Tabs, Textarea, Toolbar, type Column } from '../../ui/kit';
import { ExpiryBadge, useBranchLookup, useBranchName, useTs } from './shared';
import { useToast } from '../../../components/ui/Toast';

type StatusKey = 'all' | 'ok' | 'low' | 'out' | 'expiring';

interface Row {
  id: ID;
  title: string;
  image: string;
  barcode: string;
  location: string;
  category?: ID;
  stock: number;
  reorder: number;
  nearest?: string;
  status: Exclude<StatusKey, 'all' | 'expiring'>;
  expiring: boolean;
  cost: number;
  price: number;
}

function StockList() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const branch = useCurrentBranch();
  const bn = useBranchName();
  const { products, categories, meta } = useCatalog();
  const [sp, setSp] = useSearchParams();
  const [scope, setScope] = useState<'branch' | 'all'>('branch');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const status = (sp.get('filter') as StatusKey) || 'all';
  const setStatus = (s: StatusKey) => {
    const n = new URLSearchParams(sp);
    if (s === 'all') n.delete('filter');
    else n.set('filter', s);
    setSp(n, { replace: true });
  };

  const rows: Row[] = useMemo(() => {
    const b = scope === 'branch' ? branch?._id : undefined;
    const t0 = today();
    return products.map((p) => {
      const m = meta[p._id];
      const stock = stockOf(d, p._id, b);
      const live = d.batches.filter((x) => x.productId === p._id && (!b || x.branchId === b) && x.qty > 0 && x.expiry >= t0).sort((a, z) => a.expiry.localeCompare(z.expiry));
      const reorder = (m?.reorderLevel ?? 10) * (b ? 1 : Math.max(1, d.batches.length ? new Set(d.batches.map((x) => x.branchId)).size : 1));
      const nearest = live[0]?.expiry;
      return {
        id: p._id,
        title: name(p),
        image: p.imageCover,
        barcode: m?.barcode ?? '',
        location: m?.location ?? '',
        category: p.category,
        stock,
        reorder,
        nearest,
        status: stock === 0 ? 'out' : stock <= reorder ? 'low' : 'ok',
        expiring: !!nearest && daysUntil(nearest) <= d.settings.expiryWarningDays,
        cost: m?.cost ?? 0,
        price: sellPrice(p)
      };
    });
  }, [products, meta, d, scope, branch, name]);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && !r.title.toLowerCase().includes(s) && !r.barcode.includes(s)) return false;
    if (cat && r.category !== cat) return false;
    if (status === 'expiring') return r.expiring;
    if (status !== 'all' && r.status !== status) return false;
    return true;
  });

  const kpi = useMemo(() => {
    const units = rows.reduce((s, r) => s + r.stock, 0);
    return {
      skus: rows.filter((r) => r.stock > 0).length,
      units,
      cost: rows.reduce((s, r) => s + r.stock * r.cost, 0),
      retail: rows.reduce((s, r) => s + r.stock * r.price, 0),
      low: rows.filter((r) => r.status === 'low').length,
      out: rows.filter((r) => r.status === 'out').length,
      expiring: rows.filter((r) => r.expiring).length
    };
  }, [rows]);

  const cols: Column<Row>[] = [
    {
      key: 'name',
      header: tc('product'),
      sort: (r) => r.title,
      cell: (r) => (
        <span className="flex items-center gap-3 min-w-0">
          <ProductThumb src={r.image} />
          <span className="min-w-0">
            <span className="block font-medium text-brand-dark truncate max-w-[280px]">{r.title}</span>
            <span className="block text-[11px] text-slate-400 tabular-nums">{r.barcode}</span>
          </span>
        </span>
      )
    },
    { key: 'loc', header: t('stock.location'), cell: (r) => <span className="font-mono text-xs text-slate-600 bg-slate-100 rounded-md px-1.5 py-0.5">{r.location}</span>, sort: (r) => r.location },
    {
      key: 'stock',
      header: tc('stock'),
      align: 'end',
      sort: (r) => r.stock,
      cell: (r) => (
        <div className="w-32 ms-auto">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-brand-dark tabular-nums">{fmt.int(r.stock)}</span>
            <span className="text-slate-400 tabular-nums">/ {fmt.int(r.reorder)}</span>
          </div>
          <Progress value={r.stock} max={r.reorder * 3} tone={r.status === 'out' ? 'red' : r.status === 'low' ? 'amber' : 'green'} />
        </div>
      )
    },
    { key: 'nearest', header: t('stock.nearestExpiry'), sort: (r) => r.nearest ?? '9999', cell: (r) => (r.nearest ? <span className="flex items-center gap-2"><span className="text-xs text-slate-600">{fmt.date(r.nearest)}</span>{r.expiring && <ExpiryBadge expiry={r.nearest} warn={d.settings.expiryWarningDays} />}</span> : <span className="text-slate-300">—</span>) },
    { key: 'value', header: t('stock.valueCost'), align: 'end', sort: (r) => r.stock * r.cost, cell: (r) => <span className="tabular-nums">{fmt.money(r.stock * r.cost)}</span> },
    { key: 'status', header: tc('status'), cell: (r) => <Badge tone={r.status === 'out' ? 'red' : r.status === 'low' ? 'amber' : 'green'} dot>{t(`stock.status_${r.status}`)}</Badge> }
  ];

  const exportCsv = () =>
    downloadCsv(
      `stock-${scope === 'branch' ? bn(branch) : 'all'}-${today()}.csv`,
      [tc('product'), tc('barcode'), t('stock.location'), tc('stock'), t('stock.reorder'), t('stock.nearestExpiry'), tc('cost'), tc('price')],
      filtered.map((r) => [r.title, r.barcode, r.location, r.stock, r.reorder, r.nearest ?? '', r.cost, r.price])
    );

  return (
    <>
      <PageHeader
        title={t('stock.title')}
        subtitle={scope === 'branch' ? t('stock.subtitleBranch', { branch: bn(branch) }) : t('stock.subtitleAll')}
        icon={Boxes}
        actions={
          <>
            <Tabs value={scope} onChange={setScope} items={[{ value: 'branch', label: bn(branch) }, { value: 'all', label: t('stock.scopeAll') }]} />
            <Button icon={Download} onClick={exportCsv}>
              {tc('export')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('stock.kpiSkus')} value={fmt.int(kpi.skus)} hint={t('stock.kpiUnits', { n: fmt.int(kpi.units) })} icon={Boxes} tone="purple" />
        <StatCard label={t('stock.kpiCost')} value={fmt.moneyCompact(kpi.cost)} hint={t('stock.kpiRetail', { v: fmt.moneyCompact(kpi.retail) })} icon={CircleDollarSign} tone="blue" />
        <StatCard label={t('stock.kpiLow')} value={fmt.int(kpi.low)} hint={t('stock.kpiLowHint')} icon={AlertTriangle} tone="amber" onClick={() => setStatus('low')} />
        <StatCard label={t('stock.kpiOut')} value={fmt.int(kpi.out)} hint={t('stock.kpiExpiring', { n: kpi.expiring })} icon={PackageX} tone="rose" onClick={() => setStatus('out')} />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={t('stock.searchPh')} className="w-full sm:w-72" />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!w-auto min-w-[180px]">
            <option value="">{t('stock.allCategories')}</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {name(c)}
              </option>
            ))}
          </Select>
          <Tabs
            className="sm:ms-auto"
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: tc('all'), count: rows.length },
              { value: 'ok', label: t('stock.status_ok') },
              { value: 'low', label: t('stock.status_low'), count: kpi.low },
              { value: 'out', label: t('stock.status_out'), count: kpi.out },
              { value: 'expiring', label: t('stock.status_expiring'), count: kpi.expiring }
            ]}
          />
        </Toolbar>
        <DataTable rows={filtered} columns={cols} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/erp/stock/${r.id}`)} pageSize={15} initialSort={{ key: 'stock', dir: 'asc' }} />
      </Card>
    </>
  );
}

/* ----------------------------- product detail ---------------------------- */
function AdjustModal({ batch, mode, onClose }: { batch: Batch | null; mode: 'adjust' | 'write_off'; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const n = Number(qty);
  const valid = Number.isInteger(n) && n !== 0 && (mode === 'adjust' ? batch && batch.qty + n >= 0 : n > 0 && batch && n <= batch.qty);
  const submit = () => {
    if (!batch || !valid) return;
    adjustBatch(batch._id, mode === 'adjust' ? n : -n, mode === 'adjust' ? 'adjustment' : 'write_off', reason || undefined);
    toast.success(mode === 'adjust' ? t('stock.adjusted') : t('stock.writtenOff'));
    setQty('');
    setReason('');
    onClose();
  };
  return (
    <Modal
      open={!!batch}
      onClose={onClose}
      size="sm"
      title={mode === 'adjust' ? t('stock.adjustTitle') : t('stock.writeOffTitle')}
      subtitle={batch ? `${tc('batch')} ${batch.batchNo} · ${t('stock.onHand', { n: batch.qty })}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant={mode === 'adjust' ? 'primary' : 'danger'} disabled={!valid} onClick={submit}>
            {mode === 'adjust' ? tc('save') : t('stock.writeOff')}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={mode === 'adjust' ? t('stock.delta') : tc('qty')} hint={mode === 'adjust' ? t('stock.deltaHint') : undefined}>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus placeholder={mode === 'adjust' ? '-2 / +5' : '1'} />
        </Field>
        <Field label={t('stock.reason')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === 'adjust' ? t('stock.reasonPh') : t('stock.writeOffPh')} />
        </Field>
      </div>
    </Modal>
  );
}

function AddBatchModal({ productId, open, onClose }: { productId: ID; open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const { branches, meta } = useCatalog();
  const branch = useCurrentBranch();
  const bn = useBranchName();
  const d = useErpState();
  const [f, setF] = useState({ branchId: branch?._id ?? '', batchNo: '', expiry: toDay(addDays(new Date(), 365)), qty: '', cost: String(meta[productId]?.cost ?? ''), supplierId: '' });
  const valid = f.branchId && f.batchNo.trim() && f.expiry && Number(f.qty) > 0 && Number(f.cost) >= 0;
  const submit = () => {
    if (!valid) return;
    receiveBatch({ productId, branchId: f.branchId, batchNo: f.batchNo.trim(), expiry: f.expiry, qty: Math.floor(Number(f.qty)), cost: Number(f.cost), supplierId: f.supplierId || undefined }, t('stock.openingStock'));
    toast.success(t('stock.batchAdded'));
    setF({ ...f, batchNo: '', qty: '' });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('stock.addBatch')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            {tc('add')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={tc('branch')} required>
          <Select value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {bn(b)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tc('supplier')}>
          <Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
            <option value="">—</option>
            {d.suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tc('batch')} required>
          <Input value={f.batchNo} onChange={(e) => setF({ ...f, batchNo: e.target.value })} placeholder="LOT2026A" />
        </Field>
        <Field label={tc('expiry')} required>
          <Input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} />
        </Field>
        <Field label={tc('qty')} required>
          <Input type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
        </Field>
        <Field label={t('stock.unitCost')} required>
          <Input type="number" min={0} step="0.01" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function MetaModal({ productId, open, onClose }: { productId: ID; open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const m = useErp((d) => d.productMeta[productId]);
  const [f, setF] = useState({ barcode: m?.barcode ?? '', cost: String(m?.cost ?? ''), reorderLevel: String(m?.reorderLevel ?? ''), location: m?.location ?? '', rx: !!m?.rx });
  const submit = () => {
    erp.setProductMeta(productId, { barcode: f.barcode.trim(), cost: Number(f.cost) || 0, reorderLevel: Math.max(0, Math.floor(Number(f.reorderLevel) || 0)), location: f.location.trim(), rx: f.rx });
    toast.success(t('stock.metaSaved'));
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('stock.editMeta')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={tc('barcode')}>
          <Input value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} />
        </Field>
        <Field label={t('stock.unitCost')}>
          <Input type="number" step="0.01" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
        </Field>
        <Field label={t('stock.reorder')}>
          <Input type="number" value={f.reorderLevel} onChange={(e) => setF({ ...f, reorderLevel: e.target.value })} />
        </Field>
        <Field label={t('stock.location')}>
          <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </Field>
        <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer">
          <input type="checkbox" checked={f.rx} onChange={(e) => setF({ ...f, rx: e.target.checked })} className="w-4 h-4 accent-[#7A1FB8]" />
          <span>
            <span className="block text-sm font-semibold text-brand-dark">{t('stock.rxOnly')}</span>
            <span className="block text-xs text-slate-500">{t('stock.rxHint')}</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

function ProductDetail() {
  const { id = '' } = useParams();
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const tm = useTranslations('Erp.movementTypes');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { productMap, branches, categories } = useCatalog();
  const bl = useBranchLookup();
  const bn = useBranchName();
  const p = productMap.get(id);
  const m = d.productMeta[id];
  const [adj, setAdj] = useState<{ batch: Batch; mode: 'adjust' | 'write_off' } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const batches = useMemo(() => d.batches.filter((b) => b.productId === id && (showEmpty || b.qty > 0)).sort((a, z) => a.expiry.localeCompare(z.expiry)), [d, id, showEmpty]);
  const movements = useMemo(() => d.movements.filter((x) => x.productId === id).slice(-12).reverse(), [d, id]);
  const sales30 = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => toDay(addDays(new Date(), i - 29)));
    const idx = new Map(days.map((x, i) => [x, i]));
    const vals = days.map(() => 0);
    for (const s of d.sales) {
      const k = idx.get(s.createdAt.slice(0, 10));
      if (k === undefined) continue;
      for (const it of s.items) if (it.productId === id) vals[k] += it.qty - it.returnedQty;
    }
    return { labels: days.map((x) => fmt.dateShort(x)), vals };
  }, [d, id, fmt]);

  if (!p) return <EmptyState title={t('stock.notFound')} action={<Link to="/erp/stock"><Button icon={ArrowLeft}>{t('common.back')}</Button></Link>} />;

  const total = stockOf(d, id);
  const cat = categories.find((c) => c._id === p.category);
  const cols: Column<Batch>[] = [
    { key: 'no', header: tc('batch'), cell: (b) => <span className="font-mono text-xs font-semibold">{b.batchNo}</span>, sort: (b) => b.batchNo },
    { key: 'branch', header: tc('branch'), cell: (b) => bl(b.branchId), sort: (b) => bl(b.branchId) },
    { key: 'exp', header: tc('expiry'), sort: (b) => b.expiry, cell: (b) => <span className="flex items-center gap-2"><span className="text-xs">{fmt.date(b.expiry)}</span><ExpiryBadge expiry={b.expiry} warn={d.settings.expiryWarningDays} /></span> },
    { key: 'qty', header: tc('qty'), align: 'end', sort: (b) => b.qty, cell: (b) => <span className="font-semibold tabular-nums">{fmt.int(b.qty)}</span> },
    { key: 'cost', header: tc('cost'), align: 'end', cell: (b) => <span className="tabular-nums">{fmt.money(b.cost)}</span> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (b) => (
        <span className="inline-flex gap-1">
          <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setAdj({ batch: b, mode: 'adjust' })}>
            {t('stock.adjust')}
          </Button>
          <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={!b.qty} onClick={() => setAdj({ batch: b, mode: 'write_off' })}>
            {t('stock.writeOff')}
          </Button>
        </span>
      )
    }
  ];

  return (
    <>
      <Link to="/erp/stock" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('stock.title')}
      </Link>
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="w-full md:w-40 h-40 shrink-0 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center overflow-hidden">
            <img src={p.imageCover} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {cat && <Badge tone="purple">{name(cat)}</Badge>}
                  {m?.rx ? <Badge tone="red">{t('stock.rxOnly')}</Badge> : <Badge tone="teal">{t('stock.otc')}</Badge>}
                </div>
                <h1 className="text-xl font-bold text-brand-dark">{name(p)}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={Pencil} onClick={() => setMetaOpen(true)}>
                  {t('stock.editMeta')}
                </Button>
                <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
                  {t('stock.addBatch')}
                </Button>
              </div>
            </div>
            <KeyValue
              cols={4}
              items={[
                { label: tc('barcode'), value: <span className="inline-flex items-center gap-1.5 tabular-nums"><ScanBarcode className="w-4 h-4 text-slate-400" />{m?.barcode}</span> },
                { label: t('stock.location'), value: <span className="inline-flex items-center gap-1.5"><Tag className="w-4 h-4 text-slate-400" />{m?.location}</span> },
                { label: tc('price'), value: fmt.money(sellPrice(p)) },
                { label: tc('cost'), value: `${fmt.money(m?.cost ?? 0)} · ${t('stock.margin', { n: Math.round(((sellPrice(p) - (m?.cost ?? 0)) / (sellPrice(p) || 1)) * 100) })}` },
                { label: t('stock.totalStock'), value: fmt.int(total) },
                { label: t('stock.reorder'), value: fmt.int(m?.reorderLevel ?? 0) },
                { label: t('stock.unitsSold30'), value: fmt.int(sales30.vals.reduce((a, b) => a + b, 0)) },
                { label: t('stock.lifetimeSold'), value: fmt.int(p.sold) }
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {branches.map((b) => {
          const s = stockOf(d, id, b._id);
          const reorder = m?.reorderLevel ?? 10;
          return (
            <Card key={b._id} className="!p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                <Warehouse className="w-4 h-4 text-brand-gold" />
                {bn(b)}
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-bold tabular-nums">{fmt.int(s)}</span>
                <Badge tone={s === 0 ? 'red' : s <= reorder ? 'amber' : 'green'} dot>
                  {t(`stock.status_${s === 0 ? 'out' : s <= reorder ? 'low' : 'ok'}`)}
                </Badge>
              </div>
              <Progress value={s} max={reorder * 3} tone={s === 0 ? 'red' : s <= reorder ? 'amber' : 'green'} />
            </Card>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t('stock.batches')}
            subtitle={t('stock.batchesSub')}
            action={
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="accent-[#7A1FB8]" />
                {t('stock.showEmpty')}
              </label>
            }
          />
          <DataTable rows={batches} columns={cols} rowKey={(b) => b._id} pageSize={8} empty={<EmptyState title={t('stock.noBatches')} />} />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('stock.sales30')} subtitle={t('stock.sales30Sub')} />
            <BarChart labels={sales30.labels} series={[{ name: t('stock.unitsSold'), values: sales30.vals }]} height={180} format={(n) => fmt.num(n)} />
          </Card>
          <Card>
            <CardHeader title={t('stock.recentMovements')} />
            {!movements.length ? (
              <p className="text-sm text-slate-500 py-6 text-center">{t('stock.noMovements')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {movements.map((mv) => (
                  <li key={mv._id} className="py-2.5 flex items-center gap-3">
                    <span dir="ltr" className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${mv.qty >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{mv.qty > 0 ? `+${mv.qty}` : mv.qty}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-brand-dark">{tm(mv.type)}</span>
                      <span className="block text-[11px] text-slate-400 truncate">
                        {bl(mv.branchId)} · {fmt.dateTime(mv.createdAt)} {mv.refNo ? `· ${mv.refNo}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <AdjustModal batch={adj?.batch ?? null} mode={adj?.mode ?? 'adjust'} onClose={() => setAdj(null)} />
      {addOpen && <AddBatchModal productId={id} open={addOpen} onClose={() => setAddOpen(false)} />}
      {metaOpen && <MetaModal productId={id} open={metaOpen} onClose={() => setMetaOpen(false)} />}
    </>
  );
}

export default function StockPage() {
  return (
    <Routes>
      <Route index element={<StockList />} />
      <Route path=":id" element={<ProductDetail />} />
    </Routes>
  );
}
