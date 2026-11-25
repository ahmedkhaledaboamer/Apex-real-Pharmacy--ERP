import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, Boxes, Download, PackageX, ShieldCheck } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useFmt, useName } from '../../hooks';
import { addDays, round2, stockOf, today } from '../../store';
import { BarChart, CHART_COLORS, RankBars } from '../../ui/charts';
import { Badge, Button, Card, CardHeader, DataTable, PageHeader, ProductThumb, Select, Tabs, Toolbar, downloadCsv, type Column } from '../../ui/kit';
import { periodRange, plRange, salesIn, type Range } from './metrics';
import { KpiTile } from './parts';

type Tab = 'product' | 'category' | 'branch' | 'employee' | 'hour' | 'valuation' | 'slow' | 'insurance';
type RangeKey = '7' | '30' | '90' | 'thisMonth' | 'ytd';
const rangeOf = (k: RangeKey): Range => (k === 'thisMonth' || k === 'ytd' ? plRange(k) : periodRange(k).cur);

interface Agg {
  key: string;
  label: string;
  thumb?: string;
  color?: string;
  units: number;
  revenue: number;
  cost: number;
  invoices: number;
}

export default function ReportsPage() {
  const t = useTranslations('ErpFin.reports');
  const tc = useTranslations('Erp.common');
  const tr = useTranslations('Erp.roles');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { products, productMap, categories, branches, meta } = useCatalog();
  const [tab, setTab] = useState<Tab>('product');
  const [rk, setRk] = useState<RangeKey>('30');
  const [idle, setIdle] = useState(30);
  const short = (s: string) => s.replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '');

  const sales = useMemo(() => salesIn(d, rangeOf(rk)), [d, rk]);

  /** Aggregates sold lines by a key (net of returns, ex-VAT, invoice discount spread). */
  const agg = useMemo(() => {
    const by = (keyOf: (s: (typeof sales)[number], productId: string) => string, labelOf: (k: string) => Partial<Agg>) => {
      const m = new Map<string, Agg & { inv: Set<string> }>();
      for (const s of sales) {
        const ratio = s.subtotal > 0 ? (s.subtotal - s.discount) / s.subtotal : 1;
        for (const it of s.items) {
          const q = it.qty - it.returnedQty;
          if (q <= 0) continue;
          const k = keyOf(s, it.productId);
          let a = m.get(k);
          if (!a) {
            a = { key: k, label: k, units: 0, revenue: 0, cost: 0, invoices: 0, inv: new Set(), ...labelOf(k) };
            m.set(k, a);
          }
          a.units += q;
          a.revenue += (it.price * q - (it.discount * q) / it.qty) * ratio;
          a.cost += it.cost * q;
          a.inv.add(s._id);
        }
      }
      return [...m.values()].map(({ inv, ...a }) => ({ ...a, revenue: round2(a.revenue), cost: round2(a.cost), invoices: inv.size })).sort((x, y) => y.revenue - x.revenue);
    };
    const catMap = new Map(categories.map((c) => [c._id, c]));
    const empMap = new Map(d.employees.map((e) => [e._id, e]));
    return {
      product: by((_, p) => p, (k) => ({ label: name(productMap.get(k)), thumb: productMap.get(k)?.imageCover })),
      category: by((_, p) => productMap.get(p)?.category ?? 'other', (k) => ({ label: name(catMap.get(k)) || '—', color: catMap.get(k)?.color })),
      branch: by((s) => s.branchId, (k) => ({ label: short(name(branches.find((b) => b._id === k))) })),
      employee: by((s) => s.employeeId ?? '-', (k) => ({ label: empMap.get(k)?.name ?? '—', thumb: undefined, color: empMap.get(k) ? tr(empMap.get(k)!.role) : '' }))
    };
  }, [sales, productMap, categories, branches, d.employees, name, tr]);

  const hourly = useMemo(() => {
    const rev = Array.from({ length: 24 }, () => 0);
    const cnt = Array.from({ length: 24 }, () => 0);
    for (const s of sales) {
      const h = new Date(s.createdAt).getHours();
      rev[h] += s.subtotal - s.discount;
      cnt[h]++;
    }
    return rev.map((r, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00`, revenue: round2(r), invoices: cnt[h], units: 0, cost: 0 })).filter((x) => x.invoices > 0 || (Number(x.key) >= 8 && Number(x.key) <= 23));
  }, [sales]);

  const valuation = useMemo(() => {
    const t0 = today();
    const m = new Map<string, { key: string; label: string; color?: string; units: number; costValue: number; retailValue: number }>();
    for (const b of d.batches) {
      if (b.qty <= 0 || b.expiry < t0) continue;
      const p = productMap.get(b.productId);
      if (!p) continue;
      const c = categories.find((x) => x._id === p.category);
      const k = c?._id ?? 'other';
      const a = m.get(k) ?? { key: k, label: name(c) || '—', color: c?.color, units: 0, costValue: 0, retailValue: 0 };
      a.units += b.qty;
      a.costValue += b.cost * b.qty;
      a.retailValue += (p.priceAfterDiscount ?? p.price) * b.qty;
      m.set(k, a);
    }
    return [...m.values()].map((a) => ({ ...a, costValue: round2(a.costValue), retailValue: round2(a.retailValue) })).sort((x, y) => y.retailValue - x.retailValue);
  }, [d.batches, productMap, categories, name]);

  const slow = useMemo(() => {
    const last = new Map<string, string>();
    for (const s of d.sales) for (const it of s.items) if ((last.get(it.productId) ?? '') < s.createdAt) last.set(it.productId, s.createdAt);
    const cutoff = addDays(new Date(), -idle).toISOString();
    return products
      .map((p) => {
        const onHand = stockOf(d, p._id);
        const ls = last.get(p._id);
        return { p, onHand, lastSale: ls, days: ls ? Math.floor((Date.now() - new Date(ls).getTime()) / 86400000) : Infinity, value: round2(onHand * (meta[p._id]?.cost ?? 0)) };
      })
      .filter((x) => x.onHand > 0 && (!x.lastSale || x.lastSale < cutoff))
      .sort((a, b) => b.days - a.days);
  }, [d, products, meta, idle]);

  const insurance = useMemo(() => {
    const r = rangeOf(rk);
    return d.insurers.map((ins) => {
      const cl = d.claims.filter((c) => c.companyId === ins._id && new Date(c.createdAt) >= r.from && new Date(c.createdAt) < r.to);
      const sum = (f: (c: (typeof cl)[number]) => boolean) => round2(cl.filter(f).reduce((s, c) => s + c.amount, 0));
      return { ins, count: cl.length, claimed: sum(() => true), ok: sum((c) => c.status === 'approved' || c.status === 'paid'), rejected: sum((c) => c.status === 'rejected'), outstanding: sum((c) => c.status === 'pending' || c.status === 'submitted') };
    });
  }, [d, rk]);

  /* ------------------------------ renderers ------------------------------ */
  const totalRev = (rows: { revenue: number }[]) => rows.reduce((s, r) => s + r.revenue, 0) || 1;
  const aggCols = (first: ReactNode, rows: Agg[], withUnits = true, sub?: (r: Agg) => ReactNode): Column<Agg>[] => [
    {
      key: 'label',
      header: first,
      sort: (r) => r.label,
      cell: (r) => (
        <span className="flex items-center gap-3 min-w-0">
          {r.thumb !== undefined && <ProductThumb src={r.thumb} />}
          {r.thumb === undefined && r.color?.startsWith('#') && <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} />}
          <span className="min-w-0">
            <span className="block font-medium truncate max-w-[280px]">{r.label}</span>
            {sub?.(r)}
          </span>
        </span>
      )
    },
    ...(withUnits ? [{ key: 'units', header: t('units'), align: 'end' as const, sort: (r: Agg) => r.units, cell: (r: Agg) => <span className="tabular-nums">{fmt.int(r.units)}</span> }] : []),
    { key: 'inv', header: t('invoices'), align: 'end', sort: (r) => r.invoices, cell: (r) => <span className="tabular-nums">{fmt.int(r.invoices)}</span> },
    { key: 'rev', header: t('revenue'), align: 'end', sort: (r) => r.revenue, cell: (r) => <span className="tabular-nums font-semibold">{fmt.money(r.revenue)}</span> },
    { key: 'gp', header: t('profit'), align: 'end', sort: (r) => r.revenue - r.cost, cell: (r) => <span className="tabular-nums">{fmt.money(r.revenue - r.cost)}</span> },
    { key: 'mg', header: t('margin'), align: 'end', sort: (r) => (r.revenue ? (r.revenue - r.cost) / r.revenue : 0), cell: (r) => <span className="tabular-nums text-slate-600">{fmt.pct(r.revenue ? ((r.revenue - r.cost) / r.revenue) * 100 : 0)}</span> },
    { key: 'sh', header: t('share'), align: 'end', sort: (r) => r.revenue, cell: (r) => <span className="tabular-nums text-slate-500">{fmt.pct((r.revenue / totalRev(rows)) * 100)}</span> }
  ];
  const aggCsv = (file: string, first: string, rows: Agg[]) => downloadCsv(file, [first, t('units'), t('invoices'), t('revenue'), t('profit')], rows.map((r) => [r.label, r.units, r.invoices, r.revenue, round2(r.revenue - r.cost)]));

  let body: ReactNode = null;
  let exportFn: (() => void) | null = null;
  if (tab === 'product' || tab === 'category' || tab === 'branch' || tab === 'employee') {
    const rows = agg[tab];
    const first = tab === 'product' ? tc('product') : tab === 'category' ? tc('category') : tab === 'branch' ? tc('branch') : t('byEmployee');
    exportFn = () => aggCsv(`sales-by-${tab}.csv`, first, rows);
    body = (
      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-4">
        <Card className="2xl:col-span-2">
          <CardHeader title={tab === 'product' ? `${t('revenue')} · ${t('top15')}` : t('revenue')} />
          {tab === 'branch' ? (
            <BarChart
              labels={rows.map((r) => r.label)}
              series={[
                { name: t('revenue'), values: rows.map((r) => r.revenue) },
                { name: t('profit'), values: rows.map((r) => round2(r.revenue - r.cost)) }
              ]}
              format={fmt.compact}
              height={280}
            />
          ) : (
            <RankBars items={rows.slice(0, tab === 'product' ? 15 : 10).map((r) => ({ label: r.label, value: r.revenue, icon: r.color?.startsWith('#') ? <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} /> : undefined }))} format={fmt.compact} />
          )}
        </Card>
        <Card className="2xl:col-span-3">
          <DataTable rows={rows} columns={aggCols(first, rows, tab !== 'branch', tab === 'employee' ? (r) => <span className="block text-xs text-slate-500">{r.color}</span> : undefined)} rowKey={(r) => r.key} initialSort={{ key: 'rev', dir: 'desc' }} />
        </Card>
      </div>
    );
  } else if (tab === 'hour') {
    exportFn = () => downloadCsv('sales-by-hour.csv', [t('hour'), t('invoices'), t('revenue')], hourly.map((h) => [h.label, h.invoices, h.revenue]));
    body = (
      <Card>
        <CardHeader title={t('byHour')} subtitle={t('revenue')} />
        <BarChart labels={hourly.map((h) => h.label)} series={[{ name: t('revenue'), values: hourly.map((h) => h.revenue) }]} format={fmt.compact} height={300} />
        <div className="mt-6">
          <DataTable
            rows={hourly}
            rowKey={(h) => h.key}
            pageSize={24}
            dense
            columns={[
              { key: 'h', header: t('hour'), cell: (h) => <span className="tabular-nums font-medium" dir="ltr">{h.label}</span> },
              { key: 'i', header: t('invoices'), align: 'end', sort: (h) => h.invoices, cell: (h) => <span className="tabular-nums">{fmt.int(h.invoices)}</span> },
              { key: 'r', header: t('revenue'), align: 'end', sort: (h) => h.revenue, cell: (h) => <span className="tabular-nums font-semibold">{fmt.money(h.revenue)}</span> },
              { key: 'a', header: t('avgBasket'), align: 'end', cell: (h) => <span className="tabular-nums text-slate-600">{fmt.money(h.invoices ? h.revenue / h.invoices : 0)}</span> }
            ]}
          />
        </div>
      </Card>
    );
  } else if (tab === 'valuation') {
    const cost = round2(valuation.reduce((s, v) => s + v.costValue, 0));
    const retail = round2(valuation.reduce((s, v) => s + v.retailValue, 0));
    exportFn = () => downloadCsv('inventory-valuation.csv', [tc('category'), t('units'), t('costValue'), t('retailValue')], valuation.map((v) => [v.label, v.units, v.costValue, v.retailValue]));
    body = (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <KpiTile label={t('costValue')} value={fmt.money(cost)} icon={Boxes} tone="blue" />
          <KpiTile label={t('retailValue')} value={fmt.money(retail)} icon={Boxes} tone="purple" />
          <KpiTile label={t('potential')} value={fmt.money(retail - cost)} icon={BarChart3} hint={fmt.pct(retail ? ((retail - cost) / retail) * 100 : 0)} tone="teal" />
        </div>
        <div className="grid grid-cols-1 2xl:grid-cols-5 gap-4">
          <Card className="2xl:col-span-2">
            <CardHeader title={t('valuation')} />
            <BarChart
              labels={valuation.map((v) => v.label)}
              series={[
                { name: t('costValue'), values: valuation.map((v) => v.costValue), color: CHART_COLORS[1] },
                { name: t('retailValue'), values: valuation.map((v) => v.retailValue), color: CHART_COLORS[0] }
              ]}
              format={fmt.compact}
              height={300}
            />
          </Card>
          <Card className="2xl:col-span-3">
            <DataTable
              rows={valuation}
              rowKey={(v) => v.key}
              initialSort={{ key: 'r', dir: 'desc' }}
              columns={[
                { key: 'l', header: tc('category'), cell: (v) => <span className="inline-flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color ?? '#94A3B8' }} />{v.label}</span> },
                { key: 'u', header: t('units'), align: 'end', sort: (v) => v.units, cell: (v) => <span className="tabular-nums">{fmt.int(v.units)}</span> },
                { key: 'c', header: t('costValue'), align: 'end', sort: (v) => v.costValue, cell: (v) => <span className="tabular-nums">{fmt.money(v.costValue)}</span> },
                { key: 'r', header: t('retailValue'), align: 'end', sort: (v) => v.retailValue, cell: (v) => <span className="tabular-nums font-semibold">{fmt.money(v.retailValue)}</span> },
                { key: 'p', header: t('potential'), align: 'end', sort: (v) => v.retailValue - v.costValue, cell: (v) => <span className="tabular-nums text-emerald-700">{fmt.money(v.retailValue - v.costValue)}</span> }
              ]}
            />
          </Card>
        </div>
      </>
    );
  } else if (tab === 'slow') {
    exportFn = () => downloadCsv('slow-movers.csv', [tc('product'), t('onHand'), t('lastSale'), t('costValue')], slow.map((s) => [name(s.p), s.onHand, s.lastSale ? s.lastSale.slice(0, 10) : '', s.value]));
    body = (
      <Card>
        <Toolbar>
          <span className="text-sm text-slate-600">{t('idleFor')}</span>
          <Select value={String(idle)} onChange={(e) => setIdle(Number(e.target.value))} className="!w-32">
            {[14, 30, 60, 90].map((n) => (
              <option key={n} value={n}>
                {tc('days', { n })}
              </option>
            ))}
          </Select>
          <Badge tone={slow.length ? 'amber' : 'green'} className="ms-auto">
            {tc('items', { n: slow.length })}
          </Badge>
        </Toolbar>
        <DataTable
          rows={slow}
          rowKey={(s) => s.p._id}
          empty={<div className="py-10 text-center text-sm text-slate-500"><PackageX className="w-6 h-6 mx-auto mb-2 text-slate-300" />{tc('noData')}</div>}
          columns={[
            { key: 'p', header: tc('product'), cell: (s) => <span className="flex items-center gap-3"><ProductThumb src={s.p.imageCover} /><span className="font-medium truncate max-w-[300px]">{name(s.p)}</span></span> },
            { key: 'o', header: t('onHand'), align: 'end', sort: (s) => s.onHand, cell: (s) => <span className="tabular-nums">{fmt.int(s.onHand)}</span> },
            { key: 'l', header: t('lastSale'), sort: (s) => s.lastSale ?? '', cell: (s) => (s.lastSale ? fmt.date(s.lastSale) : <Badge tone="red">{t('never')}</Badge>) },
            { key: 'd', header: t('daysIdle'), align: 'end', sort: (s) => (Number.isFinite(s.days) ? s.days : 99999), cell: (s) => <span className="tabular-nums">{Number.isFinite(s.days) ? fmt.int(s.days) : '∞'}</span> },
            { key: 'v', header: t('costValue'), align: 'end', sort: (s) => s.value, cell: (s) => <span className="tabular-nums font-semibold">{fmt.money(s.value)}</span> }
          ]}
        />
      </Card>
    );
  } else {
    exportFn = () => downloadCsv('insurance-summary.csv', [t('insurer'), t('claims'), t('claimed'), t('approvedPaid'), t('rejected'), t('outstanding')], insurance.map((r) => [r.ins.name, r.count, r.claimed, r.ok, r.rejected, r.outstanding]));
    body = (
      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-4">
        <Card className="2xl:col-span-2">
          <CardHeader title={t('insurance')} icon={ShieldCheck} />
          <BarChart
            labels={insurance.map((r) => name(r.ins))}
            stacked
            series={[
              { name: t('approvedPaid'), values: insurance.map((r) => r.ok), color: CHART_COLORS[2] },
              { name: t('outstanding'), values: insurance.map((r) => r.outstanding), color: CHART_COLORS[1] },
              { name: t('rejected'), values: insurance.map((r) => r.rejected), color: CHART_COLORS[4] }
            ]}
            format={fmt.compact}
            height={280}
          />
        </Card>
        <Card className="2xl:col-span-3">
          <DataTable
            rows={insurance}
            rowKey={(r) => r.ins._id}
            columns={[
              { key: 'n', header: tc('name'), cell: (r) => <span className="font-medium">{name(r.ins)}</span> },
              { key: 'cv', header: t('coverage'), align: 'end', cell: (r) => <span className="tabular-nums">{fmt.pct(r.ins.coveragePct)}</span> },
              { key: 'c', header: t('claims'), align: 'end', sort: (r) => r.count, cell: (r) => <span className="tabular-nums">{fmt.int(r.count)}</span> },
              { key: 'a', header: t('claimed'), align: 'end', sort: (r) => r.claimed, cell: (r) => <span className="tabular-nums font-semibold">{fmt.money(r.claimed)}</span> },
              { key: 'o', header: t('approvedPaid'), align: 'end', cell: (r) => <span className="tabular-nums text-emerald-700">{fmt.money(r.ok)}</span> },
              { key: 'p', header: t('outstanding'), align: 'end', cell: (r) => <span className="tabular-nums text-blue-700">{fmt.money(r.outstanding)}</span> },
              { key: 'r', header: t('rejected'), align: 'end', cell: (r) => <span className="tabular-nums text-rose-600">{fmt.money(r.rejected)}</span> }
            ]}
          />
        </Card>
      </div>
    );
  }

  const rangeless = tab === 'valuation' || tab === 'slow';
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={BarChart3}
        actions={
          exportFn && (
            <Button icon={Download} onClick={exportFn}>
              {tc('export')}
            </Button>
          )
        }
      />
      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'product', label: t('byProduct') },
            { value: 'category', label: t('byCategory') },
            { value: 'branch', label: t('byBranch') },
            { value: 'employee', label: t('byEmployee') },
            { value: 'hour', label: t('byHour') },
            { value: 'valuation', label: t('valuation') },
            { value: 'slow', label: t('slow') },
            { value: 'insurance', label: t('insurance') }
          ]}
        />
        {!rangeless && (
          <Select value={rk} onChange={(e) => setRk(e.target.value as RangeKey)} className="!w-44 ms-auto" aria-label={t('range')}>
            <option value="7">{tc('last7')}</option>
            <option value="30">{tc('last30')}</option>
            <option value="90">{tc('last90')}</option>
            <option value="thisMonth">{tc('thisMonth')}</option>
            <option value="ytd">{t('ytd')}</option>
          </Select>
        )}
      </Toolbar>
      {body}
    </>
  );
}
