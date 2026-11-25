import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, Download, Mail, Pencil, Phone, ShieldCheck, ShoppingCart, Star, UserPlus, UserRound, Users, Wallet } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useFmt, useName } from '../../hooks';
import { BarChart } from '../../ui/charts';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, KeyValue, PageHeader, SearchInput, Select, StatCard, StatusBadge, Tabs, Toolbar, downloadCsv, type Column } from '../../ui/kit';
import type { Customer, Prescription, Sale } from '../../types';
import { PaymentChips } from './Invoices';
import { CustomerFormModal, initials } from './shared';

export default function CustomersModule() {
  return (
    <Routes>
      <Route index element={<CustomerList />} />
      <Route path=":id" element={<CustomerProfile />} />
    </Routes>
  );
}

interface Row extends Customer {
  spend: number;
  visits: number;
  last?: string;
}

function CustomerList() {
  const t = useTranslations('ErpSales.customers');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const [q, setQ] = useState('');
  const [ins, setIns] = useState<'all' | 'yes' | 'no'>('all');
  const [insurer, setInsurer] = useState('');
  const [modal, setModal] = useState<{ open: boolean; c?: Customer }>({ open: false });

  const all = useMemo<Row[]>(() => {
    const agg = new Map<string, { spend: number; visits: number; last?: string }>();
    for (const s of d.sales) {
      if (!s.customerId) continue;
      const a = agg.get(s.customerId) ?? { spend: 0, visits: 0 };
      a.spend += s.total;
      a.visits += 1;
      if (!a.last || s.createdAt > a.last) a.last = s.createdAt;
      agg.set(s.customerId, a);
    }
    return d.customers.map((c) => ({ ...c, spend: 0, visits: 0, ...agg.get(c._id) }));
  }, [d.customers, d.sales]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((c) => ins === 'all' || (ins === 'yes' ? !!c.insuranceId : !c.insuranceId))
      .filter((c) => !insurer || c.insuranceId === insurer)
      .filter((c) => !s || c.name.toLowerCase().includes(s) || c.phone.replace(/\s/g, '').includes(s.replace(/\s/g, '')) || (c.email ?? '').toLowerCase().includes(s));
  }, [all, q, ins, insurer]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const insurers = new Map(d.insurers.map((i) => [i._id, i]));
  const cols: Column<Row>[] = [
    {
      key: 'name',
      header: tc('name'),
      sort: (c) => c.name,
      cell: (c) => (
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-brand-pink text-brand-gold text-xs font-bold flex items-center justify-center shrink-0">{initials(c.name)}</span>
          <span className="min-w-0">
            <span className="block font-semibold text-brand-dark truncate">{c.name}</span>
            <span className="block text-xs text-slate-400" dir="ltr">
              {c.phone}
            </span>
          </span>
          {(c.allergies || c.conditions) && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" aria-label={t('medicalAlert')} />}
        </span>
      )
    },
    { key: 'ins', header: t('insurer'), cell: (c) => (c.insuranceId ? <Badge tone="teal">{name(insurers.get(c.insuranceId))}</Badge> : <span className="text-slate-300">—</span>) },
    { key: 'visits', header: t('visits'), cell: (c) => fmt.int(c.visits), sort: (c) => c.visits, align: 'center' },
    { key: 'last', header: t('lastVisit'), cell: (c) => <span className="text-slate-600">{c.last ? fmt.date(c.last) : '—'}</span>, sort: (c) => c.last ?? '' },
    {
      key: 'pts',
      header: t('points'),
      cell: (c) => (
        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 tabular-nums">
          <Star className="w-3.5 h-3.5" />
          {fmt.int(c.loyaltyPoints)}
        </span>
      ),
      sort: (c) => c.loyaltyPoints,
      align: 'end'
    },
    { key: 'spend', header: t('spend'), cell: (c) => <span className="font-semibold tabular-nums">{fmt.money(c.spend)}</span>, sort: (c) => c.spend, align: 'end' }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Users}
        actions={
          <>
            <Button icon={Download} onClick={() => downloadCsv('customers.csv', [tc('name'), tc('phone'), tc('email'), t('insurer'), t('policyNo'), t('points'), t('visits'), t('spend'), t('allergies'), t('conditions')], rows.map((c) => [c.name, c.phone, c.email ?? '', name(insurers.get(c.insuranceId ?? '')), c.insuranceNo ?? '', c.loyaltyPoints, c.visits, c.spend.toFixed(2), c.allergies ?? '', c.conditions ?? '']))}>
              {tc('export')}
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => setModal({ open: true })}>
              {t('add')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('total')} value={fmt.int(all.length)} icon={Users} tone="purple" />
        <StatCard label={t('insuredCount')} value={fmt.int(all.filter((c) => c.insuranceId).length)} icon={ShieldCheck} tone="teal" />
        <StatCard label={t('pointsOut')} value={fmt.int(all.reduce((s, c) => s + c.loyaltyPoints, 0))} icon={Star} tone="amber" hint={fmt.money(all.reduce((s, c) => s + c.loyaltyPoints, 0) * d.settings.pointValue)} />
        <StatCard label={t('newThisMonth')} value={fmt.int(all.filter((c) => c.createdAt >= monthStart).length)} icon={UserPlus} tone="blue" />
      </div>
      <Card>
        <Toolbar>
          <Tabs
            value={ins}
            onChange={setIns}
            items={[
              { value: 'all', label: t('anyInsurance'), count: all.length },
              { value: 'yes', label: t('insuredOnly'), count: all.filter((c) => c.insuranceId).length },
              { value: 'no', label: t('uninsured') }
            ]}
          />
          <Select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="!w-auto">
            <option value="">{t('insurer')}: {tc('all')}</option>
            {d.insurers.map((i) => (
              <option key={i._id} value={i._id}>
                {name(i)}
              </option>
            ))}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="w-full sm:w-72 sm:ms-auto" />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(c) => c._id} onRowClick={(c) => navigate(`/erp/customers/${c._id}`)} initialSort={{ key: 'spend', dir: 'desc' }} />
      </Card>
      <CustomerFormModal open={modal.open} customer={modal.c} onClose={() => setModal({ open: false })} />
    </>
  );
}

function CustomerProfile() {
  const { id } = useParams();
  const t = useTranslations('ErpSales.customers');
  const ti = useTranslations('ErpSales.invoices');
  const tins = useTranslations('ErpSales.ins');
  const trx = useTranslations('ErpSales.rx');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const { productMap } = useCatalog();
  const [edit, setEdit] = useState(false);
  const c = d.customers.find((x) => x._id === id);

  const sales = useMemo(() => d.sales.filter((s) => s.customerId === id).reverse(), [d.sales, id]);
  const rxs = useMemo(() => d.prescriptions.filter((r) => r.customerId === id).reverse(), [d.prescriptions, id]);
  const monthly = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    return {
      labels: months.map((m) => fmt.month(m)),
      values: months.map((m) => sales.filter((s) => {
        const x = new Date(s.createdAt);
        return x.getFullYear() === m.getFullYear() && x.getMonth() === m.getMonth();
      }).reduce((t, s) => t + s.total, 0))
    };
  }, [sales, fmt]);

  if (!c)
    return (
      <Card>
        <EmptyState title={t('notFound')} action={<Link to="/erp/customers"><Button icon={ArrowLeft}>{t('back')}</Button></Link>} />
      </Card>
    );
  const insurer = d.insurers.find((i) => i._id === c.insuranceId);
  const spend = sales.reduce((s, x) => s + x.total, 0);

  const saleCols: Column<Sale>[] = [
    { key: 'no', header: tc('number'), cell: (s) => <span className="font-semibold whitespace-nowrap">{s.number}</span> },
    { key: 'date', header: tc('date'), cell: (s) => <span className="whitespace-nowrap">{fmt.dateTime(s.createdAt)}</span>, sort: (s) => s.createdAt },
    { key: 'items', header: tc('products'), cell: (s) => <span className="text-slate-600 line-clamp-1">{s.items.map((i) => name(productMap.get(i.productId))).join(', ')}</span> },
    { key: 'pay', header: ti('payment'), cell: (s) => <PaymentChips sale={s} /> },
    { key: 'total', header: tc('total'), cell: (s) => <span className="font-semibold tabular-nums">{fmt.money(s.total)}</span>, align: 'end', sort: (s) => s.total }
  ];
  const rxCols: Column<Prescription>[] = [
    { key: 'no', header: tc('number'), cell: (r) => <span className="font-semibold">{r.number}</span> },
    { key: 'date', header: tc('date'), cell: (r) => fmt.date(r.date) },
    { key: 'doc', header: trx('doctor'), cell: (r) => r.doctorName },
    { key: 'st', header: tc('status'), cell: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <>
      <Link to="/erp/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-3">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('back')}
      </Link>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="overflow-hidden" padded={false}>
            <div className="h-20 bg-gradient-to-r from-brand-gold to-brand-goldLight" />
            <div className="px-5 pb-5 -mt-10">
              <span className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-md text-brand-gold text-2xl font-extrabold flex items-center justify-center">{initials(c.name)}</span>
              <h1 className="mt-3 text-xl font-bold text-brand-dark">{c.name}</h1>
              <p className="text-xs text-slate-500">{t('memberSince', { d: fmt.date(c.createdAt) })}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span dir="ltr">{c.phone}</span>
                </p>
                {c.email && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {c.email}
                  </p>
                )}
                {c.dob && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {fmt.date(c.dob)}
                    {c.gender && ` · ${t(c.gender)}`}
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-2">
                <Button size="sm" icon={Pencil} onClick={() => setEdit(true)}>
                  {tc('edit')}
                </Button>
                <Button size="sm" variant="primary" icon={ShoppingCart} onClick={() => navigate('/erp/pos')}>
                  {t('newSale')}
                </Button>
              </div>
            </div>
          </Card>
          {(c.allergies || c.conditions) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-rose-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {t('medicalAlert')}
              </p>
              {c.allergies && (
                <p className="text-sm text-rose-800">
                  <b>{t('allergies')}:</b> {c.allergies}
                </p>
              )}
              {c.conditions && (
                <p className="text-sm text-rose-800 mt-1">
                  <b>{t('conditions')}:</b> {c.conditions}
                </p>
              )}
            </div>
          )}
          <Card>
            <CardHeader title={t('insurer')} icon={ShieldCheck} />
            {insurer ? (
              <KeyValue
                cols={2}
                items={[
                  { label: t('insurer'), value: name(insurer) },
                  { label: t('policyNo'), value: c.insuranceNo ?? '—' },
                  { label: tc('details'), value: tins('coverage', { pct: insurer.coveragePct }) },
                  { label: tc('phone'), value: <span dir="ltr">{insurer.phone}</span> }
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">{t('none')}</p>
            )}
            {c.notes && <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-3">{c.notes}</p>}
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label={t('spend')} value={fmt.money(spend)} icon={Wallet} tone="purple" />
            <StatCard label={t('visits')} value={fmt.int(sales.length)} icon={UserRound} tone="blue" />
            <StatCard label={t('avgBasket')} value={fmt.money(sales.length ? spend / sales.length : 0)} icon={ShoppingCart} tone="teal" />
            <StatCard label={t('points')} value={fmt.int(c.loyaltyPoints)} icon={Star} tone="amber" hint={fmt.money(c.loyaltyPoints * d.settings.pointValue)} />
          </div>
          <Card>
            <CardHeader title={t('spendByMonth')} />
            <BarChart labels={monthly.labels} series={[{ name: t('spend'), values: monthly.values }]} height={200} format={(n) => fmt.compact(n)} />
          </Card>
          <Card>
            <CardHeader title={t('history')} />
            <DataTable rows={sales} columns={saleCols} rowKey={(s) => s._id} onRowClick={(s) => navigate(`/erp/invoices/${s._id}`)} pageSize={8} dense />
          </Card>
          <Card>
            <CardHeader title={t('prescriptions')} />
            <DataTable rows={rxs} columns={rxCols} rowKey={(r) => r._id} onRowClick={() => navigate('/erp/prescriptions')} pageSize={6} dense />
          </Card>
        </div>
      </div>
      <CustomerFormModal open={edit} customer={c} onClose={() => setEdit(false)} />
    </>
  );
}
