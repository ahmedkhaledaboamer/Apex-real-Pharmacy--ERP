import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Mail, Pencil, Phone, Plus, Receipt, ShieldAlert, Stethoscope, Timer, Users, Wallet } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useFmt, useName } from '../../hooks';
import { addDays, daysUntil, erp, round2, toDay, today } from '../../store';
import type { Employee, EmployeeRole } from '../../types';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Input, KeyValue, Modal, PageHeader, SearchInput, Select, StatusBadge, Toolbar, type Column } from '../../ui/kit';
import { Avatar, KpiTile } from './parts';
import { initials } from './metrics';

const ROLES: EmployeeRole[] = ['manager', 'pharmacist', 'assistant', 'cashier', 'driver'];

export default function EmployeesPage() {
  return (
    <Routes>
      <Route index element={<EmployeeList />} />
      <Route path=":id" element={<EmployeeDetail />} />
    </Routes>
  );
}

function LicenceBadge({ e }: { e: Employee }) {
  const t = useTranslations('ErpFin.employees');
  if (!e.licenseExpiry) return <span className="text-slate-400">—</span>;
  const n = daysUntil(e.licenseExpiry);
  if (n < 0) return <Badge tone="red" dot>{t('licenceExpired')}</Badge>;
  if (n <= 60) return <Badge tone="amber" dot>{t('licenceExpiring', { n })}</Badge>;
  return <Badge tone="green" dot>{t('licenceOk')}</Badge>;
}

function EmployeeList() {
  const t = useTranslations('ErpFin.employees');
  const tc = useTranslations('Erp.common');
  const tr = useTranslations('Erp.roles');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const { branches } = useCatalog();
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('all');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const bName = (id: string) => name(branches.find((b) => b._id === id)).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '');

  const rows = useMemo(
    () =>
      d.employees.filter(
        (e) =>
          (branch === 'all' || e.branchId === branch) &&
          (role === 'all' || e.role === role) &&
          (status === 'all' || (status === 'active' ? e.active : !e.active)) &&
          (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.phone.includes(q))
      ),
    [d, branch, role, status, q]
  );
  const active = d.employees.filter((e) => e.active);
  const payroll = round2(active.reduce((s, e) => s + e.salary, 0));
  const licences = active.filter((e) => e.licenseExpiry && daysUntil(e.licenseExpiry) <= 60).length;

  const cols: Column<Employee>[] = [
    {
      key: 'name',
      header: tc('name'),
      sort: (e) => e.name,
      cell: (e) => (
        <span className="flex items-center gap-3">
          <Avatar text={initials(e.name)} />
          <span className="min-w-0">
            <span className="block font-semibold text-brand-dark truncate">{e.name}</span>
            <span className="block text-xs text-slate-500 truncate">{e.email}</span>
          </span>
        </span>
      )
    },
    { key: 'role', header: t('role'), sort: (e) => e.role, cell: (e) => <Badge tone={e.role === 'manager' ? 'navy' : e.role === 'pharmacist' ? 'purple' : 'gray'}>{tr(e.role)}</Badge> },
    { key: 'branch', header: tc('branch'), sort: (e) => bName(e.branchId), cell: (e) => bName(e.branchId) },
    { key: 'phone', header: tc('phone'), cell: (e) => <span className="tabular-nums text-slate-600">{e.phone}</span> },
    { key: 'lic', header: t('licenseExpiry'), sort: (e) => e.licenseExpiry ?? 'z', cell: (e) => <LicenceBadge e={e} /> },
    { key: 'salary', header: t('salary'), align: 'end', sort: (e) => e.salary, cell: (e) => <span className="tabular-nums font-semibold">{fmt.money(e.salary)}</span> },
    { key: 'st', header: tc('status'), cell: (e) => <StatusBadge status={e.active ? 'active' : 'inactive'} /> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (e) => (
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            setEditing(e);
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-brand-dark hover:bg-slate-100"
          aria-label={tc('edit')}>
          <Pencil className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Users}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            {t('add')}
          </Button>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiTile label={t('headcount')} value={fmt.int(active.length)} icon={Users} tone="purple" />
        <KpiTile label={t('payroll')} value={fmt.money(payroll)} icon={Wallet} tone="blue" />
        <KpiTile label={t('pharmacists')} value={fmt.int(active.filter((e) => e.role === 'pharmacist' || e.role === 'manager').length)} icon={Stethoscope} tone="teal" />
        <KpiTile label={t('licences')} value={fmt.int(licences)} icon={ShieldAlert} tone={licences ? 'rose' : 'teal'} />
      </div>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder={tc('search')} className="w-full sm:w-64" />
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="!w-48">
            <option value="all">{tc('all')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {bName(b._id)}
              </option>
            ))}
          </Select>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="!w-44">
            <option value="all">{t('allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="!w-36">
            <option value="all">{t('allStatus')}</option>
            <option value="active">{t('onlyActive')}</option>
            <option value="inactive">{t('onlyInactive')}</option>
          </Select>
        </Toolbar>
        <DataTable rows={rows} columns={cols} rowKey={(e) => e._id} onRowClick={(e) => navigate(`/erp/employees/${e._id}`)} />
      </Card>
      {editing && <EmployeeModal employee={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EmployeeModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const t = useTranslations('ErpFin.employees');
  const tc = useTranslations('Erp.common');
  const tr = useTranslations('Erp.roles');
  const name = useName();
  const toast = useToast();
  const { branches } = useCatalog();
  const [v, setV] = useState({
    name: employee?.name ?? '',
    role: employee?.role ?? ('pharmacist' as EmployeeRole),
    branchId: employee?.branchId ?? branches[0]?._id ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    salary: employee ? String(employee.salary) : '',
    licenseNo: employee?.licenseNo ?? '',
    licenseExpiry: employee?.licenseExpiry ?? '',
    hiredAt: employee?.hiredAt ?? today(),
    active: employee?.active ?? true
  });
  const [err, setErr] = useState('');
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const save = () => {
    if (!v.name.trim()) return setErr(t('errName'));
    const rec = { ...v, name: v.name.trim(), salary: round2(Number(v.salary) || 0), licenseNo: v.licenseNo || undefined, licenseExpiry: v.licenseExpiry || undefined };
    if (employee) erp.update('employees', employee._id, rec);
    else erp.insert('employees', rec);
    toast.success(tc('saved'));
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={employee ? t('edit') : t('add')}
      footer={
        <>
          {employee && (
            <Button variant="ghost" className="me-auto" onClick={() => set('active', !v.active)}>
              {v.active ? t('deactivate') : t('activate')}
            </Button>
          )}
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={tc('name')} required error={err}>
          <Input value={v.name} onChange={(e) => (set('name', e.target.value), setErr(''))} autoFocus />
        </Field>
        <Field label={t('role')}>
          <Select value={v.role} onChange={(e) => set('role', e.target.value as EmployeeRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tc('branch')}>
          <Select value={v.branchId} onChange={(e) => set('branchId', e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {name(b)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('salary')}>
          <Input type="number" min="0" value={v.salary} onChange={(e) => set('salary', e.target.value)} />
        </Field>
        <Field label={tc('phone')}>
          <Input value={v.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label={tc('email')}>
          <Input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label={t('licenseNo')}>
          <Input value={v.licenseNo} onChange={(e) => set('licenseNo', e.target.value)} />
        </Field>
        <Field label={t('licenseExpiry')}>
          <Input type="date" value={v.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
        </Field>
        <Field label={t('hiredAt')}>
          <Input type="date" value={v.hiredAt} onChange={(e) => set('hiredAt', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function EmployeeDetail() {
  const { id } = useParams();
  const t = useTranslations('ErpFin.employees');
  const tc = useTranslations('Erp.common');
  const tr = useTranslations('Erp.roles');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { branches } = useCatalog();
  const [editing, setEditing] = useState(false);
  const e = d.employees.find((x) => x._id === id);
  const data = useMemo(() => {
    if (!e) return null;
    const now = new Date();
    const monday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -((now.getDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => toDay(addDays(monday, i)));
    const shifts = d.shifts.filter((s) => s.employeeId === e._id && week.includes(s.date)).sort((a, b) => a.date.localeCompare(b.date));
    const since = addDays(now, -30).toISOString();
    const sales = d.sales.filter((s) => s.employeeId === e._id && s.createdAt >= since).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { shifts, sales, total: round2(sales.reduce((s, x) => s + x.total, 0)) };
  }, [d, e]);
  if (!e || !data) return <EmptyState title={tc('noData')} />;
  return (
    <>
      <Link to="/erp/employees" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-dark mb-4">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('back')}
      </Link>
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(130%_140%_at_0%_0%,#7A1FB8_0%,#3B2BB8_50%,#0672DF_100%)] text-white p-6 mb-6">
        <div className="absolute -top-20 -end-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar text={initials(e.name)} className="w-20 h-20 text-2xl ring-4 ring-white/20" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{e.name}</h1>
              <StatusBadge status={e.active ? 'active' : 'inactive'} />
            </div>
            <p className="text-white/75 mt-0.5">
              {tr(e.role)} · {name(branches.find((b) => b._id === e.branchId))}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {e.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {e.email}
              </span>
            </div>
          </div>
          <Button icon={Pencil} onClick={() => setEditing(true)}>
            {tc('edit')}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title={tc('details')} icon={BadgeCheck} />
          <KeyValue
            cols={1}
            items={[
              { label: t('salary'), value: `${fmt.money(e.salary)} ${t('perMonth')}` },
              { label: t('hiredAt'), value: fmt.date(e.hiredAt) },
              { label: t('licenseNo'), value: e.licenseNo ?? '—' },
              { label: t('licenseExpiry'), value: e.licenseExpiry ? <span className="inline-flex items-center gap-2">{fmt.date(e.licenseExpiry)} <LicenceBadge e={e} /></span> : '—' }
            ]}
          />
        </Card>
        <Card>
          <CardHeader title={t('weekShifts')} icon={Timer} />
          {data.shifts.length ? (
            <ul className="space-y-2">
              {data.shifts.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-sm font-medium">{fmt.date(s.date)}</span>
                  <span className="text-xs text-slate-500 tabular-nums" dir="ltr">
                    {s.start}–{s.end}
                  </span>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t('noShifts')} />
          )}
        </Card>
        <Card>
          <CardHeader title={t('salesHandled')} subtitle={t('salesHandledSub')} icon={Receipt} />
          <div className="flex items-end justify-between mb-3">
            <span className="text-2xl font-bold tabular-nums">{fmt.money(data.total)}</span>
            <span className="text-sm text-slate-500">{tc('items', { n: data.sales.length })}</span>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.sales.slice(0, 6).map((s) => (
              <li key={s._id}>
                <Link to={`/erp/invoices/${s._id}`} className="flex justify-between py-2 hover:text-brand-gold">
                  <span className="font-medium">{s.number}</span>
                  <span className="text-slate-500">{fmt.dateShort(s.createdAt)}</span>
                  <span className="tabular-nums font-semibold">{fmt.money(s.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {editing && <EmployeeModal employee={e} onClose={() => setEditing(false)} />}
    </>
  );
}
