import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, PackageCheck, Plus, Printer, Save, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { addDays, erp, nowISO, receivePO, round2, stockOf, toDay } from '../../store';
import type { ID, POItem, POStatus, PurchaseOrder } from '../../types';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Field, Input, KeyValue, Modal, PageHeader, Progress, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea, Toolbar, printHtml, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { ProductCell, ProductPicker, useBranchLookup, useBranchName, useTs } from './shared';

const poTotal = (items: POItem[]) => round2(items.reduce((a, i) => a + i.qty * i.cost, 0));

function PoList() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const bl = useBranchLookup();
  const [tab, setTab] = useState<'all' | POStatus>('all');
  const [q, setQ] = useState('');
  const list = useMemo(() => [...d.purchaseOrders].reverse(), [d]);
  const sup = (id: ID) => d.suppliers.find((s) => s._id === id);
  const rows = list.filter((p) => (tab === 'all' || p.status === tab) && (!q.trim() || p.number.toLowerCase().includes(q.trim().toLowerCase()) || (sup(p.supplierId)?.name ?? '').toLowerCase().includes(q.trim().toLowerCase())));
  const count = (s: POStatus) => list.filter((p) => p.status === s).length;
  const openValue = list.filter((p) => p.status === 'ordered' || p.status === 'partial').reduce((a, p) => a + p.items.reduce((s, i) => s + (i.qty - i.receivedQty) * i.cost, 0), 0);
  const cols: Column<PurchaseOrder>[] = [
    { key: 'no', header: tc('number'), sort: (p) => p.number, cell: (p) => <span className="font-semibold">{p.number}</span> },
    { key: 'sup', header: tc('supplier'), sort: (p) => sup(p.supplierId)?.name ?? '', cell: (p) => sup(p.supplierId)?.name ?? '—' },
    { key: 'br', header: tc('branch'), cell: (p) => bl(p.branchId) },
    {
      key: 'recv',
      header: t('po.received'),
      cell: (p) => {
        const q0 = p.items.reduce((a, i) => a + i.qty, 0);
        const r = p.items.reduce((a, i) => a + i.receivedQty, 0);
        return (
          <div className="w-28">
            <div className="text-[11px] text-slate-500 tabular-nums mb-1">
              {r}/{q0}
            </div>
            <Progress value={r} max={q0} tone={r >= q0 ? 'green' : 'purple'} />
          </div>
        );
      }
    },
    { key: 'exp', header: t('po.expected'), sort: (p) => p.expectedAt ?? '', cell: (p) => <span className="text-xs text-slate-500">{p.expectedAt ? fmt.date(p.expectedAt) : '—'}</span> },
    { key: 'tot', header: t('po.totalEx'), align: 'end', sort: (p) => poTotal(p.items), cell: (p) => <span className="font-semibold tabular-nums">{fmt.money(poTotal(p.items))}</span> },
    { key: 'st', header: tc('status'), cell: (p) => <StatusBadge status={p.status} /> }
  ];
  return (
    <>
      <PageHeader
        title={t('po.title')}
        subtitle={t('po.subtitle')}
        icon={ClipboardList}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => navigate('/erp/purchase-orders/new')}>
            {t('po.new')}
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('po.kpiDraft')} value={fmt.int(count('draft'))} icon={ClipboardList} tone="slate" onClick={() => setTab('draft')} />
        <StatCard label={t('po.kpiOpen')} value={fmt.int(count('ordered') + count('partial'))} icon={Send} tone="blue" onClick={() => setTab('ordered')} />
        <StatCard label={t('po.kpiOpenValue')} value={fmt.moneyCompact(openValue)} icon={PackageCheck} tone="purple" />
        <StatCard label={t('po.kpiReceived')} value={fmt.int(count('received'))} icon={PackageCheck} tone="teal" onClick={() => setTab('received')} />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={t('po.searchPh')} className="w-full sm:w-64" />
          <Tabs
            className="sm:ms-auto"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: tc('all'), count: list.length },
              { value: 'draft', label: t('po.tabDraft'), count: count('draft') },
              { value: 'ordered', label: t('po.tabOrdered'), count: count('ordered') },
              { value: 'partial', label: t('po.tabPartial'), count: count('partial') },
              { value: 'received', label: t('po.tabReceived'), count: count('received') },
              { value: 'cancelled', label: t('po.tabCancelled'), count: count('cancelled') }
            ]}
          />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(p) => p._id} onRowClick={(p) => navigate(`/erp/purchase-orders/${p._id}`)} empty={<EmptyState icon={ClipboardList} title={t('po.none')} />} />
      </Card>
    </>
  );
}

/* --------------------------------- editor -------------------------------- */
function PoEditor({ po }: { po?: PurchaseOrder }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const toast = useToast();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const d = useErpState();
  const branch = useCurrentBranch();
  const bn = useBranchName();
  const { branches, products, meta } = useCatalog();
  const [supplierId, setSupplierId] = useState(po?.supplierId ?? sp.get('supplier') ?? '');
  const [branchId, setBranchId] = useState(po?.branchId ?? branch?._id ?? '');
  const [expectedAt, setExpectedAt] = useState(po?.expectedAt ?? toDay(addDays(new Date(), 5)));
  const [notes, setNotes] = useState(po?.notes ?? '');
  const [items, setItems] = useState<POItem[]>(po?.items ?? []);
  const [tried, setTried] = useState(false);
  const valid = supplierId && branchId && items.length > 0 && items.every((i) => i.qty > 0 && i.cost >= 0);

  const addLow = () => {
    const have = new Set(items.map((i) => i.productId));
    const add: POItem[] = [];
    for (const p of products) {
      if (have.has(p._id)) continue;
      const m = meta[p._id];
      const s = stockOf(d, p._id, branchId);
      const reorder = m?.reorderLevel ?? 10;
      if (s <= reorder) add.push({ productId: p._id, qty: Math.max(10, Math.ceil((reorder * 3 - s) / 10) * 10), cost: m?.cost ?? 0, receivedQty: 0 });
    }
    setItems([...items, ...add]);
    toast.success(add.length ? t('po.lowAdded', { n: add.length }) : t('po.noLow'));
  };

  const save = (status: 'draft' | 'ordered') => {
    setTried(true);
    if (!valid) return;
    const now = nowISO();
    const rec = { supplierId, branchId, expectedAt, notes: notes || undefined, items, status, updatedAt: now };
    let id = po?._id;
    if (po) erp.update('purchaseOrders', po._id, rec);
    else id = erp.insert('purchaseOrders', { ...rec, number: erp.nextNumber('po', 'PO'), createdAt: now })._id;
    toast.success(status === 'ordered' ? t('po.orderedOk') : t('po.draftSaved'));
    navigate(`/erp/purchase-orders/${id}`, { replace: true });
  };

  const cols: Column<POItem>[] = [
    { key: 'p', header: tc('product'), cell: (i) => <ProductCell id={i.productId} sub={t('po.inStock', { n: stockOf(d, i.productId, branchId), r: meta[i.productId]?.reorderLevel ?? 0 })} /> },
    { key: 'q', header: tc('qty'), align: 'end', cell: (i) => <Input type="number" min={1} value={i.qty} onChange={(e) => setItems(items.map((x) => (x.productId === i.productId ? { ...x, qty: Math.max(0, Math.floor(Number(e.target.value))) } : x)))} className="!w-24 !h-9 text-center ms-auto" /> },
    { key: 'c', header: t('stock.unitCost'), align: 'end', cell: (i) => <Input type="number" min={0} step="0.01" value={i.cost} onChange={(e) => setItems(items.map((x) => (x.productId === i.productId ? { ...x, cost: Number(e.target.value) } : x)))} className="!w-28 !h-9 text-center ms-auto" /> },
    { key: 't', header: tc('total'), align: 'end', cell: (i) => <span className="font-semibold tabular-nums whitespace-nowrap">{fmt.money(i.qty * i.cost)}</span> },
    {
      key: 'x',
      header: '',
      align: 'end',
      cell: (i) => (
        <button onClick={() => setItems(items.filter((x) => x.productId !== i.productId))} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label={tc('delete')}>
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];
  const sub = poTotal(items);
  const vat = round2((sub * d.settings.vatRate) / 100);
  return (
    <>
      <Link to={po ? `/erp/purchase-orders/${po._id}` : '/erp/purchase-orders'} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('po.title')}
      </Link>
      <PageHeader
        title={po ? t('po.editTitle', { no: po.number }) : t('po.new')}
        subtitle={t('po.editorSub')}
        icon={ClipboardList}
        actions={
          <>
            <Button icon={Save} onClick={() => save('draft')}>
              {t('po.saveDraft')}
            </Button>
            <Button variant="primary" icon={Send} onClick={() => save('ordered')}>
              {t('po.saveOrder')}
            </Button>
          </>
        }
      />
      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t('po.lines')}
            subtitle={tried && !items.length ? <span className="text-rose-600">{t('po.needLines')}</span> : t('po.linesSub')}
            action={
              <Button size="sm" variant="soft" icon={Sparkles} onClick={addLow}>
                {t('po.addLow')}
              </Button>
            }
          />
          {items.length > 0 && <DataTable rows={items} columns={cols} rowKey={(i) => i.productId} pageSize={50} dense />}
          <ProductPicker className="mt-3" exclude={items.map((i) => i.productId)} onPick={(id) => setItems([...items, { productId: id, qty: 10, cost: meta[id]?.cost ?? 0, receivedQty: 0 }])} />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={tc('details')} />
            <div className="space-y-4">
              <Field label={tc('supplier')} required error={tried && !supplierId ? t('po.selectSupplier') : undefined}>
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">{t('po.selectSupplier')}</option>
                  {d.suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {fmt.locale === 'ar' ? s.nameAr || s.name : s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('po.deliverTo')}>
                <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {bn(b)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('po.expected')}>
                <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
              </Field>
              <Field label={tc('notes')}>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <dt>{t('po.lineCount', { n: items.length })}</dt>
                <dd className="tabular-nums">{tc('units', { n: items.reduce((a, i) => a + i.qty, 0) })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{tc('subtotal')}</dt>
                <dd className="tabular-nums">{fmt.money(sub)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {tc('vat')} ({d.settings.vatRate}%)
                </dt>
                <dd className="tabular-nums">{fmt.money(vat)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-base font-bold">
                <dt>{tc('total')}</dt>
                <dd className="tabular-nums">{fmt.money(sub + vat)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- receiving ------------------------------ */
function ReceiveModal({ po, open, onClose }: { po: PurchaseOrder; open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const remaining = po.items.filter((i) => i.qty > i.receivedQty);
  const [lines, setLines] = useState(() =>
    remaining.map((i, k) => ({ productId: i.productId, qty: String(i.qty - i.receivedQty), batchNo: `${po.number.replace('PO-', 'B')}${String.fromCharCode(65 + k)}`, expiry: toDay(addDays(new Date(), 540)), cost: i.cost, max: i.qty - i.receivedQty }))
  );
  const valid = lines.some((l) => Number(l.qty) > 0) && lines.every((l) => Number(l.qty) >= 0 && Number(l.qty) <= l.max && (Number(l.qty) === 0 || (l.batchNo.trim() && l.expiry)));
  const submit = () => {
    if (!valid) return;
    receivePO(
      po._id,
      lines.filter((l) => Number(l.qty) > 0).map((l) => ({ productId: l.productId, qty: Math.floor(Number(l.qty)), batchNo: l.batchNo.trim(), expiry: l.expiry, cost: l.cost }))
    );
    toast.success(t('po.receivedOk'));
    onClose();
  };
  const set = (k: number, patch: Partial<(typeof lines)[number]>) => setLines(lines.map((l, i) => (i === k ? { ...l, ...patch } : l)));
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={t('po.receiveTitle', { no: po.number })}
      subtitle={t('po.receiveSub')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" icon={PackageCheck} disabled={!valid} onClick={submit}>
            {t('po.receiveConfirm')}
          </Button>
        </>
      }>
      <div className="space-y-2">
        {lines.map((l, k) => (
          <div key={l.productId} className="grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_90px_minmax(0,1fr)_150px] gap-3 items-end rounded-xl border border-slate-200 p-3">
            <div className="col-span-2 md:col-span-1 min-w-0 self-center">
              <ProductCell id={l.productId} sub={t('po.remaining', { n: l.max })} />
            </div>
            <Field label={t('po.toReceive')}>
              <Input type="number" min={0} max={l.max} value={l.qty} onChange={(e) => set(k, { qty: e.target.value })} className={Number(l.qty) > l.max ? '!border-rose-400' : ''} />
            </Field>
            <Field label={tc('batch')}>
              <Input value={l.batchNo} onChange={(e) => set(k, { batchNo: e.target.value })} />
            </Field>
            <Field label={tc('expiry')}>
              <Input type="date" value={l.expiry} onChange={(e) => set(k, { expiry: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function printPo(po: PurchaseOrder, ctx: { supplier?: { name: string; contactName: string; phone: string; email: string; trn: string; city: string }; branch: string; name: (id: ID) => string; money: (n: number) => string; date: (v: string) => string; settings: { pharmacyName: string; trn: string; address: string; phone: string; email: string; vatRate: number }; labels: Record<string, string>; rtl: boolean }) {
  const sub = poTotal(po.items);
  const vat = round2((sub * ctx.settings.vatRate) / 100);
  const L = ctx.labels;
  const rows = po.items.map((i, k) => `<tr><td>${k + 1}</td><td>${ctx.name(i.productId)}</td><td class="end">${i.qty}</td><td class="end">${ctx.money(i.cost)}</td><td class="end">${ctx.money(i.qty * i.cost)}</td></tr>`).join('');
  printHtml(
    po.number,
    `<div style="max-width:760px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7A1FB8;padding-bottom:14px">
        <div><img class="logo" src="${location.origin}/images/apex-logo.png" alt=""/><div class="muted" style="margin-top:6px">${ctx.settings.address}<br/>${ctx.settings.phone} · ${ctx.settings.email}<br/>TRN ${ctx.settings.trn}</div></div>
        <div style="text-align:end"><h1 style="font-size:22px;color:#7A1FB8">${L.title}</h1><div style="font-size:15px;font-weight:700">${po.number}</div><div class="muted">${L.date}: ${ctx.date(po.createdAt)}</div>${po.expectedAt ? `<div class="muted">${L.expected}: ${ctx.date(po.expectedAt)}</div>` : ''}</div>
      </div>
      <div style="display:flex;gap:24px;margin-top:16px">
        <div style="flex:1;background:#F5F6FB;border-radius:10px;padding:12px"><div class="muted" style="font-size:10px;text-transform:uppercase">${L.supplier}</div><b>${ctx.supplier?.name ?? ''}</b><br/>${ctx.supplier?.contactName ?? ''} · ${ctx.supplier?.phone ?? ''}<br/>${ctx.supplier?.email ?? ''}<br/>TRN ${ctx.supplier?.trn ?? ''}</div>
        <div style="flex:1;background:#F5F6FB;border-radius:10px;padding:12px"><div class="muted" style="font-size:10px;text-transform:uppercase">${L.deliverTo}</div><b>${ctx.settings.pharmacyName}</b><br/>${ctx.branch}</div>
      </div>
      <table><thead><tr><th>#</th><th>${L.product}</th><th class="end">${L.qty}</th><th class="end">${L.cost}</th><th class="end">${L.total}</th></tr></thead><tbody>${rows}</tbody></table>
      <table style="width:280px;margin-inline-start:auto"><tbody>
        <tr class="tot"><td>${L.subtotal}</td><td class="end">${ctx.money(sub)}</td></tr>
        <tr class="tot"><td>${L.vat} (${ctx.settings.vatRate}%)</td><td class="end">${ctx.money(vat)}</td></tr>
        <tr class="grand"><td>${L.total}</td><td class="end">${ctx.money(sub + vat)}</td></tr>
      </tbody></table>
      ${po.notes ? `<p class="muted" style="margin-top:16px">${L.notes}: ${po.notes}</p>` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:56px"><div style="border-top:1px solid #94a3b8;width:200px;padding-top:6px" class="muted">${L.preparedBy}</div><div style="border-top:1px solid #94a3b8;width:200px;padding-top:6px" class="muted">${L.approvedBy}</div></div>
    </div>`,
    ctx.rtl ? 'rtl' : 'ltr'
  );
}

function PoDetail() {
  const { id = '' } = useParams();
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const locale = useLocale();
  const toast = useToast();
  const d = useErpState();
  const bl = useBranchLookup();
  const { productMap, meta } = useCatalog();
  const [receive, setReceive] = useState(false);
  const [cancel, setCancel] = useState(false);
  const po = d.purchaseOrders.find((p) => p._id === id);
  if (!po) return <EmptyState title={t('po.none')} action={<Link to="/erp/purchase-orders"><Button icon={ArrowLeft}>{t('common.back')}</Button></Link>} />;
  if (po.status === 'draft') return <PoEditor key={po._id} po={po} />;
  const s = d.suppliers.find((x) => x._id === po.supplierId);
  const sub = poTotal(po.items);
  const vat = round2((sub * d.settings.vatRate) / 100);
  const invoices = d.supplierInvoices.filter((i) => i.poId === po._id);
  const doPrint = () =>
    printPo(po, {
      supplier: s,
      branch: bl(po.branchId),
      name: (pid) => name(productMap.get(pid)),
      money: fmt.money,
      date: fmt.date,
      settings: { ...d.settings, pharmacyName: locale === 'ar' ? d.settings.pharmacyNameAr : d.settings.pharmacyName },
      rtl: locale === 'ar',
      labels: { title: t('po.printTitle'), date: tc('date'), expected: t('po.expected'), supplier: tc('supplier'), deliverTo: t('po.deliverTo'), product: tc('product'), qty: tc('qty'), cost: t('stock.unitCost'), total: tc('total'), subtotal: tc('subtotal'), vat: tc('vat'), notes: tc('notes'), preparedBy: t('po.preparedBy'), approvedBy: t('po.approvedBy') }
    });
  const cols: Column<POItem>[] = [
    { key: 'p', header: tc('product'), cell: (i) => <ProductCell id={i.productId} sub={meta[i.productId]?.barcode} /> },
    { key: 'q', header: t('po.ordered'), align: 'end', cell: (i) => <span className="tabular-nums">{fmt.int(i.qty)}</span> },
    { key: 'r', header: t('po.received'), align: 'end', cell: (i) => <span className={`font-semibold tabular-nums ${i.receivedQty >= i.qty ? 'text-emerald-600' : i.receivedQty ? 'text-amber-600' : 'text-slate-400'}`}>{fmt.int(i.receivedQty)}</span> },
    { key: 'c', header: t('stock.unitCost'), align: 'end', cell: (i) => <span className="tabular-nums">{fmt.money(i.cost)}</span> },
    { key: 't', header: tc('total'), align: 'end', cell: (i) => <span className="font-semibold tabular-nums whitespace-nowrap">{fmt.money(i.qty * i.cost)}</span> }
  ];
  return (
    <>
      <Link to="/erp/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('po.title')}
      </Link>
      <PageHeader
        title={po.number}
        subtitle={s ? (locale === 'ar' ? s.nameAr || s.name : s.name) : ''}
        icon={ClipboardList}
        actions={
          <>
            <StatusBadge status={po.status} />
            <Button icon={Printer} onClick={doPrint}>
              {tc('print')}
            </Button>
            {(po.status === 'ordered' || po.status === 'partial') && (
              <Button variant="primary" icon={PackageCheck} onClick={() => setReceive(true)}>
                {t('po.receive')}
              </Button>
            )}
            {po.status === 'ordered' && (
              <Button variant="ghost" icon={X} onClick={() => setCancel(true)}>
                {t('po.cancelPo')}
              </Button>
            )}
          </>
        }
      />
      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title={t('po.lines')} />
          <DataTable rows={po.items} columns={cols} rowKey={(i) => i.productId} pageSize={50} />
          <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">{tc('subtotal')}</dt>
              <dd className="tabular-nums">{fmt.money(sub)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">
                {tc('vat')} ({d.settings.vatRate}%)
              </dt>
              <dd className="tabular-nums">{fmt.money(vat)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 font-bold">
              <dt>{tc('total')}</dt>
              <dd className="tabular-nums">{fmt.money(sub + vat)}</dd>
            </div>
          </dl>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={tc('details')} />
            <KeyValue
              cols={1}
              items={[
                { label: tc('supplier'), value: s ? <Link className="text-brand-gold hover:underline" to={`/erp/suppliers/${s._id}`}>{locale === 'ar' ? s.nameAr || s.name : s.name}</Link> : '—' },
                { label: t('po.deliverTo'), value: bl(po.branchId) },
                { label: tc('createdAt'), value: fmt.dateTime(po.createdAt) },
                { label: t('po.expected'), value: po.expectedAt ? fmt.date(po.expectedAt) : '—' },
                { label: tc('notes'), value: po.notes || '—' }
              ]}
            />
          </Card>
          <Card>
            <CardHeader title={t('po.invoices')} />
            {!invoices.length ? (
              <p className="text-sm text-slate-500">{t('po.noInvoices')}</p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((i) => (
                  <li key={i._id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold">{i.number}</span>
                    <span className="text-sm tabular-nums">{fmt.money(i.amount)}</span>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
                <li>
                  <Link to="/erp/payables" className="text-xs font-semibold text-brand-gold hover:underline">
                    {t('po.goPayables')}
                  </Link>
                </li>
              </ul>
            )}
          </Card>
        </div>
      </div>
      {receive && <ReceiveModal po={po} open={receive} onClose={() => setReceive(false)} />}
      <ConfirmDialog
        open={cancel}
        onClose={() => setCancel(false)}
        danger
        title={t('po.cancelPo')}
        message={t('po.cancelConfirm', { no: po.number })}
        onConfirm={() => {
          erp.update('purchaseOrders', po._id, { status: 'cancelled', updatedAt: nowISO() });
          toast.success(t('po.cancelledOk'));
        }}
      />
    </>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Routes>
      <Route index element={<PoList />} />
      <Route path="new" element={<PoEditor />} />
      <Route path=":id" element={<PoDetail />} />
    </Routes>
  );
}
