import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, CircleDollarSign, Download, HandCoins, Hourglass, Wallet } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useErpState, useFmt } from '../../hooks';
import { daysUntil, paySupplierInvoice, today } from '../../store';
import type { SupplierInvoice, SupplierPayment } from '../../types';
import { BarChart } from '../../ui/charts';
import { Badge, Button, Card, CardHeader, cx, DataTable, downloadCsv, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea, Toolbar, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { useTs } from './shared';

type Bucket = 'current' | 'd30' | 'd60' | 'd60plus';
const bucketOf = (i: SupplierInvoice): Bucket => {
  const over = -daysUntil(i.dueDate);
  return over <= 0 ? 'current' : over <= 30 ? 'd30' : over <= 60 ? 'd60' : 'd60plus';
};

function PayModal({ inv, onClose }: { inv: SupplierInvoice | null; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const toast = useToast();
  const d = useErpState();
  const bal = inv ? inv.amount - inv.paid : 0;
  const [amount, setAmount] = useState(() => (bal ? bal.toFixed(2) : ''));
  const [method, setMethod] = useState<'bank' | 'cash' | 'cheque'>('bank');
  const [note, setNote] = useState('');
  const n = Number(amount);
  const valid = n > 0 && n <= bal + 0.001;
  const sup = d.suppliers.find((s) => s._id === inv?.supplierId);
  return (
    <Modal
      open={!!inv}
      onClose={onClose}
      size="sm"
      title={t('payables.payTitle', { no: inv?.number ?? '' })}
      subtitle={sup ? `${fmt.locale === 'ar' ? sup.nameAr || sup.name : sup.name} · ${t('payables.balance')} ${fmt.money(bal)}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button
            variant="primary"
            icon={HandCoins}
            disabled={!valid}
            onClick={() => {
              if (!inv) return;
              paySupplierInvoice(inv._id, n, method, note || undefined);
              toast.success(t('payables.paidOk'));
              onClose();
            }}>
            {t('payables.pay')}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={tc('amount')} hint={t('payables.maxHint', { v: fmt.money(bal) })}>
          <div className="flex gap-2">
            <Input type="number" step="0.01" min={0} max={bal} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <Button size="md" variant="soft" onClick={() => setAmount(bal.toFixed(2))}>
              {t('payables.full')}
            </Button>
          </div>
        </Field>
        <Field label={tc('method')}>
          <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="bank">{tc('bank')}</option>
            <option value="cash">{tc('cash')}</option>
            <option value="cheque">{tc('cheque')}</option>
          </Select>
        </Field>
        <Field label={tc('notes')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('payables.notePh')} />
        </Field>
      </div>
    </Modal>
  );
}

export default function PayablesPage() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const d = useErpState();
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices');
  const [status, setStatus] = useState<'open' | 'overdue' | 'paid' | 'all'>('open');
  const [supplier, setSupplier] = useState('');
  const [q, setQ] = useState('');
  const [pay, setPay] = useState<SupplierInvoice | null>(null);
  const supName = (id: string) => {
    const s = d.suppliers.find((x) => x._id === id);
    return s ? (fmt.locale === 'ar' ? s.nameAr || s.name : s.name) : '—';
  };
  const t0 = today();

  const aging = useMemo(() => {
    const a: Record<Bucket, number> = { current: 0, d30: 0, d60: 0, d60plus: 0 };
    for (const i of d.supplierInvoices) if (i.status !== 'paid') a[bucketOf(i)] += i.amount - i.paid;
    return a;
  }, [d]);
  const bySupplier = useMemo(() => {
    const rows = d.suppliers.map((s) => {
      const open = d.supplierInvoices.filter((i) => i.supplierId === s._id && i.status !== 'paid');
      const v: Record<Bucket, number> = { current: 0, d30: 0, d60: 0, d60plus: 0 };
      for (const i of open) v[bucketOf(i)] += i.amount - i.paid;
      return { name: supName(s._id), ...v, total: v.current + v.d30 + v.d60 + v.d60plus };
    });
    return rows.filter((r) => r.total > 0).sort((a, z) => z.total - a.total);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const paidThisMonth = d.supplierPayments.filter((p) => p.date.slice(0, 7) === t0.slice(0, 7)).reduce((a, p) => a + p.amount, 0);
  const totalOpen = aging.current + aging.d30 + aging.d60 + aging.d60plus;

  const invoices = useMemo(
    () =>
      [...d.supplierInvoices]
        .reverse()
        .filter((i) => (status === 'all' ? true : status === 'paid' ? i.status === 'paid' : status === 'overdue' ? i.status !== 'paid' && i.dueDate < t0 : i.status !== 'paid'))
        .filter((i) => !supplier || i.supplierId === supplier)
        .filter((i) => !q.trim() || i.number.toLowerCase().includes(q.trim().toLowerCase()) || supName(i.supplierId).toLowerCase().includes(q.trim().toLowerCase())),
    [d, status, supplier, q, t0] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const payments = useMemo(() => [...d.supplierPayments].reverse().filter((p) => !supplier || p.supplierId === supplier), [d, supplier]);
  const po = (id?: string) => d.purchaseOrders.find((p) => p._id === id);

  const invCols: Column<SupplierInvoice>[] = [
    {
      key: 'no',
      header: t('payables.invoice'),
      sort: (i) => i.number,
      cell: (i) => (
        <span>
          <span className="block font-semibold">{i.number}</span>
          {po(i.poId) && (
            <Link to={`/erp/purchase-orders/${i.poId}`} className="text-[11px] text-brand-gold hover:underline">
              {po(i.poId)!.number}
            </Link>
          )}
        </span>
      )
    },
    { key: 'sup', header: tc('supplier'), sort: (i) => supName(i.supplierId), cell: (i) => <Link to={`/erp/suppliers/${i.supplierId}`} className="hover:text-brand-gold">{supName(i.supplierId)}</Link> },
    { key: 'date', header: tc('date'), sort: (i) => i.createdAt, cell: (i) => <span className="text-xs text-slate-500">{fmt.date(i.createdAt)}</span> },
    {
      key: 'due',
      header: t('payables.due'),
      sort: (i) => i.dueDate,
      cell: (i) => {
        const n = daysUntil(i.dueDate);
        return (
          <span className="flex flex-col">
            <span className="text-xs text-slate-600">{fmt.date(i.dueDate)}</span>
            {i.status !== 'paid' && <span className={cx('text-[11px] font-semibold', n < 0 ? 'text-rose-600' : n <= 7 ? 'text-amber-600' : 'text-slate-400')}>{n < 0 ? t('payables.overdueBy', { n: -n }) : t('payables.dueIn', { n })}</span>}
          </span>
        );
      }
    },
    { key: 'amt', header: tc('amount'), align: 'end', sort: (i) => i.amount, cell: (i) => <span className="tabular-nums">{fmt.money(i.amount)}</span> },
    { key: 'paid', header: t('payables.paid'), align: 'end', cell: (i) => <span className="tabular-nums text-slate-500">{fmt.money(i.paid)}</span> },
    { key: 'bal', header: t('payables.balance'), align: 'end', sort: (i) => i.amount - i.paid, cell: (i) => <span className={cx('font-semibold tabular-nums', i.status !== 'paid' && i.dueDate < t0 && 'text-rose-600')}>{fmt.money(i.amount - i.paid)}</span> },
    { key: 'st', header: tc('status'), cell: (i) => (i.status !== 'paid' && i.dueDate < t0 ? <Badge tone="red" dot>{t('payables.overdue')}</Badge> : <StatusBadge status={i.status} />) },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (i) =>
        i.status !== 'paid' ? (
          <Button size="sm" variant="soft" icon={HandCoins} onClick={() => setPay(i)}>
            {t('payables.pay')}
          </Button>
        ) : null
    }
  ];
  const payCols: Column<SupplierPayment>[] = [
    { key: 'date', header: tc('date'), sort: (p) => p.date, cell: (p) => <span className="text-xs text-slate-500">{fmt.dateTime(p.date)}</span> },
    { key: 'sup', header: tc('supplier'), cell: (p) => supName(p.supplierId) },
    { key: 'inv', header: t('payables.invoice'), cell: (p) => d.supplierInvoices.find((i) => i._id === p.invoiceId)?.number ?? '—' },
    { key: 'm', header: tc('method'), cell: (p) => <Badge tone="gray">{tc(p.method)}</Badge> },
    { key: 'n', header: tc('notes'), cell: (p) => <span className="text-xs text-slate-500">{p.note ?? '—'}</span> },
    { key: 'a', header: tc('amount'), align: 'end', sort: (p) => p.amount, cell: (p) => <span className="font-semibold tabular-nums">{fmt.money(p.amount)}</span> }
  ];

  const bucketLabels: Record<Bucket, string> = { current: t('payables.current'), d30: t('payables.d30'), d60: t('payables.d60'), d60plus: t('payables.d60plus') };
  const bucketColors: Record<Bucket, string> = { current: '#0672DF', d30: '#E8890C', d60: '#D6457F', d60plus: '#7A1FB8' };
  return (
    <>
      <PageHeader
        title={t('payables.title')}
        subtitle={t('payables.subtitle')}
        icon={HandCoins}
        actions={
          <Button
            icon={Download}
            onClick={() =>
              downloadCsv(
                `supplier-payables-${t0}.csv`,
                [t('payables.invoice'), tc('supplier'), tc('date'), t('payables.due'), tc('amount'), t('payables.paid'), t('payables.balance'), tc('status')],
                invoices.map((i) => [i.number, supName(i.supplierId), i.createdAt.slice(0, 10), i.dueDate, i.amount, i.paid, round(i.amount - i.paid), i.status])
              )
            }>
            {tc('export')}
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('payables.totalOpen')} value={fmt.money(totalOpen)} hint={t('payables.openInvoices', { n: d.supplierInvoices.filter((i) => i.status !== 'paid').length })} icon={Wallet} tone="purple" onClick={() => setStatus('open')} />
        <StatCard label={t('payables.current')} value={fmt.money(aging.current)} icon={Hourglass} tone="blue" />
        <StatCard label={t('payables.overdueTotal')} value={fmt.money(aging.d30 + aging.d60 + aging.d60plus)} hint={`${t('payables.d60plus')}: ${fmt.money(aging.d60plus)}`} icon={AlarmClock} tone="rose" onClick={() => setStatus('overdue')} />
        <StatCard label={t('payables.paidMonth')} value={fmt.money(paidThisMonth)} icon={CircleDollarSign} tone="teal" />
      </div>
      {bySupplier.length > 0 && (
        <Card className="mb-6">
          <CardHeader title={t('payables.agingChart')} subtitle={t('payables.agingSub')} />
          <BarChart
            stacked
            labels={bySupplier.map((r) => r.name)}
            series={(Object.keys(bucketLabels) as Bucket[]).map((b) => ({ name: bucketLabels[b], values: bySupplier.map((r) => r[b]), color: bucketColors[b] }))}
            height={240}
            format={(n) => fmt.compact(n)}
          />
        </Card>
      )}
      <Card>
        <Toolbar>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'invoices', label: t('payables.tabInvoices'), count: d.supplierInvoices.length },
              { value: 'payments', label: t('payables.tabPayments'), count: d.supplierPayments.length }
            ]}
          />
          <Select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="!w-auto sm:ms-auto">
            <option value="">{t('payables.allSuppliers')}</option>
            {d.suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {supName(s._id)}
              </option>
            ))}
          </Select>
        </Toolbar>
        {tab === 'invoices' ? (
          <>
            <Toolbar>
              <SearchInput value={q} onChange={setQ} placeholder={t('payables.searchPh')} className="w-full sm:w-64" />
              <Tabs
                className="sm:ms-auto"
                value={status}
                onChange={setStatus}
                items={[
                  { value: 'open', label: t('payables.unpaid') },
                  { value: 'overdue', label: t('payables.overdue') },
                  { value: 'paid', label: t('payables.paidTab') },
                  { value: 'all', label: tc('all') }
                ]}
              />
            </Toolbar>
            <DataTable rows={invoices} columns={invCols} rowKey={(i) => i._id} initialSort={{ key: 'due', dir: 'asc' }} empty={<EmptyState icon={HandCoins} title={t('payables.none')} />} />
          </>
        ) : (
          <DataTable rows={payments} columns={payCols} rowKey={(p) => p._id} empty={<EmptyState icon={HandCoins} title={t('payables.noPayments')} />} />
        )}
      </Card>
      {pay && <PayModal inv={pay} onClose={() => setPay(null)} />}
    </>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
