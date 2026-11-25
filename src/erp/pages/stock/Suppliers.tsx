import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building, ClipboardList, HandCoins, Mail, MapPin, Pencil, Phone, Plus, ReceiptText, Truck, User } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useErpState, useFmt } from '../../hooks';
import { erp, nowISO, today } from '../../store';
import type { PurchaseOrder, Supplier, SupplierInvoice } from '../../types';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Input, Modal, PageHeader, SearchInput, StatCard, StatusBadge, Tabs, Toolbar, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { supplierBalance, useBranchLookup, useTs } from './shared';

const empty = { name: '', nameAr: '', contactName: '', phone: '', email: '', trn: '', city: '', paymentTermsDays: '30' };

export function SupplierModal({ supplier, open, onClose }: { supplier?: Supplier | null; open: boolean; onClose: () => void }) {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const [f, setF] = useState(() => (supplier ? { ...supplier, nameAr: supplier.nameAr ?? '', paymentTermsDays: String(supplier.paymentTermsDays) } : empty));
  const [tried, setTried] = useState(false);
  const valid = f.name.trim() && f.phone.trim() && f.contactName.trim();
  const submit = () => {
    setTried(true);
    if (!valid) return;
    const rec = { name: f.name.trim(), nameAr: f.nameAr.trim() || undefined, contactName: f.contactName.trim(), phone: f.phone.trim(), email: f.email.trim(), trn: f.trn.trim(), city: f.city.trim(), paymentTermsDays: Math.max(0, Number(f.paymentTermsDays) || 0) };
    if (supplier) erp.update('suppliers', supplier._id, rec);
    else erp.insert('suppliers', { ...rec, createdAt: nowISO() });
    toast.success(supplier ? t('suppliers.updated') : t('suppliers.created'));
    onClose();
  };
  const req = (v: string) => (tried && !v.trim() ? tc('required') : undefined);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? t('suppliers.edit') : t('suppliers.new')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('suppliers.nameEn')} required error={req(f.name)}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={t('suppliers.nameAr')}>
          <Input dir="rtl" value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} />
        </Field>
        <Field label={t('suppliers.contact')} required error={req(f.contactName)}>
          <Input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} />
        </Field>
        <Field label={tc('phone')} required error={req(f.phone)}>
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label={tc('email')}>
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label={t('suppliers.city')}>
          <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label={t('suppliers.trn')}>
          <Input value={f.trn} onChange={(e) => setF({ ...f, trn: e.target.value })} />
        </Field>
        <Field label={t('suppliers.terms')}>
          <Input type="number" min={0} value={f.paymentTermsDays} onChange={(e) => setF({ ...f, paymentTermsDays: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function SupplierList() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  type Row = Supplier & { balance: number; overdue: number; pos: number };
  const rows: Row[] = useMemo(() => {
    const t0 = today();
    return d.suppliers
      .map((s) => ({
        ...s,
        balance: supplierBalance(d, s._id),
        overdue: d.supplierInvoices.filter((i) => i.supplierId === s._id && i.status !== 'paid' && i.dueDate < t0).length,
        pos: d.purchaseOrders.filter((p) => p.supplierId === s._id).length
      }))
      .filter((s) => {
        const x = q.trim().toLowerCase();
        return !x || s.name.toLowerCase().includes(x) || (s.nameAr ?? '').includes(x) || s.contactName.toLowerCase().includes(x);
      });
  }, [d, q]);
  const total = rows.reduce((s, r) => s + r.balance, 0);
  const cols: Column<Row>[] = [
    {
      key: 'name',
      header: tc('supplier'),
      sort: (r) => r.name,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-pink to-brand-peach text-brand-gold flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-brand-dark">{fmt.locale === 'ar' ? r.nameAr || r.name : r.name}</span>
            <span className="block text-[11px] text-slate-400">{r.city}</span>
          </span>
        </span>
      )
    },
    { key: 'contact', header: t('suppliers.contact'), cell: (r) => <span className="text-sm"><span className="block">{r.contactName}</span><span className="block text-[11px] text-slate-400">{r.phone}</span></span> },
    { key: 'terms', header: t('suppliers.terms'), cell: (r) => t('suppliers.termsDays', { n: r.paymentTermsDays }) },
    { key: 'pos', header: t('suppliers.orders'), align: 'end', sort: (r) => r.pos, cell: (r) => <span className="tabular-nums">{r.pos}</span> },
    { key: 'bal', header: t('suppliers.balance'), align: 'end', sort: (r) => r.balance, cell: (r) => <span className="font-semibold tabular-nums">{fmt.money(r.balance)}</span> },
    { key: 'od', header: '', cell: (r) => (r.overdue ? <Badge tone="red">{t('suppliers.overdueN', { n: r.overdue })}</Badge> : null) }
  ];
  return (
    <>
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        icon={Truck}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            {t('suppliers.new')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('suppliers.title')} value={fmt.int(d.suppliers.length)} icon={Truck} tone="purple" />
        <StatCard label={t('suppliers.outstanding')} value={fmt.money(total)} icon={HandCoins} tone="amber" onClick={() => navigate('/erp/payables')} />
        <StatCard label={t('suppliers.openPos')} value={fmt.int(d.purchaseOrders.filter((p) => p.status === 'ordered' || p.status === 'partial').length)} icon={ClipboardList} tone="blue" onClick={() => navigate('/erp/purchase-orders')} />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={tc('search')} className="w-full sm:w-72" />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(r) => r._id} onRowClick={(r) => navigate(`/erp/suppliers/${r._id}`)} />
      </Card>
      {open && <SupplierModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

function SupplierDetail() {
  const { id = '' } = useParams();
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const bl = useBranchLookup();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState<'orders' | 'invoices' | 'payments'>('orders');
  const s = d.suppliers.find((x) => x._id === id);
  if (!s) return <EmptyState title={t('suppliers.notFound')} action={<Link to="/erp/suppliers"><Button icon={ArrowLeft}>{t('common.back')}</Button></Link>} />;
  const year = String(new Date().getFullYear());
  const pos = d.purchaseOrders.filter((p) => p.supplierId === id).reverse();
  const invs = d.supplierInvoices.filter((i) => i.supplierId === id).reverse();
  const pays = d.supplierPayments.filter((p) => p.supplierId === id).reverse();
  const ytd = invs.filter((i) => i.createdAt.startsWith(year)).reduce((a, i) => a + i.amount, 0);
  const t0 = today();
  const overdue = invs.filter((i) => i.status !== 'paid' && i.dueDate < t0);
  const poTotal = (p: PurchaseOrder) => p.items.reduce((a, i) => a + i.qty * i.cost, 0);
  const poCols: Column<PurchaseOrder>[] = [
    { key: 'no', header: tc('number'), cell: (p) => <span className="font-semibold">{p.number}</span> },
    { key: 'br', header: tc('branch'), cell: (p) => bl(p.branchId) },
    { key: 'date', header: tc('date'), cell: (p) => <span className="text-xs text-slate-500">{fmt.date(p.createdAt)}</span> },
    { key: 'tot', header: t('po.totalEx'), align: 'end', cell: (p) => <span className="tabular-nums">{fmt.money(poTotal(p))}</span> },
    { key: 'st', header: tc('status'), cell: (p) => <StatusBadge status={p.status} /> }
  ];
  const invCols: Column<SupplierInvoice>[] = [
    { key: 'no', header: tc('number'), cell: (i) => <span className="font-semibold">{i.number}</span> },
    { key: 'date', header: tc('date'), cell: (i) => <span className="text-xs text-slate-500">{fmt.date(i.createdAt)}</span> },
    { key: 'due', header: t('payables.due'), cell: (i) => <span className={`text-xs ${i.status !== 'paid' && i.dueDate < t0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>{fmt.date(i.dueDate)}</span> },
    { key: 'amt', header: tc('amount'), align: 'end', cell: (i) => <span className="tabular-nums">{fmt.money(i.amount)}</span> },
    { key: 'bal', header: t('payables.balance'), align: 'end', cell: (i) => <span className="font-semibold tabular-nums">{fmt.money(i.amount - i.paid)}</span> },
    { key: 'st', header: tc('status'), cell: (i) => <StatusBadge status={i.status} /> }
  ];
  return (
    <>
      <Link to="/erp/suppliers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('suppliers.title')}
      </Link>
      <PageHeader
        title={fmt.locale === 'ar' ? s.nameAr || s.name : s.name}
        subtitle={s.city}
        icon={Truck}
        actions={
          <>
            <Button icon={Pencil} onClick={() => setEdit(true)}>
              {tc('edit')}
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate(`/erp/purchase-orders/new?supplier=${s._id}`)}>
              {t('po.new')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('suppliers.purchasesYtd')} value={fmt.money(ytd)} icon={ReceiptText} tone="purple" />
        <StatCard label={t('suppliers.outstanding')} value={fmt.money(supplierBalance(d, id))} icon={HandCoins} tone="amber" />
        <StatCard label={t('suppliers.overdue')} value={fmt.int(overdue.length)} hint={overdue.length ? fmt.money(overdue.reduce((a, i) => a + i.amount - i.paid, 0)) : undefined} icon={AlertCircle} tone="rose" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader title={t('suppliers.contactCard')} />
          <ul className="space-y-3 text-sm">
            {[
              [User, s.contactName],
              [Phone, s.phone],
              [Mail, s.email],
              [MapPin, s.city],
              [Building, `${t('suppliers.trn')}: ${s.trn || '—'}`],
              [HandCoins, `${t('suppliers.terms')}: ${t('suppliers.termsDays', { n: s.paymentTermsDays })}`]
            ].map(([Icon, v], i) => {
              const I = Icon as typeof User;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <I className="w-4 h-4" />
                  </span>
                  <span className="text-brand-dark break-all">{v as string}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <Toolbar>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'orders', label: t('suppliers.orders'), count: pos.length },
                { value: 'invoices', label: t('suppliers.invoices'), count: invs.length },
                { value: 'payments', label: t('suppliers.payments'), count: pays.length }
              ]}
            />
          </Toolbar>
          {tab === 'orders' && <DataTable rows={pos} columns={poCols} rowKey={(p) => p._id} onRowClick={(p) => navigate(`/erp/purchase-orders/${p._id}`)} pageSize={8} />}
          {tab === 'invoices' && <DataTable rows={invs} columns={invCols} rowKey={(i) => i._id} pageSize={8} />}
          {tab === 'payments' && (
            <DataTable
              rows={pays}
              rowKey={(p) => p._id}
              pageSize={8}
              columns={[
                { key: 'date', header: tc('date'), cell: (p) => <span className="text-xs text-slate-500">{fmt.date(p.date)}</span> },
                { key: 'inv', header: t('payables.invoice'), cell: (p) => d.supplierInvoices.find((i) => i._id === p.invoiceId)?.number ?? '—' },
                { key: 'm', header: tc('method'), cell: (p) => tc(p.method) },
                { key: 'a', header: tc('amount'), align: 'end', cell: (p) => <span className="font-semibold tabular-nums">{fmt.money(p.amount)}</span> }
              ]}
            />
          )}
        </Card>
      </div>
      {edit && <SupplierModal supplier={s} open={edit} onClose={() => setEdit(false)} />}
    </>
  );
}

export default function SuppliersPage() {
  return (
    <Routes>
      <Route index element={<SupplierList />} />
      <Route path=":id" element={<SupplierDetail />} />
    </Routes>
  );
}
