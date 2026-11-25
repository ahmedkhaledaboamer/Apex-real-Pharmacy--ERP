import { Fragment, useMemo, useState } from 'react';
import { Download, Landmark, PieChart, Printer, Receipt, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useFmt, useName } from '../../hooks';
import { round2 } from '../../store';
import type { ExpenseCategory } from '../../types';
import { CHART_COLORS, LineChart } from '../../ui/charts';
import { Button, Card, CardHeader, PageHeader, Select, Tabs, Toolbar, cx, downloadCsv, printHtml } from '../../ui/kit';
import { expensesIn, lastMonths, monthRange, plRange, summarize, vatIn, type PLPeriod } from './metrics';
import { KpiTile } from './parts';

const CATS: ExpenseCategory[] = ['rent', 'salaries', 'utilities', 'marketing', 'maintenance', 'licenses', 'other'];

export default function ProfitLossPage() {
  const t = useTranslations('ErpFin.pl');
  const tc = useTranslations('Erp.common');
  const tcat = useTranslations('Erp.expenseCats');
  const locale = useLocale();
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const { branches } = useCatalog();
  const [period, setPeriod] = useState<PLPeriod>('thisMonth');
  const [scope, setScope] = useState<string>('all');
  const bId = scope === 'all' ? undefined : scope;

  const m = useMemo(() => {
    const r = plRange(period);
    const s = summarize(d, r, bId);
    const exp = expensesIn(d, r, bId);
    const opex = CATS.map((c) => ({ c, v: round2(exp.filter((e) => e.category === c).reduce((t2, e) => t2 + e.amount, 0)) })).filter((x) => x.v > 0);
    const totalOpex = round2(opex.reduce((t2, x) => t2 + x.v, 0));
    const net = round2(s.grossProfit - totalOpex);
    const vin = vatIn(d, r, bId);
    const months = lastMonths(6);
    const trend = months.map((mm) => {
      const rr = monthRange(mm);
      const ss = summarize(d, rr, bId);
      const ex = expensesIn(d, rr, bId).reduce((t2, e) => t2 + e.amount, 0);
      return { rev: ss.netRevenue, gp: ss.grossProfit, ex: round2(ex) };
    });
    return { r, s, opex, totalOpex, net, netMargin: s.netRevenue > 0 ? (net / s.netRevenue) * 100 : 0, vin, months, trend };
  }, [d, period, bId]);

  const periodLabel = `${fmt.date(m.r.from)} – ${fmt.date(new Date(m.r.to.getTime() - 86400000))}`;
  const scopeLabel = bId ? name(branches.find((b) => b._id === bId)) : tc('all');
  const lines: { label: string; value: number; kind?: 'sub' | 'total' | 'neg' | 'grand' | 'indent'; pct?: number }[] = [
    { label: t('revenue'), value: m.s.revenue },
    { label: t('returns'), value: -m.s.returnsExVat, kind: 'neg' },
    { label: t('netRevenue'), value: m.s.netRevenue, kind: 'sub' },
    { label: t('cogs'), value: -m.s.cogs, kind: 'neg' },
    { label: t('grossProfit'), value: m.s.grossProfit, kind: 'total', pct: m.s.margin },
    ...m.opex.map((x) => ({ label: tcat(x.c), value: -x.v, kind: 'indent' as const })),
    { label: t('totalOpex'), value: -m.totalOpex, kind: 'sub' },
    { label: t('netProfit'), value: m.net, kind: 'grand', pct: m.netMargin }
  ];
  const vatDue = round2(m.s.vatOut - m.vin);

  const print = () => {
    const rows = lines
      .map((l) => `<tr class="${l.kind === 'grand' ? 'grand' : ''}"><td style="${l.kind === 'indent' ? 'padding-inline-start:18px;color:#64748b' : l.kind === 'total' || l.kind === 'sub' ? 'font-weight:600' : ''}">${l.label}</td><td class="end">${fmt.money(l.value)}</td></tr>`)
      .join('');
    printHtml(
      t('title'),
      `<div class="center"><img class="logo" src="/images/apex-logo.png"/><h1>${t('statement')}</h1><p class="muted">${d.settings.pharmacyName} · ${scopeLabel}<br/>${periodLabel}</p></div>
       <table><thead><tr><th>${t('line')}</th><th class="end">${tc('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
       <table class="tot"><tr><td>${t('vatOut')}</td><td class="end">${fmt.money(m.s.vatOut)}</td></tr><tr><td>${t('vatIn')}</td><td class="end">${fmt.money(m.vin)}</td></tr><tr class="grand"><td>${t('vatDue')}</td><td class="end">${fmt.money(vatDue)}</td></tr></table>`,
      locale === 'ar' ? 'rtl' : 'ltr'
    );
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={PieChart}
        actions={
          <>
            <Button icon={Download} onClick={() => downloadCsv(`profit-loss-${period}.csv`, [t('line'), tc('amount')], lines.map((l) => [l.label, l.value]))}>
              {tc('export')}
            </Button>
            <Button icon={Printer} onClick={print}>
              {tc('print')}
            </Button>
          </>
        }
      />
      <Toolbar>
        <Tabs
          value={period}
          onChange={setPeriod}
          items={(['thisMonth', 'lastMonth', 'quarter', 'ytd', 'last90'] as PLPeriod[]).map((p) => ({ value: p, label: t(p) }))}
        />
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!w-56">
          <option value="all">{tc('all')}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {name(b)}
            </option>
          ))}
        </Select>
        <span className="text-xs text-slate-500 ms-auto">{periodLabel}</span>
      </Toolbar>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiTile label={t('netRevenue')} value={fmt.money(m.s.netRevenue)} icon={Receipt} tone="blue" />
        <KpiTile label={t('grossProfit')} value={fmt.money(m.s.grossProfit)} icon={TrendingUp} hint={`${t('grossMargin')} ${fmt.pct(m.s.margin)}`} tone="teal" />
        <KpiTile label={t('totalOpex')} value={fmt.money(m.totalOpex)} icon={Landmark} tone="amber" />
        <KpiTile label={t('netProfit')} value={fmt.money(m.net)} icon={PieChart} hint={`${t('netMargin')} ${fmt.pct(m.netMargin)}`} tone={m.net >= 0 ? 'purple' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3">
          <CardHeader title={t('statement')} subtitle={`${scopeLabel} · ${periodLabel}`} icon={Landmark} />
          <table className="w-full text-sm">
            <tbody>
              {lines.map((l, i) => {
                const opexHeader = l.kind === 'indent' && lines[i - 1]?.kind !== 'indent';
                return (
                  <Fragment key={i}>
                    {opexHeader && (
                      <tr>
                        <td colSpan={3} className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {t('opex')}
                        </td>
                      </tr>
                    )}
                    <tr
                      className={cx(
                        l.kind === 'grand' && 'bg-gradient-to-r from-brand-pink to-brand-peach',
                        (l.kind === 'total' || l.kind === 'sub') && 'border-t border-slate-200'
                      )}>
                      <td className={cx('py-2.5', l.kind === 'indent' ? 'ps-4 text-slate-500' : 'ps-3', (l.kind === 'total' || l.kind === 'sub') && 'font-semibold', l.kind === 'grand' && 'font-bold text-base rounded-s-xl')}>{l.label}</td>
                      <td className="py-2.5 text-end text-xs text-slate-500 tabular-nums">{l.pct !== undefined ? fmt.pct(l.pct) : ''}</td>
                      <td className={cx('py-2.5 pe-3 text-end tabular-nums', l.value < 0 && 'text-slate-600', (l.kind === 'total' || l.kind === 'sub') && 'font-semibold', l.kind === 'grand' && cx('font-bold text-base rounded-e-xl', l.value < 0 ? 'text-rose-600' : 'text-brand-dark'))}>
                        {l.value < 0 ? `(${fmt.money(Math.abs(l.value))})` : fmt.money(l.value)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader title={t('vat')} subtitle={t('vatSub')} icon={Receipt} />
            <dl className="text-sm divide-y divide-slate-100">
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">{t('vatOut')}</dt>
                <dd className="tabular-nums font-medium">{fmt.money(m.s.vatOut)}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">{t('vatIn')}</dt>
                <dd className="tabular-nums font-medium">({fmt.money(m.vin)})</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="font-bold">{vatDue >= 0 ? t('vatDue') : t('vatRefund')}</dt>
                <dd className={cx('tabular-nums font-bold', vatDue >= 0 ? 'text-brand-dark' : 'text-emerald-600')}>{fmt.money(Math.abs(vatDue))}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader title={t('trend')} subtitle={t('trendSub')} icon={TrendingUp} />
            <LineChart
              labels={m.months.map((x) => fmt.month(x))}
              series={[
                { name: t('sRevenue'), values: m.trend.map((x) => x.rev), color: CHART_COLORS[1] },
                { name: t('sGross'), values: m.trend.map((x) => x.gp), color: CHART_COLORS[2] },
                { name: t('sOpex'), values: m.trend.map((x) => x.ex), color: CHART_COLORS[3] }
              ]}
              format={fmt.compact}
              height={230}
              area={false}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
