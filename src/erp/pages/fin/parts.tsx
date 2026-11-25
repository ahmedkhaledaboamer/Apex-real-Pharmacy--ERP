import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { Sparkline } from '../../ui/charts';
import { cx } from '../../ui/kit';

const TONES = {
  purple: { chip: 'bg-violet-50 text-violet-700', line: '#7A1FB8' },
  blue: { chip: 'bg-blue-50 text-blue-700', line: '#0672DF' },
  teal: { chip: 'bg-teal-50 text-teal-700', line: '#13A89E' },
  amber: { chip: 'bg-amber-50 text-amber-700', line: '#E8890C' },
  rose: { chip: 'bg-rose-50 text-rose-700', line: '#D6457F' }
} as const;

/** KPI tile with delta and a sparkline. */
export function KpiTile({ label, value, icon: Icon, delta, hint, spark, tone = 'purple', invert }: { label: ReactNode; value: ReactNode; icon: LucideIcon; delta?: number; hint?: ReactNode; spark?: number[]; tone?: keyof typeof TONES; invert?: boolean }) {
  const good = delta === undefined ? true : invert ? delta <= 0 : delta >= 0;
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-xl 2xl:text-2xl leading-tight font-bold text-brand-dark tracking-tight tabular-nums break-words">{value}</p>
        </div>
        <span className={cx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', TONES[tone].chip)}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="flex items-center gap-2 text-xs min-w-0">
          {delta !== undefined && Number.isFinite(delta) && (
            <span className={cx('inline-flex items-center gap-0.5 font-semibold rounded-md px-1.5 py-0.5', good ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50')}>
              {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(Math.round(delta * 10) / 10)}%
            </span>
          )}
          {hint && <span className="text-slate-500 truncate">{hint}</span>}
        </div>
        {spark && spark.length > 1 && (
          <div className="shrink-0 opacity-90">
            <Sparkline values={spark} color={TONES[tone].line} width={84} height={28} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Small two-option toggle. */
export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; icon?: LucideIcon }[] }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 gap-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx('px-3 h-8 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap', value === it.value ? 'bg-brand-dark text-white shadow-sm' : 'text-slate-500 hover:text-brand-dark')}>
          {it.icon && <it.icon className="w-3.5 h-3.5" />}
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ text, className }: { text: string; className?: string }) {
  return <span className={cx('shrink-0 rounded-full bg-gradient-to-br from-brand-gold to-brand-goldLight text-white font-bold flex items-center justify-center', className ?? 'w-9 h-9 text-xs')}>{text}</span>;
}
