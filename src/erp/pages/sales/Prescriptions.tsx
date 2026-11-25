import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, FileHeart, Plus, ShoppingCart, Stethoscope, Trash2, XCircle } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useToast } from '../../../components/ui/Toast';
import { erp, nowISO, today } from '../../store';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { Badge, Button, Card, ConfirmDialog, DataTable, Field, Input, KeyValue, Modal, PageHeader, ProductThumb, SearchInput, Select, StatusBadge, Tabs, Textarea, Toolbar, type Column } from '../../ui/kit';
import type { Prescription, RxStatus } from '../../types';
import { allergyHits } from './shared';

export default function PrescriptionsPage() {
  const t = useTranslations('ErpSales.rx');
  const tc = useTranslations('Erp.common');
  const ts = useTranslations('Erp.status');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const toast = useToast();
  const d = useErpState();
  const { productMap } = useCatalog();
  const [tab, setTab] = useState<RxStatus>('pending');
  const [q, setQ] = useState('');
  const [create, setCreate] = useState(false);
  const [view, setView] = useState<Prescription | null>(null);
  const [cancel, setCancel] = useState<Prescription | null>(null);
  const cust = useMemo(() => new Map(d.customers.map((c) => [c._id, c])), [d.customers]);

  const conflicts = (r: Prescription) => {
    const c = cust.get(r.customerId);
    return r.items.flatMap((i) => {
      const p = productMap.get(i.productId);
      return allergyHits(c?.allergies, `${p?.title ?? ''} ${p?.titleAr ?? ''}`);
    });
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return d.prescriptions
      .filter((r) => r.status === tab)
      .filter((r) => !s || r.number.toLowerCase().includes(s) || r.doctorName.toLowerCase().includes(s) || (cust.get(r.customerId)?.name ?? '').toLowerCase().includes(s))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [d.prescriptions, tab, q, cust]);

  const count = (s: RxStatus) => d.prescriptions.filter((r) => r.status === s).length;
  const cols: Column<Prescription>[] = [
    { key: 'no', header: tc('number'), cell: (r) => <span className="font-semibold">{r.number}</span>, sort: (r) => r.number },
    { key: 'date', header: t('rxDate'), cell: (r) => fmt.date(r.date), sort: (r) => r.date },
    {
      key: 'pt',
      header: t('patient'),
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {cust.get(r.customerId)?.name}
          {!!conflicts(r).length && <AlertTriangle className="w-4 h-4 text-rose-500" />}
        </span>
      )
    },
    { key: 'doc', header: t('doctor'), cell: (r) => <span className="text-slate-600">{r.doctorName}<span className="block text-xs text-slate-400">{r.clinic}</span></span> },
    { key: 'meds', header: t('medicines'), cell: (r) => <span className="text-slate-600 line-clamp-1">{r.items.map((i) => name(productMap.get(i.productId))).join(', ')}</span> },
    { key: 'st', header: tc('status'), cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (r) =>
        r.status === 'pending' ? (
          <Button
            size="sm"
            variant="primary"
            icon={ShoppingCart}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/erp/pos?rx=${r._id}`);
            }}>
            {t('dispense')}
          </Button>
        ) : null
    }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={FileHeart}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreate(true)}>
            {t('add')}
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <Tabs value={tab} onChange={setTab} items={(['pending', 'dispensed', 'cancelled'] as RxStatus[]).map((s) => ({ value: s, label: ts(s), count: count(s) }))} />
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="w-full sm:w-72 sm:ms-auto" />
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(r) => r._id} onRowClick={setView} />
      </Card>

      <RxFormModal
        open={create}
        onClose={() => setCreate(false)}
        onSaved={(r) => {
          toast.success(t('created', { n: r.number }));
          setTab('pending');
        }}
      />

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        size="lg"
        title={view ? `${view.number}` : ''}
        subtitle={view ? `${view.doctorName} · ${view.clinic}` : undefined}
        footer={
          view?.status === 'pending' ? (
            <>
              <Button variant="danger" icon={XCircle} onClick={() => setCancel(view)}>
                {t('cancelRx')}
              </Button>
              <Button variant="primary" icon={ShoppingCart} onClick={() => navigate(`/erp/pos?rx=${view._id}`)}>
                {t('dispense')}
              </Button>
            </>
          ) : undefined
        }>
        {view && (
          <div className="space-y-5">
            <KeyValue
              cols={4}
              items={[
                { label: t('patient'), value: <Link className="text-brand-gold hover:underline" to={`/erp/customers/${view.customerId}`}>{cust.get(view.customerId)?.name}</Link> },
                { label: t('rxDate'), value: fmt.date(view.date) },
                { label: tc('status'), value: <StatusBadge status={view.status} /> },
                { label: t('invoice'), value: view.saleId ? <Link className="text-brand-gold hover:underline" to={`/erp/invoices/${view.saleId}`}>{d.sales.find((s) => s._id === view.saleId)?.number}</Link> : '—' }
              ]}
            />
            {!!conflicts(view).length && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                {t('allergyWarn', { v: conflicts(view).join(', ') })}
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {view.items.map((i) => {
                const p = productMap.get(i.productId);
                return (
                  <li key={i.productId} className="py-3 flex items-center gap-3">
                    <ProductThumb src={p?.imageCover} size="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">{name(p)}</p>
                      <p className="text-xs text-slate-500">{i.dosage}</p>
                    </div>
                    <Badge tone="purple">× {i.qty}</Badge>
                  </li>
                );
              })}
            </ul>
            {view.notes && <p className="text-sm text-slate-600">{view.notes}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancel}
        onClose={() => setCancel(null)}
        danger
        title={t('cancelRx')}
        message={cancel ? t('cancelConfirm', { n: cancel.number }) : ''}
        onConfirm={() => {
          if (!cancel) return;
          erp.update('prescriptions', cancel._id, { status: 'cancelled' });
          toast.success(t('cancelled'));
          setView(null);
        }}
      />
    </>
  );
}

function RxFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (r: Prescription) => void }) {
  const t = useTranslations('ErpSales.rx');
  const tc = useTranslations('Erp.common');
  const name = useName();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { products, productMap } = useCatalog();
  const [customerId, setCustomerId] = useState('');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; qty: number; dosage: string }[]>([{ productId: '', qty: 1, dosage: '' }]);
  const [err, setErr] = useState<Record<string, string>>({});
  const customer = d.customers.find((c) => c._id === customerId);
  const hits = items.flatMap((i) => {
    const p = productMap.get(i.productId);
    return p ? allergyHits(customer?.allergies, `${p.title} ${p.titleAr ?? ''}`) : [];
  });

  const close = () => {
    setCustomerId('');
    setDoctor('');
    setClinic('');
    setDate(today());
    setNotes('');
    setItems([{ productId: '', qty: 1, dosage: '' }]);
    setErr({});
    onClose();
  };
  const save = () => {
    const valid = items.filter((i) => i.productId && i.qty > 0);
    const e: Record<string, string> = {};
    if (!customerId) e.customer = t('patientRequired');
    if (!doctor.trim()) e.doctor = t('doctorRequired');
    if (!valid.length) e.items = t('itemsRequired');
    setErr(e);
    if (Object.keys(e).length) return;
    const r = erp.insert('prescriptions', {
      number: erp.nextNumber('rx', 'RX'),
      customerId,
      doctorName: doctor.trim(),
      clinic: clinic.trim(),
      date,
      items: valid.map((i) => ({ ...i, dosage: i.dosage.trim() })),
      status: 'pending',
      branchId: branch?._id ?? '',
      notes: notes.trim() || undefined,
      createdAt: nowISO()
    }) as Prescription;
    onSaved(r);
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={t('add')}
      footer={
        <>
          <Button onClick={close}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('patient')} required error={err.customer}>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{t('choosePatient')}</option>
            {d.customers
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} · {c.phone}
                </option>
              ))}
          </Select>
        </Field>
        <Field label={t('rxDate')}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('doctor')} required error={err.doctor}>
          <div className="relative">
            <Stethoscope className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} className="ps-9" />
          </div>
        </Field>
        <Field label={t('clinic')}>
          <Input value={clinic} onChange={(e) => setClinic(e.target.value)} />
        </Field>
      </div>
      {customer?.allergies && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t('allergyWarn', { v: customer.allergies })}
        </p>
      )}
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-600 mb-2">{t('medicines')}</p>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_1fr_auto] gap-2 items-center">
              <Select value={it.productId} onChange={(e) => setItems((s) => s.map((x, k) => (k === i ? { ...x, productId: e.target.value } : x)))}>
                <option value="">{t('chooseProduct')}</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {name(p)}
                  </option>
                ))}
              </Select>
              <Input type="number" min={1} value={it.qty} onChange={(e) => setItems((s) => s.map((x, k) => (k === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))} className="text-center" />
              <Input value={it.dosage} placeholder={t('dosagePh')} onChange={(e) => setItems((s) => s.map((x, k) => (k === i ? { ...x, dosage: e.target.value } : x)))} />
              <button onClick={() => setItems((s) => (s.length > 1 ? s.filter((_, k) => k !== i) : s))} className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center" aria-label={tc('delete')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {err.items && <p className="text-xs text-rose-600 mt-1">{err.items}</p>}
        {!!hits.length && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('allergyWarn', { v: hits.join(', ') })}
          </p>
        )}
        <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setItems((s) => [...s, { productId: '', qty: 1, dosage: '' }])}>
          {t('addLine')}
        </Button>
      </div>
      <Field label={tc('notes')} className="mt-4">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}
