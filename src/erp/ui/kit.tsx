/**
 * ERP design kit — one look for every ERP page.
 * Brand: navy #0B1F5C text, purple→blue gradient (#7A1FB8 → #0672DF) accents,
 * white cards on a cool slate canvas, 12–16px radii, hairline borders.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search, X, type LucideIcon } from 'lucide-react';
import { useTranslations } from '../../lib/i18n';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* --------------------------------- layout -------------------------------- */
export function PageHeader({ title, subtitle, icon: Icon, actions, children }: { title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <span className="hidden sm:flex shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-goldLight text-white items-center justify-center shadow-lg shadow-brand-gold/20">
              <Icon className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-brand-dark tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <section className={cx('bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', padded && 'p-5', className)}>{children}</section>;
}

export function CardHeader({ title, subtitle, action, icon: Icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-brand-pink text-brand-gold flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-brand-dark truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** KPI tile: label, big value, optional delta vs previous period and icon. */
export function StatCard({ label, value, icon: Icon, delta, hint, tone = 'purple', onClick }: { label: ReactNode; value: ReactNode; icon?: LucideIcon; delta?: number | null; hint?: ReactNode; tone?: 'purple' | 'blue' | 'teal' | 'amber' | 'rose' | 'slate'; onClick?: () => void }) {
  const tones = {
    purple: 'bg-violet-50 text-violet-700',
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700'
  } as const;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={cx('text-start bg-white rounded-2xl border border-slate-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', onClick && 'hover:border-brand-gold/40 hover:shadow-md transition')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', tones[tone])}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-brand-dark tracking-tight tabular-nums">{value}</p>
      {(delta !== undefined && delta !== null) || hint ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {delta !== undefined && delta !== null && Number.isFinite(delta) && (
            <span className={cx('inline-flex items-center gap-0.5 font-semibold', delta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(Math.round(delta * 10) / 10)}%
            </span>
          )}
          {hint && <span className="text-slate-500 truncate">{hint}</span>}
        </div>
      ) : null}
    </Comp>
  );
}

/* --------------------------------- badges -------------------------------- */
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray' | 'teal' | 'navy';
const toneCls: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  navy: 'bg-brand-dark text-white ring-brand-dark'
};
export function Badge({ tone = 'gray', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', toneCls[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Maps any status value used in the ERP to a tone + translated label (Erp.status.*). */
const STATUS_TONE: Record<string, Tone> = {
  completed: 'green', received: 'green', paid: 'green', dispensed: 'green', approved: 'teal', present: 'green', posted: 'green', active: 'green', open: 'blue', closed: 'gray',
  partial: 'amber', partially_refunded: 'amber', in_transit: 'blue', ordered: 'blue', submitted: 'blue', scheduled: 'blue', pending: 'amber', late: 'amber', leave: 'purple', draft: 'gray', unpaid: 'red',
  refunded: 'red', cancelled: 'gray', rejected: 'red', absent: 'red', inactive: 'gray', expired: 'red', expiring: 'amber', low: 'amber', out: 'red', ok: 'green'
};
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Erp.status');
  return (
    <Badge tone={STATUS_TONE[status] ?? 'gray'} dot>
      {t(status)}
    </Badge>
  );
}

/* --------------------------------- buttons -------------------------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
export function Button({ variant = 'secondary', size = 'md', icon: Icon, children, className, loading, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon; loading?: boolean }) {
  const v: Record<BtnVariant, string> = {
    primary: 'text-white bg-gradient-to-r from-brand-gold to-brand-goldLight shadow-md shadow-brand-gold/20 hover:shadow-lg hover:brightness-110',
    secondary: 'bg-white text-brand-dark border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-brand-dark',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    soft: 'bg-brand-pink text-brand-gold hover:bg-brand-pinkDark/50'
  };
  const s = { sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-base gap-2 rounded-xl' }[size];
  return (
    <button {...rest} disabled={rest.disabled || loading} className={cx('inline-flex items-center justify-center font-semibold transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50', v[variant], s, className)}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; badge?: number }) {
  return (
    <button {...rest} aria-label={label} title={label} className={cx('relative w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-brand-dark transition', className)}>
      <Icon className="w-[18px] h-[18px]" />
      {!!badge && <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}

/* ---------------------------------- forms --------------------------------- */
const fieldCls = 'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/25 focus:border-brand-gold/50 disabled:bg-slate-50 transition';
export function Field({ label, error, hint, children, className, required }: { label?: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="block text-xs font-semibold text-slate-600 mb-1.5">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
      {children}
      {error ? <span className="block mt-1 text-xs text-rose-600">{error}</span> : hint ? <span className="block mt-1 text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const base = /(^|\s)!?w-/.test(props.className ?? '') ? fieldCls.replace('w-full ', '') : fieldCls;
  return <input {...props} className={cx(base, props.className)} />;
}
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // full width by default; any explicit width class (w-*) wins
  const base = /(^|\s)!?w-/.test(props.className ?? '') ? fieldCls.replace('w-full ', '') : fieldCls;
  return (
    <select {...props} className={cx(base, 'pe-8', props.className)}>
      {children}
    </select>
  );
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, 'h-auto min-h-[80px] py-2', props.className)} />;
}
export function SearchInput({ value, onChange, placeholder, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(fieldCls, 'ps-9')} />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600" aria-label="clear">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** A row of filters/actions above a table. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex flex-wrap items-center gap-2 mb-4', className)}>{children}</div>;
}

/** Segmented control / tabs. */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cx('inline-flex p-1 rounded-xl bg-slate-100 gap-1 overflow-x-auto max-w-full', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx('px-3 h-8 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition', value === it.value ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-brand-dark')}>
          {it.label}
          {it.count !== undefined && <span className={cx('px-1.5 rounded-md text-[10px]', value === it.value ? 'bg-brand-pink text-brand-gold' : 'bg-slate-200 text-slate-600')}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- table --------------------------------- */
export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** value used for sorting */
  sort?: (row: T) => number | string;
  align?: 'start' | 'end' | 'center';
  className?: string;
}
export function DataTable<T>({ rows, columns, rowKey, onRowClick, pageSize = 12, empty, initialSort, dense }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; pageSize?: number; empty?: ReactNode; initialSort?: { key: string; dir: 'asc' | 'desc' }; dense?: boolean }) {
  const t = useTranslations('Erp.common');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    return [...rows].sort((a, b) => {
      const x = f(a);
      const y = f(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort!.dir === 'asc' ? c : -c;
    });
  }, [rows, sort, columns]);
  useEffect(() => setPage(1), [rows.length]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const view = sorted.slice((page - 1) * pageSize, page * pageSize);
  const al = (a?: string) => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start');
  if (!rows.length) return <>{empty ?? <EmptyState title={t('noData')} />}</>;
  return (
    <div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((c) => (
                <th key={c.key} className={cx('py-2.5 px-3 first:ps-0 last:pe-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap', al(c.align), c.className)}>
                  {c.sort ? (
                    <button className="inline-flex items-center gap-1 hover:text-brand-dark" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {c.header}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {view.map((r) => (
              <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx('group', onRowClick && 'cursor-pointer hover:bg-slate-50/80')}>
                {columns.map((c) => (
                  <td key={c.key} className={cx(dense ? 'py-2' : 'py-3', 'px-3 first:ps-0 last:pe-0 text-brand-dark/90 align-middle', al(c.align), c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-slate-100 text-xs text-slate-500">
          <span>{t('showing', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, sorted.length), total: sorted.length })}</span>
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label={t('prev')} className="rtl:rotate-180" disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
            <span className="px-2 font-semibold text-brand-dark tabular-nums">
              {page} / {pages}
            </span>
            <IconButton icon={ChevronRight} label={t('next')} className="rtl:rotate-180" disabled={page === pages} onClick={() => setPage((p) => p + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: ReactNode; description?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="py-12 flex flex-col items-center text-center">
      <span className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </span>
      <p className="font-semibold text-brand-dark">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------- overlays ------------------------------- */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={cx('relative w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] outline-none', w)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-brand-dark">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="close" onClick={onClose} />
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; message?: ReactNode; confirmLabel?: ReactNode; danger?: boolean }) {
  const t = useTranslations('Erp.common');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}>
            {confirmLabel ?? t('confirm')}
          </Button>
        </>
      }>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </Modal>
  );
}

/* ---------------------------------- misc ---------------------------------- */
export function ProductThumb({ src, alt = '', size = 'w-10 h-10' }: { src?: string; alt?: string; size?: string }) {
  return <span className={cx('shrink-0 rounded-xl bg-slate-50 ring-1 ring-slate-200/70 overflow-hidden inline-flex items-center justify-center', size)}>{src && <img src={src} alt={alt} loading="lazy" className="w-full h-full object-contain" />}</span>;
}

export function KeyValue({ items, cols = 2 }: { items: { label: ReactNode; value: ReactNode }[]; cols?: 1 | 2 | 3 | 4 }) {
  const c = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols];
  return (
    <dl className={cx('grid gap-x-6 gap-y-3', c)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className="text-sm font-medium text-brand-dark mt-0.5 break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Thin progress bar (e.g. stock vs reorder level, budget used). */
export function Progress({ value, max, tone = 'purple' }: { value: number; max: number; tone?: 'purple' | 'green' | 'amber' | 'red' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const c = { purple: 'from-brand-gold to-brand-goldLight', green: 'from-emerald-500 to-emerald-400', amber: 'from-amber-500 to-amber-400', red: 'from-rose-600 to-rose-500' }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={cx('h-full rounded-full bg-gradient-to-r', c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Downloads rows as CSV (UTF-8 with BOM so Excel shows Arabic correctly). */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a print window with the given HTML body (receipts, invoices, POs). */
export function printHtml(title: string, bodyHtml: string, dir: 'ltr' | 'rtl' = 'ltr') {
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) return;
  w.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Inter,'Segoe UI',Tahoma,Arial,sans-serif;color:#0B1F5C;margin:0;padding:24px;font-size:12px}
    h1{font-size:16px;margin:0} .muted{color:#64748b} table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{padding:6px 4px;text-align:start;border-bottom:1px solid #e2e8f0} th{font-size:10px;text-transform:uppercase;color:#64748b}
    .end{text-align:end} .tot td{border:none;padding:3px 4px} .grand td{font-weight:700;font-size:14px;border-top:2px solid #0B1F5C}
    .center{text-align:center} img.logo{height:48px} @media print{body{padding:0}}
  </style></head><body>${bodyHtml}<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}
