import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bell, Building2, ClipboardCheck, Coins, LayoutDashboard, PackagePlus, Receipt, ShoppingBasket, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { useTranslations } from '../../../lib/i18n';
import { useAlerts } from '../../alerts';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { addDays, round2 } from '../../store';
import { BarChart, CHART_COLORS, Donut, LineChart } from '../../ui/charts';
import { Card, CardHeader, EmptyState, ProductThumb, StatusBadge, cx } from '../../ui/kit';
import { dailySeries, delta, hourlySeries, periodRange, salesIn, summarize, type PeriodKey } from './metrics';
import { KpiTile } from './parts';

export default function OverviewPage() {
  const t = useTranslations('ErpFin.overview');
  const tc = useTranslations('Erp.common');
  const tl = useTranslations('Erp.layout');
  const fmt = useFmt();
  const name = useName();
  const navigate = useNavigate();
  const { user } = useAuth();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { productMap, categories, branches } = useCatalog();
  const alerts = useAlerts();
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [scope, setScope] = useState<'branch' | 'all'>('branch');
  const bId = scope === 'branch' ? branch?._id : undefined;

  const m = useMemo(() => {
    const { cur, prev, days } = periodRange(period);
    const now = summarize(d, cur, bId);
    const before = summarize(d, prev, bId);
    const curSeries = dailySeries(d, cur, bId);
    const prevSeries = dailySeries(d, prev, bId);
    // spark: last 14 days ending today regardless of period, for visual context
    const sparkRange = periodRange('30').cur;
    const spark = dailySeries(d, { from: addDays(sparkRange.to, -14), to: sparkRange.to }, bId);
    const sales = salesIn(d, cur, bId);

    const pay = { cash: 0, card: 0, insurance: 0 };
    const cat = new Map<string, number>();
    const prod = new Map<string, number>();
    const perBranch = new Map<string, number>();
    for (const s of sales) {
      for (const p of s.payments) pay[p.method] += p.amount;
      perBranch.set(s.branchId, (perBranch.get(s.branchId) ?? 0) + s.total);
      const ratio = s.subtotal > 0 ? (s.subtotal - s.discount) / s.subtotal : 1;
      for (const it of s.items) {
        const q = it.qty - it.returnedQty;
        if (q <= 0) continue;
        prod.set(it.productId, (prod.get(it.productId) ?? 0) + q);
        const c = productMap.get(it.productId)?.category ?? 'other';
        cat.set(c, (cat.get(c) ?? 0) + (it.price * q - (it.discount * q) / it.qty) * ratio);
      }
    }
    const byCat = [...cat.entries()].map(([id, v]) => ({ id, value: round2(v) })).sort((a, b) => b.value - a.value);
    const top = [...prod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const recent = [...d.sales].filter((s) => !bId || s.branchId === bId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);
    return { days, now, before, curSeries, prevSeries, spark, pay, byCat, top, recent, perBranch, hourly: period === 'today' ? hourlySeries(d, cur, bId) : null };
  }, [d, period, bId, productMap]);

  const hour = new Date().getHours();
  const first = (user?.name ?? '').replace(/^Dr\.\s*/, '').split(' ')[0];
  const greet = hour < 12 ? t('morning', { name: first }) : hour < 18 ? t('afternoon', { name: first }) : t('evening', { name: first });
  const branchName = name(branch).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '');
  const catById = new Map(categories.map((c) => [c._id, c]));
  const maxCat = Math.max(1, ...m.byCat.map((c) => c.value));
  const labels = m.curSeries.days.map((x) => fmt.dateShort(x));

  const quick = [
    { to: '/erp/pos', icon: ShoppingCart, title: t('qNewSale'), sub: t('qNewSaleSub'), cls: 'from-brand-gold to-brand-goldLight text-white' },
    { to: '/erp/purchase-orders', icon: PackagePlus, title: t('qReceive'), sub: t('qReceiveSub'), cls: 'from-teal-500 to-teal-600 text-white' },
    { to: '/erp/expenses?new=1', icon: Wallet, title: t('qExpense'), sub: t('qExpenseSub'), cls: 'from-amber-500 to-orange-500 text-white' },
    { to: '/erp/stock-counts', icon: ClipboardCheck, title: t('qCount'), sub: t('qCountSub'), cls: 'from-slate-700 to-brand-dark text-white' }
  ];

  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(130%_140%_at_0%_0%,#7A1FB8_0%,#3B2BB8_45%,#0672DF_100%)] text-white p-6 sm:p-8">
        <div className="absolute -top-24 -end-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <svg viewBox="0 0 200 100" className="absolute -end-10 -bottom-6 w-[420px] opacity-[0.12]" aria-hidden="true">
          <path d="M100 50c-18-24-52-24-52 0s34 24 52 0 52-24 52 0-34 24-52 0z" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-white/70 text-sm flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {fmt.date(new Date())}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">{greet}</h1>
            <p className="mt-1 text-white/75">{scope === 'all' ? t('subtitleAll') : t('subtitle', { branch: branchName })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-white/15 backdrop-blur gap-1">
              {(['today', '7', '30', '90'] as PeriodKey[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={cx('px-3 h-8 rounded-lg text-xs font-semibold transition', period === p ? 'bg-white text-brand-dark shadow' : 'text-white/80 hover:text-white')}>
                  {t(p === 'today' ? 'periodToday' : `period${p}`)}
                </button>
              ))}
            </div>
            <div className="inline-flex p-1 rounded-xl bg-white/15 backdrop-blur gap-1">
              {(['branch', 'all'] as const).map((s) => (
                <button key={s} onClick={() => setScope(s)} className={cx('px-3 h-8 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5', scope === s ? 'bg-white text-brand-dark shadow' : 'text-white/80 hover:text-white')}>
                  <Building2 className="w-3.5 h-3.5" />
                  {s === 'branch' ? t('scopeBranch') : t('scopeAll')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile label={t('netSales')} value={fmt.money(m.now.netSales)} icon={Coins} delta={delta(m.now.netSales, m.before.netSales)} spark={m.spark.values} tone="purple" />
        <KpiTile label={t('invoices')} value={fmt.int(m.now.invoices)} icon={Receipt} delta={delta(m.now.invoices, m.before.invoices)} spark={m.spark.counts} tone="blue" />
        <KpiTile label={t('avgBasket')} value={fmt.money(m.now.avgBasket)} icon={ShoppingBasket} delta={delta(m.now.avgBasket, m.before.avgBasket)} hint={tc('vsPrev')} tone="teal" />
        <KpiTile label={t('grossProfit')} value={fmt.money(m.now.grossProfit)} icon={TrendingUp} delta={delta(m.now.grossProfit, m.before.grossProfit)} hint={t('marginHint', { pct: fmt.pct(m.now.margin) })} tone="amber" />
      </div>

      {/* trend + payment mix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title={m.hourly ? t('salesTrendToday') : t('salesTrend')} subtitle={m.hourly ? undefined : t('salesTrendSub')} icon={TrendingUp} />
          {m.hourly ? (
            <BarChart labels={m.hourly.map((_, h) => `${h}:00`)} series={[{ name: t('netSales'), values: m.hourly }]} format={fmt.compact} height={280} />
          ) : (
            <LineChart
              labels={labels}
              series={[
                { name: t('current'), values: m.curSeries.values, color: CHART_COLORS[0] },
                { name: t('previous'), values: m.prevSeries.values, color: '#94A3B8' }
              ]}
              format={fmt.compact}
              height={280}
            />
          )}
        </Card>
        <Card>
          <CardHeader title={t('paymentMix')} subtitle={t('paymentMixSub')} icon={Wallet} />
          <div className="[&>div]:!flex-col [&>div]:!items-stretch [&>div>div:first-child]:mx-auto">
          <Donut
            data={[
              { label: tc('cash'), value: round2(m.pay.cash), color: CHART_COLORS[2] },
              { label: tc('card'), value: round2(m.pay.card), color: CHART_COLORS[1] },
              { label: tc('insurance'), value: round2(m.pay.insurance), color: CHART_COLORS[0] }
            ]}
            format={fmt.compact}
            centerLabel={t('total')}
            size={170}
          />
          </div>
        </Card>
      </div>

      {/* category, top products, alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title={t('byCategory')} subtitle={t('byCategorySub')} icon={LayoutDashboard} />
          {m.byCat.length ? (
            <ul className="space-y-3">
              {m.byCat.slice(0, 7).map((c) => {
                const cat = catById.get(c.id);
                const color = cat?.color ?? '#94A3B8';
                return (
                  <li key={c.id}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm text-brand-dark truncate flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
                        {name(cat) || '—'}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{fmt.money(c.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c.value / maxCat) * 100}%`, background: color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={tc('noData')} />
          )}
        </Card>
        <Card>
          <CardHeader title={t('topProducts')} subtitle={t('topProductsSub')} icon={ShoppingBasket} />
          {m.top.length ? (
            <ul className="space-y-2.5">
              {m.top.map(([id, units], i) => {
                const p = productMap.get(id);
                return (
                  <li key={id}>
                    <Link to={`/erp/stock/${id}`} className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 hover:bg-slate-50">
                      <span className="w-5 text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
                      <ProductThumb src={p?.imageCover} size="w-11 h-11" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-brand-dark truncate">{name(p)}</span>
                        <span className="block text-xs text-slate-500">{t('unitsSold', { n: fmt.int(units) })}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{p ? fmt.money(p.priceAfterDiscount ?? p.price) : ''}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={tc('noData')} />
          )}
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title={t('alerts')} subtitle={t('alertsSub')} icon={Bell} />
          {alerts.length ? (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.key}>
                  <button onClick={() => navigate(a.to)} className="w-full flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-start hover:border-slate-200 hover:bg-slate-50">
                    <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', a.tone === 'red' ? 'bg-rose-50 text-rose-600' : a.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <span className="text-sm text-brand-dark flex-1">{tl(a.msg, a.vars)}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t('allClear')} />
          )}
        </Card>
      </div>

      {/* recent + quick/branches */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t('recent')}
            subtitle={t('recentSub')}
            icon={Receipt}
            action={
              <Link to="/erp/invoices" className="text-xs font-semibold text-brand-gold hover:underline">
                {t('viewAll')}
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {m.recent.map((s) => {
              const c = s.customerId ? d.customers.find((x) => x._id === s.customerId) : undefined;
              return (
                <li key={s._id}>
                  <Link to={`/erp/invoices/${s._id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-xl">
                    <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-brand-dark">{s.number}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {c?.name ?? tc('walkIn')} · {fmt.dateTime(s.createdAt)}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusBadge status={s.status} />
                    </span>
                    <span className="text-sm font-semibold tabular-nums w-28 text-end">{fmt.money(s.total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('quick')} />
            <div className="grid grid-cols-2 gap-3">
              {quick.map((q) => (
                <Link key={q.to} to={q.to} className="group rounded-2xl border border-slate-100 p-3 hover:border-slate-200 hover:shadow-md transition">
                  <span className={cx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', q.cls)}>
                    <q.icon className="w-4 h-4" />
                  </span>
                  <span className="block mt-2.5 text-sm font-semibold text-brand-dark">{q.title}</span>
                  <span className="block text-[11px] text-slate-500">{q.sub}</span>
                </Link>
              ))}
            </div>
          </Card>
          {scope === 'all' && (
            <Card>
              <CardHeader title={t('branches')} subtitle={t('branchesSub')} icon={Building2} />
              <BarChart labels={branches.map((b) => name(b).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, ''))} series={[{ name: t('netSales'), values: branches.map((b) => round2(m.perBranch.get(b._id) ?? 0)) }]} format={fmt.compact} height={200} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
