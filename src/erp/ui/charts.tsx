/**
 * Lightweight SVG charts for the ERP (no chart library).
 * Palette validated with the dataviz validator (light surface): fixed order,
 * never cycled — max 5 series; extra categories fold into "Other".
 * Thin marks, 2px lines, rounded data-ends, recessive grid, hover tooltips,
 * legend whenever there are 2+ series.
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from './kit';

export const CHART_COLORS = ['#7A1FB8', '#0672DF', '#13A89E', '#E8890C', '#D6457F'] as const;
const GRID = '#E2E8F0';
const AXIS_TEXT = '#64748B';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function Legend({ items }: { items: { label: ReactNode; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-brand-dark text-white text-xs px-3 py-2 shadow-xl whitespace-nowrap" style={{ left, top: y - 10 }}>
      {children}
    </div>
  );
}

/* ------------------------------ line / area ------------------------------ */
export interface Series {
  name: string;
  values: number[];
  color?: string;
}
export function LineChart({ labels, series, height = 260, format = (n: number) => String(n), area = true, labelEvery }: { labels: string[]; series: Series[]; height?: number; format?: (n: number) => string; area?: boolean; labelEvery?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { t: 12, r: 12, b: 28, l: 52 };
  const W = width;
  const H = height;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = labelEvery ?? Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div ref={ref} className="relative w-full select-none" dir="ltr">
      {colored.length > 1 && (
        <div className="mb-3">
          <Legend items={colored.map((s) => ({ label: s.name, color: s.color }))} />
        </div>
      )}
      <svg
        width={W}
        height={H}
        className="block overflow-visible"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = e.clientX - r.left;
          const i = Math.round(((px - pad.l) / iw) * (n - 1));
          setHover(i >= 0 && i < n ? i : null);
        }}
        style={{ direction: 'ltr' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
              {l}
            </text>
          ) : null
        )}
        <defs>
          {colored.map((s, si) => (
            <linearGradient key={si} id={`area-${si}-${s.color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {colored.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <g key={si}>
              {area && colored.length === 1 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`} fill={`url(#area-${si}-${s.color.slice(1)})`} />}
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#94A3B8" strokeDasharray="3 3" />
            {colored.map((s, si) => (
              <circle key={si} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={Math.min(...colored.map((s) => y(s.values[hover] ?? 0))) + (colored.length > 1 ? 24 : 0)} width={W}>
          <div className="font-semibold mb-0.5">{labels[hover]}</div>
          {colored.map((s, si) => (
            <div key={si} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
              {colored.length > 1 && <span className="text-white/70">{s.name}</span>}
              <span className="font-semibold tabular-nums ms-auto">{format(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ---------------------------------- bars ---------------------------------- */
export function BarChart({ labels, series, height = 260, format = (n: number) => String(n), stacked = false }: { labels: string[]; series: Series[]; height?: number; format?: (n: number) => string; stacked?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { t: 12, r: 8, b: 28, l: 52 };
  const W = width;
  const H = height;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }));
  const totals = labels.map((_, i) => (stacked ? colored.reduce((t, s) => t + (s.values[i] ?? 0), 0) : Math.max(...colored.map((s) => s.values[i] ?? 0))));
  const max = niceMax(Math.max(0, ...totals));
  const n = labels.length;
  const band = iw / Math.max(1, n);
  const groupW = Math.min(band * 0.7, stacked ? 36 : 18 * colored.length + 4);
  const barW = stacked ? groupW : Math.max(4, (groupW - 2 * (colored.length - 1)) / colored.length);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 60))));
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const bx = (i: number) => (rtl ? W - pad.r - band * (i + 1) : pad.l + band * i);
  const rounded = (x: number, yTop: number, w: number, h: number) => {
    const r = Math.min(4, w / 2, h);
    return `M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + w - r} Q${x + w},${yTop} ${x + w},${yTop + r} V${yTop + h} Z`;
  };
  return (
    <div ref={ref} className="relative w-full select-none">
      {colored.length > 1 && (
        <div className="mb-3">
          <Legend items={colored.map((s) => ({ label: s.name, color: s.color }))} />
        </div>
      )}
      <svg width={W} height={H} className="block" onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={rtl ? pad.r : pad.l} x2={rtl ? W - pad.l : W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={rtl ? W - pad.l + 8 : pad.l - 8} y={y(t)} dy="0.32em" textAnchor={rtl ? 'start' : 'end'} fontSize="11" fill={AXIS_TEXT}>
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => {
          const gx = bx(i) + (band - groupW) / 2;
          let acc = 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={bx(i)} y={pad.t} width={band} height={ih} fill={hover === i ? '#F1F5F9' : 'transparent'} rx={6} />
              {colored.map((s, si) => {
                const v = s.values[i] ?? 0;
                if (v <= 0) return null;
                if (stacked) {
                  const top = y(acc + v);
                  const h = y(acc) - top - (acc > 0 ? 2 : 0);
                  acc += v;
                  return <path key={si} d={rounded(gx, top, groupW, Math.max(1, h))} fill={s.color} />;
                }
                const xx = gx + si * (barW + 2);
                return <path key={si} d={rounded(xx, y(v), barW, Math.max(1, y(0) - y(v)))} fill={s.color} />;
              })}
              {(i % every === 0) && (
                <text x={bx(i) + band / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
                  {l}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={bx(hover) + band / 2} y={y(totals[hover]) + (colored.length > 1 ? 24 : 0)} width={W}>
          <div className="font-semibold mb-0.5">{labels[hover]}</div>
          {colored.map((s, si) => (
            <div key={si} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
              {colored.length > 1 && <span className="text-white/70">{s.name}</span>}
              <span className="font-semibold tabular-nums ms-auto">{format(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ---------------------------------- donut --------------------------------- */
export function Donut({ data, format = (n: number) => String(n), centerLabel, size = 180 }: { data: { label: string; value: number; color?: string }[]; format?: (n: number) => string; centerLabel?: ReactNode; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const items = useMemo(() => {
    const sorted = [...data].filter((d) => d.value > 0);
    return sorted.map((d, i) => ({ ...d, color: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }));
  }, [data]);
  const total = items.reduce((t, d) => t + d.value, 0);
  const R = size / 2;
  const r = R * 0.68;
  let a0 = -Math.PI / 2;
  const gap = items.length > 1 ? 0.025 : 0;
  const arcs = items.map((d) => {
    const a = (d.value / (total || 1)) * Math.PI * 2;
    const s = a0 + gap / 2;
    const e = a0 + a - gap / 2;
    a0 += a;
    const large = e - s > Math.PI ? 1 : 0;
    const p = (ang: number, rad: number) => `${R + rad * Math.cos(ang)},${R + rad * Math.sin(ang)}`;
    return { d: `M${p(s, R)} A${R},${R} 0 ${large} 1 ${p(e, R)} L${p(e, r)} A${r},${r} 0 ${large} 0 ${p(s, r)} Z`, ...d };
  });
  const h = hover !== null ? items[hover] : null;
  return (
    <div className="flex flex-col items-center gap-5 @container">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} onMouseLeave={() => setHover(null)}>
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color} opacity={hover === null || hover === i ? 1 : 0.35} onMouseEnter={() => setHover(i)} className="transition-opacity" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[11px] text-slate-500">{h ? h.label : centerLabel}</span>
          <span className="text-lg font-bold text-brand-dark tabular-nums">{format(h ? h.value : total)}</span>
          {h && <span className="text-[11px] text-slate-500">{Math.round((h.value / (total || 1)) * 100)}%</span>}
        </div>
      </div>
      <ul className="w-full space-y-2">
        {items.map((d, i) => (
          <li key={i} className={cx('flex items-center gap-2 text-sm rounded-lg px-2 py-1', hover === i && 'bg-slate-50')} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: d.color }} />
            <span className="text-slate-600 truncate">{d.label}</span>
            <span className="ms-auto font-semibold text-brand-dark tabular-nums">{format(d.value)}</span>
            <span className="w-10 text-end text-xs text-slate-400 tabular-nums">{Math.round((d.value / (total || 1)) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- ranked horizontal bars ------------------------- */
export function RankBars({ items, format = (n: number) => String(n), color = CHART_COLORS[0] }: { items: { label: ReactNode; value: number; sub?: ReactNode; icon?: ReactNode }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          {it.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm text-brand-dark truncate">{it.label}</span>
              <span className="text-sm font-semibold text-brand-dark tabular-nums shrink-0">{format(it.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: color }} />
            </div>
            {it.sub && <div className="text-[11px] text-slate-400 mt-0.5">{it.sub}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny inline trend line for stat tiles. */
export function Sparkline({ values, color = CHART_COLORS[0], width = 96, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const pts = values.map((v, i) => `${(i * width) / Math.max(1, values.length - 1)},${height - ((v - min) / (max - min || 1)) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={width} height={height} className="block" style={{ direction: 'ltr' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
