import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileHeart, Printer, Receipt, RotateCcw, ShieldCheck, ShoppingBasket, TrendingUp, Undo2, Wallet } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useToast } from '../../../components/ui/Toast';
import { refundedFor, returnSale, round2, saleCost } from '../../store';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Input, KeyValue, Modal, PageHeader, ProductThumb, SearchInput, Select, StatCard, StatusBadge, Tabs, Toolbar, downloadCsv, type Column } from '../../ui/kit';
import type { PaymentMethod, Sale } from '../../types';
import { rangeStart, usePrintReceipt, useRangeTabs, type RangeKey } from './shared';

export default function InvoicesModule() {
  return (
    <Routes>
      <Route index element={<InvoiceList />} />
      <Route path=":id" element={<InvoiceDetail />} />
    </Routes>
  );
}

export function PaymentChips({ sale }: { sale: Sale }) {
  const tc = useTranslations('Erp.common');
  const tone = { cash: 'green', card: 'blue', insurance: 'teal' } as const;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {sale.payments.map((p, i) => (
        <Badge key={i} tone={tone[p.method]}>
          {tc(p.method)}
        </Badge>
      ))}
    </span>
  );
}

function InvoiceList() {
  const t = useTranslations('ErpSales.invoices');
  const tc = useTranslations('Erp.common');
  const ts = useTranslations('Erp.status');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { branches } = useCatalog();
  const rangeTabs = useRangeTabs();
  const [range, setRange] = useState<RangeKey>('30');
  const [scope, setScope] = useState<'branch' | 'all'>('branch');
  const [method, setMethod] = useState<'' | PaymentMethod>('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const from = rangeStart(range);
    const s = q.trim().toLowerCase();
    const cust = new Map(d.customers.map((c) => [c._id, c.name]));
    return d.sales
      .filter((x) => new Date(x.createdAt).getTime() >= from)
      .filter((x) => scope === 'all' || x.branchId === branch?._id)
      .filter((x) => !method || x.payments.some((p) => p.method === method))
      .filter((x) => !status || x.status === status)
      .filter((x) => !s || x.number.toLowerCase().includes(s) || (cust.get(x.customerId ?? '') ?? '').toLowerCase().includes(s))
      .reverse();
  }, [d, range, scope, branch, method, status, q]);

  // KPIs vs previous equal period
  const kpi = useMemo(() => {
    const sum = (list: Sale[]) => list.reduce((t, s) => t + s.total, 0);
    const revenue = sum(rows);
    const refunds = rows.reduce((t, s) => t + refundedFor(d, s._id), 0);
    let prevRevenue: number | null = null;
    if (range !== 'all') {
      const from = rangeStart(range);
      const len = Date.now() - from;
      prevRevenue = sum(d.sales.filter((x) => (scope === 'all' || x.branchId === branch?._id) && new Date(x.createdAt).getTime() >= from - len && new Date(x.createdAt).getTime() < from));
    }
    return { count: rows.length, revenue, avg: rows.length ? revenue / rows.length : 0, refunds, delta: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null };
  }, [rows, d, range, scope, branch]);

  const custName = (id?: string) => (id ? d.customers.find((c) => c._id === id)?.name : undefined);
  const cols: Column<Sale>[] = [
    { key: 'no', header: tc('number'), cell: (s) => <span className="font-semibold text-brand-dark">{s.number}</span>, sort: (s) => s.number },
    { key: 'date', header: tc('date'), cell: (s) => <span className="text-slate-600 whitespace-nowrap">{fmt.dateTime(s.createdAt)}</span>, sort: (s) => s.createdAt },
    { key: 'cust', header: tc('customer'), cell: (s) => <span className={custName(s.customerId) ? '' : 'text-slate-400'}>{custName(s.customerId) ?? tc('walkIn')}</span> },
    ...(scope === 'all' ? [{ key: 'br', header: tc('branch'), cell: (s: Sale) => <span className="text-slate-600 text-xs">{name(branches.find((b) => b._id === s.branchId)).replace(/^.*— /, '')}</span> }] : []),
    { key: 'items', header: t('items'), cell: (s) => s.items.reduce((n, i) => n + i.qty, 0), align: 'center', sort: (s) => s.items.length },
    { key: 'pay', header: t('payment'), cell: (s) => <PaymentChips sale={s} /> },
    { key: 'status', header: tc('status'), cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'total', header: tc('total'), cell: (s) => <span className="font-semibold tabular-nums">{fmt.money(s.total)}</span>, sort: (s) => s.total, align: 'end' }
  ];

  const exportCsv = () =>
    downloadCsv(
      `invoices-${range}.csv`,
      [tc('number'), tc('date'), tc('customer'), tc('branch'), tc('subtotal'), tc('discount'), tc('vat'), tc('total'), t('payment'), tc('status')],
      rows.map((s) => [s.number, s.createdAt, custName(s.customerId) ?? '', name(branches.find((b) => b._id === s.branchId)), s.subtotal, s.discount, s.vat, s.total, s.payments.map((p) => `${p.method}:${p.amount}`).join(' '), s.status])
    );

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Receipt}
        actions={
          <>
            <Button icon={Download} onClick={exportCsv}>
              {tc('export')}
            </Button>
            <Button variant="primary" icon={ShoppingBasket} onClick={() => navigate('/erp/pos')}>
              {tc('create')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('count')} value={fmt.int(kpi.count)} icon={Receipt} tone="blue" />
        <StatCard label={t('revenue')} value={fmt.money(kpi.revenue)} icon={TrendingUp} tone="purple" delta={kpi.delta} hint={kpi.delta !== null ? tc('vsPrev') : undefined} />
        <StatCard label={t('avgBasket')} value={fmt.money(kpi.avg)} icon={Wallet} tone="teal" />
        <StatCard label={t('refunds')} value={fmt.money(kpi.refunds)} icon={Undo2} tone="rose" />
      </div>
      <Card>
        <Toolbar>
          <Tabs value={range} onChange={setRange} items={rangeTabs} />
          <Tabs
            value={scope}
            onChange={setScope}
            items={[
              { value: 'branch', label: t('thisBranch') },
              { value: 'all', label: tc('all') }
            ]}
          />
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')} className="!w-auto">
            <option value="">{t('anyMethod')}</option>
            <option value="cash">{tc('cash')}</option>
            <option value="card">{tc('card')}</option>
            <option value="insurance">{tc('insurance')}</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-auto">
            <option value="">{t('anyStatus')}</option>
            {['completed', 'partially_refunded', 'refunded'].map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="w-full sm:w-64 sm:ms-auto" />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(s) => s._id} onRowClick={(s) => navigate(`/erp/invoices/${s._id}`)} pageSize={15} />
      </Card>
    </>
  );
}

function InvoiceDetail() {
  const { id } = useParams();
  const t = useTranslations('ErpSales.invoices');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { productMap, branches } = useCatalog();
  const printReceipt = usePrintReceipt();
  const [returning, setReturning] = useState(false);
  const sale = d.sales.find((s) => s._id === id);
  if (!sale)
    return (
      <Card>
        <EmptyState
          title={t('notFound')}
          action={
            <Link to="/erp/invoices">
              <Button icon={ArrowLeft}>{t('back')}</Button>
            </Link>
          }
        />
      </Card>
    );
  const cust = d.customers.find((c) => c._id === sale.customerId);
  const emp = d.employees.find((e) => e._id === sale.employeeId);
  const branch = branches.find((b) => b._id === sale.branchId);
  const rx = d.prescriptions.find((r) => r._id === sale.prescriptionId);
  const claim = d.claims.find((c) => c.saleId === sale._id);
  const rets = d.returns.filter((r) => r.saleId === sale._id);
  const profit = round2(sale.subtotal - sale.discount - saleCost(sale));
  const canReturn = sale.items.some((i) => i.returnedQty < i.qty);

  return (
    <>
      <Link to="/erp/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-3">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('back')}
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {sale.number} <StatusBadge status={sale.status} />
          </span>
        }
        subtitle={fmt.dateTime(sale.createdAt)}
        icon={Receipt}
        actions={
          <>
            <Button icon={Printer} onClick={() => printReceipt(sale)}>
              {tc('print')}
            </Button>
            {canReturn && (
              <Button variant="soft" icon={RotateCcw} onClick={() => setReturning(true)}>
                {t('returnItems')}
              </Button>
            )}
          </>
        }
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title={t('lines')} />
            <div className="divide-y divide-slate-100">
              {sale.items.map((it) => {
                const p = productMap.get(it.productId);
                return (
                  <div key={it.productId} className="py-3 flex items-center gap-3">
                    <ProductThumb src={p?.imageCover} size="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">{name(p)}</p>
                      <p className="text-xs text-slate-500">
                        {it.qty} × {fmt.money(it.price)}
                        {it.discount > 0 && ` · ${tc('discount')} ${fmt.money(it.discount)}`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.batches.map((b) => {
                          const batch = d.batches.find((x) => x._id === b.batchId);
                          return batch ? (
                            <Badge key={b.batchId} tone="gray">
                              {batch.batchNo} · {fmt.dateShort(batch.expiry)} × {b.qty}
                            </Badge>
                          ) : null;
                        })}
                        {it.returnedQty > 0 && <Badge tone="red">{t('returned', { n: it.returnedQty })}</Badge>}
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{fmt.money(it.price * it.qty - it.discount)}</span>
                  </div>
                );
              })}
            </div>
            <dl className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-sm max-w-xs ms-auto">
              <div className="flex justify-between">
                <dt className="text-slate-500">{tc('subtotal')}</dt>
                <dd className="tabular-nums">{fmt.money(sale.subtotal)}</dd>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{tc('discount')}</dt>
                  <dd className="tabular-nums text-rose-600">− {fmt.money(sale.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {tc('vat')} ({d.settings.vatRate}%)
                </dt>
                <dd className="tabular-nums">{fmt.money(sale.vat)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-base font-bold">
                <dt>{tc('total')}</dt>
                <dd className="tabular-nums">{fmt.money(sale.total)}</dd>
              </div>
            </dl>
          </Card>
          {!!rets.length && (
            <Card>
              <CardHeader title={t('returnsTitle')} icon={Undo2} />
              <ul className="divide-y divide-slate-100">
                {rets.map((r) => (
                  <li key={r._id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-semibold">{r.number}</span> <span className="text-slate-500">· {fmt.dateTime(r.createdAt)} · {r.reason}</span>
                    </span>
                    <span className="font-semibold text-rose-600 tabular-nums">− {fmt.money(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={tc('details')} />
            <KeyValue
              cols={1}
              items={[
                { label: tc('customer'), value: cust ? <Link className="text-brand-gold hover:underline" to={`/erp/customers/${cust._id}`}>{cust.name}</Link> : tc('walkIn') },
                { label: tc('branch'), value: name(branch) },
                { label: t('cashier'), value: emp?.name ?? '—' },
                { label: t('profit'), value: <span className="text-emerald-600">{fmt.money(profit)}</span> },
                { label: t('points'), value: `${sale.pointsEarned} / ${sale.pointsRedeemed}` }
              ]}
            />
          </Card>
          <Card>
            <CardHeader title={t('payments')} />
            <ul className="space-y-2">
              {sale.payments.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <PaymentChips sale={{ ...sale, payments: [p] }} />
                  <span className="font-semibold tabular-nums">{fmt.money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
          {(rx || claim) && (
            <Card>
              <div className="space-y-3">
                {rx && (
                  <Link to="/erp/prescriptions" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-gold/40">
                    <FileHeart className="w-5 h-5 text-violet-600" />
                    <span className="flex-1 text-sm">
                      <span className="block text-xs text-slate-500">{t('linkedRx')}</span>
                      <span className="font-semibold">{rx.number}</span> · {rx.doctorName}
                    </span>
                  </Link>
                )}
                {claim && (
                  <Link to="/erp/insurance" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-gold/40">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    <span className="flex-1 text-sm">
                      <span className="block text-xs text-slate-500">{t('linkedClaim')}</span>
                      <span className="font-semibold">{claim.number}</span> · {fmt.money(claim.amount)}
                    </span>
                    <StatusBadge status={claim.status} />
                  </Link>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
      <ReturnModal sale={sale} open={returning} onClose={() => setReturning(false)} />
    </>
  );
}

function ReturnModal({ sale, open, onClose }: { sale: Sale; open: boolean; onClose: () => void }) {
  const t = useTranslations('ErpSales.returnModal');
  const tc = useTranslations('Erp.common');
  const te = useTranslations('Erp.errors');
  const toast = useToast();
  const fmt = useFmt();
  const name = useName();
  const { productMap } = useCatalog();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(sale.payments[0]?.method === 'card' ? 'card' : 'cash');
  const ratio = sale.subtotal > 0 ? (sale.subtotal - sale.discount) / sale.subtotal : 1;
  const est = round2(sale.items.reduce((s, it) => s + (qty[it.productId] ?? 0) * (it.price - it.discount / it.qty) * ratio * 1.05, 0));
  const submit = () => {
    try {
      const r = returnSale(
        sale._id,
        Object.entries(qty).map(([productId, q]) => ({ productId, qty: q })),
        reason.trim() || '—',
        method
      );
      toast.success(t('done', { n: r.number }));
      setQty({});
      setReason('');
      onClose();
    } catch (e) {
      const k = e instanceof Error ? e.message : '';
      toast.error(k === 'NOTHING_TO_RETURN' ? te('NOTHING_TO_RETURN') : te('generic'));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('title', { n: sale.number })}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" icon={RotateCcw} onClick={submit} disabled={est <= 0}>
            {t('submit')} · {fmt.money(est)}
          </Button>
        </>
      }>
      <ul className="divide-y divide-slate-100 mb-4">
        {sale.items.map((it) => {
          const max = it.qty - it.returnedQty;
          const p = productMap.get(it.productId);
          return (
            <li key={it.productId} className="py-3 flex items-center gap-3">
              <ProductThumb src={p?.imageCover} />
              <span className="flex-1 text-sm font-medium text-brand-dark truncate">{name(p)}</span>
              <Input type="number" min={0} max={max} disabled={!max} value={qty[it.productId] ?? ''} placeholder="0" onChange={(e) => setQty((q) => ({ ...q, [it.productId]: Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))) }))} className="w-20 text-center" />
              <span className="text-xs text-slate-400 w-12">{t('available', { n: max })}</span>
            </li>
          );
        })}
      </ul>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('reason')}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonPh')} />
        </Field>
        <Field label={t('refundMethod')}>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="cash">{tc('cash')}</option>
            <option value="card">{tc('card')}</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
