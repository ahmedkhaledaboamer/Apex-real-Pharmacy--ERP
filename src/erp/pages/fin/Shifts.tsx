import { useMemo, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock4, Palmtree, Timer, UserX, Plus } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { addDays, erp, toDay, today } from '../../store';
import type { Employee, Shift, ShiftStatus } from '../../types';
import { Button, Card, Field, Input, Modal, PageHeader, Select, StatusBadge, Toolbar, cx } from '../../ui/kit';
import { Avatar, KpiTile } from './parts';
import { initials } from './metrics';

const STATUSES: ShiftStatus[] = ['scheduled', 'present', 'late', 'absent', 'leave'];
const CELL: Record<ShiftStatus, string> = {
  scheduled: 'bg-blue-50 border-blue-100 text-blue-800',
  present: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  late: 'bg-amber-50 border-amber-100 text-amber-800',
  absent: 'bg-rose-50 border-rose-100 text-rose-800',
  leave: 'bg-violet-50 border-violet-100 text-violet-800'
};

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
}

export default function ShiftsPage() {
  const t = useTranslations('ErpFin.shifts');
  const tc = useTranslations('Erp.common');
  const tr = useTranslations('Erp.roles');
  const ts = useTranslations('Erp.status');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { branches } = useCatalog();
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [scope, setScope] = useState<string>(branch?._id ?? 'all');
  const [edit, setEdit] = useState<{ employee: Employee; date: string; shift?: Shift } | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => toDay(addDays(week, i))), [week]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(fmt.locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { weekday: 'short' }), [fmt.locale]);

  const emps = useMemo(() => d.employees.filter((e) => e.active && (scope === 'all' || e.branchId === scope)), [d, scope]);
  const shifts = useMemo(() => d.shifts.filter((s) => days.includes(s.date) && emps.some((e) => e._id === s.employeeId)), [d, days, emps]);
  const stats = useMemo(() => {
    const past = shifts.filter((s) => s.status !== 'scheduled');
    const worked = past.filter((s) => s.status === 'present' || s.status === 'late').length;
    const due = past.filter((s) => s.status !== 'leave').length;
    return {
      rate: due ? (worked / due) * 100 : 0,
      late: past.filter((s) => s.status === 'late').length,
      absent: past.filter((s) => s.status === 'absent').length,
      leave: past.filter((s) => s.status === 'leave').length,
      scheduled: shifts.length
    };
  }, [shifts]);
  const t0 = today();

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} icon={Timer} />
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
        <KpiTile label={t('attendance')} value={fmt.pct(stats.rate)} icon={CalendarCheck2} tone="teal" />
        <KpiTile label={t('late')} value={fmt.int(stats.late)} icon={Clock4} tone="amber" />
        <KpiTile label={t('absences')} value={fmt.int(stats.absent)} icon={UserX} tone="rose" />
        <KpiTile label={t('leave')} value={fmt.int(stats.leave)} icon={Palmtree} tone="purple" />
        <KpiTile label={t('scheduled')} value={fmt.int(stats.scheduled)} icon={Timer} tone="blue" />
      </div>
      <Card>
        <Toolbar>
          <div className="inline-flex items-center gap-1">
            <Button size="sm" icon={ChevronLeft} className="[&>svg]:rtl:rotate-180" onClick={() => setWeek((w) => addDays(w, -7))} aria-label={t('prevWeek')} />
            <Button size="sm" onClick={() => setWeek(mondayOf(new Date()))}>
              {t('thisWeek')}
            </Button>
            <Button size="sm" icon={ChevronRight} className="[&>svg]:rtl:rotate-180" onClick={() => setWeek((w) => addDays(w, 7))} aria-label={t('nextWeek')} />
          </div>
          <span className="text-sm font-semibold text-brand-dark">
            {fmt.date(days[0])} – {fmt.date(days[6])}
          </span>
          <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!w-56 ms-auto">
            <option value="all">{tc('all')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {name(b)}
              </option>
            ))}
          </Select>
        </Toolbar>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[900px] text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky start-0 bg-white z-10 text-start py-2 pe-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-56">{t('employee')}</th>
                {days.map((day) => (
                  <th key={day} className={cx('py-2 px-1 text-center text-[11px] font-semibold uppercase tracking-wide', day === t0 ? 'text-brand-gold' : 'text-slate-500')}>
                    <span className="block">{dayFmt.format(new Date(`${day}T00:00:00`))}</span>
                    <span className={cx('inline-flex mt-0.5 w-7 h-7 rounded-full items-center justify-center text-xs', day === t0 ? 'bg-gradient-to-br from-brand-gold to-brand-goldLight text-white' : 'text-brand-dark')}>{Number(day.slice(8))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emps.map((e) => (
                <tr key={e._id}>
                  <td className="sticky start-0 bg-white z-10 py-2 pe-3 border-t border-slate-100">
                    <span className="flex items-center gap-2.5">
                      <Avatar text={initials(e.name)} className="w-8 h-8 text-[11px]" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-brand-dark truncate">{e.name}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{tr(e.role)}</span>
                      </span>
                    </span>
                  </td>
                  {days.map((day) => {
                    const s = shifts.find((x) => x.employeeId === e._id && x.date === day);
                    return (
                      <td key={day} className="p-1 border-t border-slate-100">
                        <button
                          onClick={() => setEdit({ employee: e, date: day, shift: s })}
                          className={cx(
                            'w-full h-14 rounded-xl border text-start px-2 py-1.5 transition hover:shadow-sm hover:-translate-y-px',
                            s ? CELL[s.status] : 'border-dashed border-slate-200 text-slate-300 hover:text-brand-gold hover:border-brand-gold/40 flex items-center justify-center'
                          )}>
                          {s ? (
                            <>
                              <span className="block text-xs font-semibold tabular-nums" dir="ltr">
                                {s.start}–{s.end}
                              </span>
                              <span className="block text-[10px] font-medium opacity-80 mt-0.5">{ts(s.status)}</span>
                            </>
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 me-1">{t('legend')}:</span>
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Card>
      {edit && <ShiftModal {...edit} onClose={() => setEdit(null)} />}
    </>
  );

}

function ShiftModal({ employee, date, shift, onClose }: { employee: Employee; date: string; shift?: Shift; onClose: () => void }) {
  const t = useTranslations('ErpFin.shifts');
  const tc = useTranslations('Erp.common');
  const ts = useTranslations('Erp.status');
  const fmt = useFmt();
  const [v, setV] = useState({ start: shift?.start ?? '08:00', end: shift?.end ?? '16:00', status: shift?.status ?? ('scheduled' as ShiftStatus) });
  const save = () => {
    if (shift) erp.update('shifts', shift._id, v);
    else erp.insert('shifts', { employeeId: employee._id, branchId: employee.branchId, date, ...v });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={shift ? t('editShift') : t('addShift')}
      subtitle={`${employee.name} · ${fmt.date(date)}`}
      footer={
        <>
          {shift && (
            <Button
              variant="ghost"
              className="me-auto text-rose-600"
              onClick={() => {
                erp.remove('shifts', shift._id);
                onClose();
              }}>
              {t('removeShift')}
            </Button>
          )}
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('start')}>
          <Input type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
        </Field>
        <Field label={t('end')}>
          <Input type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
        </Field>
        <Field label={tc('status')} className="col-span-2">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setV({ ...v, status: s })} className={cx('px-3 h-9 rounded-xl border text-xs font-semibold transition', v.status === s ? CELL[s] + ' ring-2 ring-offset-1 ring-brand-gold/40' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                {ts(s)}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
