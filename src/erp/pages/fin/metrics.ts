/** Shared period + money calculations for the finance/overview/report pages. */
import { addDays, round2, saleCost, saleRevenueExVat, toDay } from '../../store';
import type { ErpData, ID, Sale, SaleReturn } from '../../types';

export type PeriodKey = 'today' | '7' | '30' | '90';
export interface Range {
  from: Date; // inclusive
  to: Date; // exclusive
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Current period + the equally long period right before it. */
export function periodRange(key: PeriodKey): { cur: Range; prev: Range; days: number } {
  const days = key === 'today' ? 1 : Number(key);
  const to = addDays(startOfDay(new Date()), 1);
  const from = addDays(to, -days);
  return { cur: { from, to }, prev: { from: addDays(from, -days), to: from }, days };
}

export type PLPeriod = 'thisMonth' | 'lastMonth' | 'quarter' | 'ytd' | 'last90';
export function plRange(key: PLPeriod): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const tomorrow = addDays(startOfDay(now), 1);
  switch (key) {
    case 'thisMonth':
      return { from: new Date(y, m, 1), to: tomorrow };
    case 'lastMonth':
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case 'quarter':
      return { from: new Date(y, Math.floor(m / 3) * 3, 1), to: tomorrow };
    case 'ytd':
      return { from: new Date(y, 0, 1), to: tomorrow };
    default:
      return { from: addDays(tomorrow, -90), to: tomorrow };
  }
}

export const inRange = (iso: string, r: Range) => {
  const t = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).getTime();
  return t >= r.from.getTime() && t < r.to.getTime();
};

export function salesIn(d: ErpData, r: Range, branchId?: ID): Sale[] {
  return d.sales.filter((s) => (!branchId || s.branchId === branchId) && inRange(s.createdAt, r));
}
export function returnsIn(d: ErpData, r: Range, branchId?: ID): SaleReturn[] {
  return d.returns.filter((s) => (!branchId || s.branchId === branchId) && inRange(s.createdAt, r));
}

export interface Summary {
  invoices: number;
  gross: number; // VAT-inclusive totals of sales
  refunds: number; // VAT-inclusive
  netSales: number; // gross − refunds (VAT incl.)
  revenue: number; // ex-VAT, before returns
  returnsExVat: number;
  netRevenue: number; // ex-VAT after returns
  cogs: number;
  grossProfit: number;
  margin: number; // %
  avgBasket: number;
  vatOut: number;
}

export function summarize(d: ErpData, r: Range, branchId?: ID): Summary {
  const sales = salesIn(d, r, branchId);
  const rets = returnsIn(d, r, branchId);
  const vatRate = d.settings.vatRate / 100;
  const gross = sales.reduce((t, s) => t + s.total, 0);
  const refunds = rets.reduce((t, x) => t + x.amount, 0);
  const revenue = sales.reduce((t, s) => t + saleRevenueExVat(s), 0);
  const returnsExVat = refunds / (1 + vatRate);
  const netRevenue = revenue - returnsExVat;
  const cogs = sales.reduce((t, s) => t + saleCost(s), 0);
  const grossProfit = netRevenue - cogs;
  return {
    invoices: sales.length,
    gross: round2(gross),
    refunds: round2(refunds),
    netSales: round2(gross - refunds),
    revenue: round2(revenue),
    returnsExVat: round2(returnsExVat),
    netRevenue: round2(netRevenue),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    margin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
    avgBasket: sales.length ? round2(gross / sales.length) : 0,
    vatOut: round2(sales.reduce((t, s) => t + s.vat, 0) - (refunds - returnsExVat))
  };
}

export const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

/** Per-day buckets of net sales between from (inclusive) and to (exclusive). */
export function dailySeries(d: ErpData, r: Range, branchId?: ID) {
  const days: string[] = [];
  for (let x = new Date(r.from); x < r.to; x = addDays(x, 1)) days.push(toDay(x));
  const idx = new Map(days.map((k, i) => [k, i]));
  const values = days.map(() => 0);
  const counts = days.map(() => 0);
  for (const s of d.sales) {
    if (branchId && s.branchId !== branchId) continue;
    const i = idx.get(toDay(new Date(s.createdAt)));
    if (i === undefined) continue;
    values[i] += s.total;
    counts[i]++;
  }
  for (const x of d.returns) {
    if (branchId && x.branchId !== branchId) continue;
    const i = idx.get(toDay(new Date(x.createdAt)));
    if (i !== undefined) values[i] -= x.amount;
  }
  return { days, values: values.map(round2), counts };
}

/** Hourly buckets (for the "today" view). */
export function hourlySeries(d: ErpData, r: Range, branchId?: ID) {
  const values = Array.from({ length: 24 }, () => 0);
  for (const s of salesIn(d, r, branchId)) values[new Date(s.createdAt).getHours()] += s.total;
  return values.map(round2);
}

/** Months (first day) ending with the current month. */
export function lastMonths(n: number): Date[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
}
export const monthRange = (m: Date): Range => ({ from: m, to: new Date(m.getFullYear(), m.getMonth() + 1, 1) });

export function expensesIn(d: ErpData, r: Range, branchId?: ID) {
  return d.expenses.filter((e) => (!branchId || e.branchId === branchId) && inRange(e.date, r));
}

/** Input VAT on supplier invoices in range (invoice amounts include 5% VAT). */
export function vatIn(d: ErpData, r: Range, branchId?: ID) {
  const rate = d.settings.vatRate / 100;
  const poBranch = new Map(d.purchaseOrders.map((p) => [p._id, p.branchId]));
  return round2(
    d.supplierInvoices
      .filter((i) => inRange(i.createdAt, r) && (!branchId || (i.poId && poBranch.get(i.poId) === branchId)))
      .reduce((t, i) => t + (i.amount - i.amount / (1 + rate)), 0)
  );
}

export const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
