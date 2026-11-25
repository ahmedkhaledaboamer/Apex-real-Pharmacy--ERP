import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Clock, Lock, LockOpen, Receipt, Undo2, Wallet } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { erp, nowISO, round2 } from '../../store';
import type { CashSession, ErpData } from '../../types';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Input, KeyValue, Modal, PageHeader, Select, StatusBadge, Textarea, cx, type Column } from '../../ui/kit';
import { Avatar } from './parts';
import { initials } from './metrics';

/** Cash collected / refunded during a session. Seeded sessions have no sale link, so fall back to the time window. */
export function sessionCash(d: ErpData, s: CashSession) {
  const end = s.closedAt ? new Date(s.closedAt).getTime() : Date.now();
  const start = new Date(s.openedAt).getTime();
  const inWin = (iso: string) => {
    const x = new Date(iso).getTime();
    return x >= start && x <= end;
  };
  const sales = d.sales.filter((x) => (x.sessionId ? x.sessionId === s._id : x.branchId === s.branchId && inWin(x.createdAt)));
  const cashSales = round2(sales.reduce((t, x) => t + x.payments.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amount, 0), 0));
  const refunds = d.returns.filter((r) => r.branchId === s.branchId && r.refundMethod === 'cash' && inWin(r.createdAt));
  const cashRefunds = round2(refunds.reduce((t, r) => t + r.amount, 0));
  const expected = round2(s.openingFloat + cashSales - cashRefunds);
  const variance = s.countedCash !== undefined ? round2(s.countedCash - expected) : undefined;
  return { sales: sales.filter((x) => x.payments.some((p) => p.method === 'cash')), cashSales, cashRefunds, expected, variance };
}

export default function CashRegistersPage() {
  return (
    <Routes>
      <Route index element={<CashList />} />
      <Route path=":id" element={<SessionDetail />} />
    </Routes>
  );
}

function Variance({ v }: { v?: number }) {
  const t = useTranslations('ErpFin.cash');
  const fmt = useFmt();
  if (v === undefined) return <span className="text-slate-400">—</span>;
  if (Math.abs(v) < 0.01) return <Badge tone="green">{t('balanced')}</Badge>;
  return (
    <span className={cx('font-semibold tabular-nums', v > 0 ? 'text-amber-600' : 'text-rose-600')}>
      {v > 0 ? '+' : '−'}
      {fmt.money(Math.abs(v))} <span className="text-xs font-medium">({v > 0 ? t('over') : t('short')})</span>
    </span>
  );
}

function CashList() {
  const t = useTranslations('ErpFin.cash');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const navigate = useNavigate();
  const d = useErpState();
  const branch = useCurrentBranch();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const emp = (id: string) => d.employees.find((e) => e._id === id);
  const open = d.cashSessions.find((s) => s.branchId === branch?._id && s.status === 'open');
  const live = useMemo(() => (open ? sessionCash(d, open) : null), [d, open]);
  const history = useMemo(
    () =>
      d.cashSessions
        .filter((s) => s.branchId === branch?._id)
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
        .map((s) => ({ s, ...sessionCash(d, s) })),
    [d, branch]
  );
  type Row = (typeof history)[number];
  const cols: Column<Row>[] = [
    { key: 'n', header: t('session'), cell: (r) => <span className="font-semibold">{r.s.number}</span>, sort: (r) => r.s.number },
    { key: 'emp', header: t('employee'), cell: (r) => emp(r.s.employeeId)?.name ?? '—' },
    { key: 'open', header: t('openedAt'), cell: (r) => fmt.dateTime(r.s.openedAt), sort: (r) => r.s.openedAt },
    { key: 'close', header: t('closedAt'), cell: (r) => (r.s.closedAt ? fmt.dateTime(r.s.closedAt) : '—') },
    { key: 'exp', header: t('expected'), align: 'end', cell: (r) => <span className="tabular-nums">{fmt.money(r.expected)}</span> },
    { key: 'cnt', header: t('counted'), align: 'end', cell: (r) => <span className="tabular-nums">{r.s.countedCash !== undefined ? fmt.money(r.s.countedCash) : '—'}</span> },
    { key: 'var', header: t('variance'), align: 'end', cell: (r) => <Variance v={r.variance} /> },
    { key: 'st', header: tc('status'), cell: (r) => <StatusBadge status={r.s.status} /> }
  ];
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Banknote}
        actions={
          open ? (
            <Button variant="primary" icon={Lock} onClick={() => setCloseModal(true)}>
              {t('closeSession')}
            </Button>
          ) : (
            <Button variant="primary" icon={LockOpen} onClick={() => setOpenModal(true)}>
              {t('openSession')}
            </Button>
          )
        }
      />
      {open && live ? (
        <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_0%_0%,#0B1F5C_0%,#22307A_55%,#3B2BB8_100%)] text-white p-6 mb-6">
          <div className="absolute -top-16 -end-10 w-64 h-64 rounded-full bg-brand-goldLight/30 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar text={initials(emp(open.employeeId)?.name ?? '?')} className="w-14 h-14 text-base ring-4 ring-white/15" />
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t('current')} · {open.number}
                </p>
                <p className="text-xl font-bold mt-0.5">{emp(open.employeeId)?.name}</p>
                <p className="text-sm text-white/70 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t('openedAt')} {fmt.dateTime(open.openedAt)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[600px]">
              {[
                { l: t('float'), v: open.openingFloat, i: Wallet },
                { l: t('cashSales'), v: live.cashSales, i: Receipt },
                { l: t('cashRefunds'), v: live.cashRefunds ? -live.cashRefunds : 0, i: Undo2 },
                { l: t('expected'), v: live.expected, i: Banknote, strong: true }
              ].map((x) => (
                <div key={x.l} className={cx('rounded-2xl p-3.5', x.strong ? 'bg-white text-brand-dark' : 'bg-white/10 backdrop-blur')}>
                  <p className={cx('text-[11px] font-medium flex items-center gap-1.5', x.strong ? 'text-slate-500' : 'text-white/60')}>
                    <x.i className="w-3.5 h-3.5" />
                    {x.l}
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-1">{fmt.money(x.v)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={Lock}
            title={t('noOpen')}
            description={t('noOpenSub')}
            action={
              <Button variant="primary" icon={LockOpen} onClick={() => setOpenModal(true)}>
                {t('openSession')}
              </Button>
            }
          />
        </Card>
      )}
      <Card>
        <CardHeader title={t('history')} icon={Clock} />
        <DataTable rows={history} columns={cols} rowKey={(r) => r.s._id} onRowClick={(r) => navigate(`/erp/cash/${r.s._id}`)} />
      </Card>
      {openModal && <OpenModal onClose={() => setOpenModal(false)} />}
      {closeModal && open && live && <CloseModal session={open} expected={live.expected} onClose={() => setCloseModal(false)} />}
    </>
  );
}

function OpenModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('ErpFin.cash');
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const d = useErpState();
  const branch = useCurrentBranch();
  const staff = d.employees.filter((e) => e.active && e.branchId === branch?._id);
  const pool = staff.length ? staff : d.employees.filter((e) => e.active);
  const [emp, setEmp] = useState(pool[0]?._id ?? '');
  const [float, setFloat] = useState('1000');
  const save = () => {
    erp.insert('cashSessions', { number: erp.nextNumber('session', 'CS'), branchId: branch!._id, employeeId: emp, openedAt: nowISO(), openingFloat: round2(Number(float) || 0), status: 'open' });
    toast.success(t('opened'));
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('openSession')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" icon={LockOpen} onClick={save} disabled={!emp}>
            {t('openSession')}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={t('employee')}>
          <Select value={emp} onChange={(e) => setEmp(e.target.value)}>
            {pool.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('float')}>
          <Input type="number" min="0" value={float} onChange={(e) => setFloat(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function CloseModal({ session, expected, onClose }: { session: CashSession; expected: number; onClose: () => void }) {
  const t = useTranslations('ErpFin.cash');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const toast = useToast();
  const [counted, setCounted] = useState(String(expected));
  const [note, setNote] = useState('');
  const n = Number(counted);
  const variance = Number.isFinite(n) ? round2(n - expected) : undefined;
  const save = () => {
    erp.update('cashSessions', session._id, { status: 'closed', closedAt: nowISO(), countedCash: round2(n), note: note.trim() || undefined });
    toast.success(t('closed'));
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('closeSession')}
      subtitle={session.number}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" icon={Lock} onClick={save} disabled={!Number.isFinite(n) || counted === ''}>
            {t('closeSession')}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">{t('expected')}</span>
          <span className="text-lg font-bold tabular-nums">{fmt.money(expected)}</span>
        </div>
        <Field label={t('counted')} hint={t('countHint')}>
          <Input type="number" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t('variance')}</span>
          <Variance v={variance} />
        </div>
        <Field label={tc('notes')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function SessionDetail() {
  const { id } = useParams();
  const t = useTranslations('ErpFin.cash');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { branches } = useCatalog();
  const s = d.cashSessions.find((x) => x._id === id);
  const calc = useMemo(() => (s ? sessionCash(d, s) : null), [d, s]);
  if (!s || !calc) return <EmptyState title={tc('noData')} />;
  const emp = d.employees.find((e) => e._id === s.employeeId);
  const hours = Math.round(((s.closedAt ? new Date(s.closedAt).getTime() : Date.now()) - new Date(s.openedAt).getTime()) / 360000) / 10;
  return (
    <>
      <Link to="/erp/cash" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('title')}
      </Link>
      <PageHeader title={t('detail', { number: s.number })} icon={Banknote} actions={<StatusBadge status={s.status} />} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title={tc('details')} />
          <KeyValue
            cols={1}
            items={[
              { label: t('employee'), value: emp?.name ?? '—' },
              { label: tc('branch'), value: name(branches.find((b) => b._id === s.branchId)) },
              { label: t('openedAt'), value: fmt.dateTime(s.openedAt) },
              { label: t('closedAt'), value: s.closedAt ? fmt.dateTime(s.closedAt) : '—' },
              { label: t('duration'), value: t('hours', { n: hours }) },
              { label: tc('notes'), value: s.note || '—' }
            ]}
          />
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title={t('expected')} />
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              [t('float'), s.openingFloat],
              [t('cashSales'), calc.cashSales],
              [t('cashRefunds'), calc.cashRefunds ? -calc.cashRefunds : 0]
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between py-2.5">
                <dt className="text-slate-500">{l}</dt>
                <dd className="tabular-nums font-medium">{fmt.money(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold text-base">
              <dt>{t('expected')}</dt>
              <dd className="tabular-nums">{fmt.money(calc.expected)}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">{t('counted')}</dt>
              <dd className="tabular-nums font-medium">{s.countedCash !== undefined ? fmt.money(s.countedCash) : '—'}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">{t('variance')}</dt>
              <dd>
                <Variance v={calc.variance} />
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title={t('invoices')} subtitle={`${calc.sales.length}`} icon={Receipt} />
          <DataTable
            rows={calc.sales}
            rowKey={(x) => x._id}
            columns={[
              { key: 'n', header: tc('number'), cell: (x) => <Link className="font-semibold text-brand-gold hover:underline" to={`/erp/invoices/${x._id}`}>{x.number}</Link> },
              { key: 'd', header: tc('date'), cell: (x) => fmt.dateTime(x.createdAt) },
              { key: 'c', header: tc('cash'), align: 'end', cell: (x) => <span className="tabular-nums">{fmt.money(x.payments.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amount, 0))}</span> },
              { key: 't', header: tc('total'), align: 'end', cell: (x) => <span className="tabular-nums font-semibold">{fmt.money(x.total)}</span> }
            ]}
          />
        </Card>
      </div>
    </>
  );
}
