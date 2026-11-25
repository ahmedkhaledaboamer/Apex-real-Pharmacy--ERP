import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarX2, Download, Hourglass, PackageMinus, Trash2, Truck } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { adjustBatch, daysUntil, today } from '../../store';
import type { Batch } from '../../types';
import { BarChart } from '../../ui/charts';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, downloadCsv, EmptyState, PageHeader, StatCard, Tabs, Toolbar, type Column } from '../../ui/kit';
import { useToast } from '../../../components/ui/Toast';
import { ExpiryBadge, ProductCell, useBranchLookup, useBranchName, useTs } from './shared';

type TabKey = 'expired' | 'd30' | 'd90' | 'd180';
const inTab = (days: number, tab: TabKey) => (tab === 'expired' ? days < 0 : tab === 'd30' ? days >= 0 && days <= 30 : tab === 'd90' ? days > 30 && days <= 90 : days > 90 && days <= 180);

export default function ExpiryPage() {
  const t = useTs();
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const toast = useToast();
  const d = useErpState();
  const branch = useCurrentBranch();
  const bn = useBranchName();
  const bl = useBranchLookup();
  const { productMap } = useCatalog();
  const [sp, setSp] = useSearchParams();
  const tab = (['expired', 'd30', 'd90', 'd180'].includes(sp.get('tab') ?? '') ? sp.get('tab') : 'd30') as TabKey;
  const setTab = (v: TabKey) => setSp({ tab: v }, { replace: true });
  const [scope, setScope] = useState<'branch' | 'all'>('branch');
  const [action, setAction] = useState<{ batch: Batch; kind: 'write_off' | 'return' } | null>(null);

  const live = useMemo(() => d.batches.filter((b) => b.qty > 0 && (scope === 'all' || b.branchId === branch?._id)), [d, scope, branch]);
  const withDays = useMemo(() => live.map((b) => ({ b, days: daysUntil(b.expiry) })), [live]);
  const counts = useMemo(() => {
    const c: Record<TabKey, { n: number; value: number; units: number }> = { expired: { n: 0, value: 0, units: 0 }, d30: { n: 0, value: 0, units: 0 }, d90: { n: 0, value: 0, units: 0 }, d180: { n: 0, value: 0, units: 0 } };
    for (const { b, days } of withDays)
      for (const k of Object.keys(c) as TabKey[])
        if (inTab(days, k)) {
          c[k].n++;
          c[k].value += b.qty * b.cost;
          c[k].units += b.qty;
        }
    return c;
  }, [withDays]);
  const rows = withDays.filter((x) => inTab(x.days, tab)).sort((a, z) => a.days - z.days).map((x) => x.b);

  const chart = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1));
    const vals = months.map(() => 0);
    const t0 = today();
    for (const b of live) {
      if (b.expiry < t0) continue;
      const e = new Date(`${b.expiry}T00:00:00`);
      const i = (e.getFullYear() - now.getFullYear()) * 12 + e.getMonth() - now.getMonth();
      if (i >= 0 && i < 6) vals[i] += b.qty * b.cost;
    }
    return { labels: months.map((m) => fmt.month(m)), vals };
  }, [live, fmt]);

  const supplierName = (b: Batch) => d.suppliers.find((s) => s._id === b.supplierId)?.name;
  const confirm = () => {
    if (!action) return;
    const { batch, kind } = action;
    const note = kind === 'return' ? t('expiry.returnNote', { name: supplierName(batch) ?? '—' }) : t('expiry.writeOffNote');
    adjustBatch(batch._id, -batch.qty, 'write_off', note);
    toast.success(kind === 'return' ? t('expiry.returned') : t('stock.writtenOff'));
  };

  const cols: Column<Batch>[] = [
    { key: 'p', header: tc('product'), sort: (b) => name(productMap.get(b.productId)), cell: (b) => <ProductCell id={b.productId} sub={`${tc('batch')} ${b.batchNo}${supplierName(b) ? ` · ${supplierName(b)}` : ''}`} /> },
    ...(scope === 'all' ? [{ key: 'br', header: tc('branch'), cell: (b: Batch) => bl(b.branchId), sort: (b: Batch) => bl(b.branchId) }] : []),
    { key: 'exp', header: tc('expiry'), sort: (b) => b.expiry, cell: (b) => <span className="flex items-center gap-2 whitespace-nowrap"><span className="text-xs text-slate-600">{fmt.date(b.expiry)}</span><ExpiryBadge expiry={b.expiry} warn={d.settings.expiryWarningDays} /></span> },
    { key: 'qty', header: tc('qty'), align: 'end', sort: (b) => b.qty, cell: (b) => <span className="font-semibold tabular-nums">{fmt.int(b.qty)}</span> },
    { key: 'val', header: t('expiry.valueAtRisk'), align: 'end', sort: (b) => b.qty * b.cost, cell: (b) => <span className="tabular-nums whitespace-nowrap">{fmt.money(b.qty * b.cost)}</span> },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (b) => (
        <span className="inline-flex gap-1">
          {b.supplierId && (
            <Button size="sm" variant="ghost" icon={Truck} title={t('expiry.returnSupplier')} aria-label={t('expiry.returnSupplier')} onClick={() => setAction({ batch: b, kind: 'return' })} />
          )}
          <Button size="sm" variant="ghost" icon={Trash2} title={t('stock.writeOff')} aria-label={t('stock.writeOff')} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setAction({ batch: b, kind: 'write_off' })} />
        </span>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title={t('expiry.title')}
        subtitle={t('expiry.subtitle')}
        icon={CalendarClock}
        actions={
          <>
            <Tabs value={scope} onChange={setScope} items={[{ value: 'branch', label: bn(branch) }, { value: 'all', label: t('stock.scopeAll') }]} />
            <Button
              icon={Download}
              onClick={() =>
                downloadCsv(`expiry-${tab}-${today()}.csv`, [tc('product'), tc('batch'), tc('branch'), tc('expiry'), tc('qty'), tc('cost')], rows.map((b) => [name(productMap.get(b.productId)), b.batchNo, bl(b.branchId), b.expiry, b.qty, b.cost]))
              }>
              {tc('export')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('expiry.tabExpired')} value={fmt.money(counts.expired.value)} hint={t('expiry.batchesUnits', { n: counts.expired.n, u: counts.expired.units })} icon={CalendarX2} tone="rose" onClick={() => setTab('expired')} />
        <StatCard label={t('expiry.tab30')} value={fmt.money(counts.d30.value)} hint={t('expiry.batchesUnits', { n: counts.d30.n, u: counts.d30.units })} icon={Hourglass} tone="amber" onClick={() => setTab('d30')} />
        <StatCard label={t('expiry.tab90')} value={fmt.money(counts.d90.value)} hint={t('expiry.batchesUnits', { n: counts.d90.n, u: counts.d90.units })} icon={PackageMinus} tone="blue" onClick={() => setTab('d90')} />
        <StatCard label={t('expiry.tab180')} value={fmt.money(counts.d180.value)} hint={t('expiry.batchesUnits', { n: counts.d180.n, u: counts.d180.units })} icon={CalendarClock} tone="slate" onClick={() => setTab('d180')} />
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <Toolbar>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'expired', label: t('expiry.tabExpired'), count: counts.expired.n },
                { value: 'd30', label: t('expiry.tab30'), count: counts.d30.n },
                { value: 'd90', label: t('expiry.tab90'), count: counts.d90.n },
                { value: 'd180', label: t('expiry.tab180'), count: counts.d180.n }
              ]}
            />
          </Toolbar>
          <DataTable rows={rows} columns={cols} rowKey={(b) => b._id} pageSize={12} empty={<EmptyState icon={CalendarClock} title={t('expiry.none')} />} />
        </Card>
        <Card>
          <CardHeader title={t('expiry.chartTitle')} subtitle={t('expiry.chartSub')} />
          <BarChart labels={chart.labels} series={[{ name: t('expiry.valueAtRisk'), values: chart.vals, color: '#E8890C' }]} height={240} format={(n) => fmt.compact(n)} />
          <ul className="mt-4 space-y-1.5 text-xs">
            {chart.labels.map((l, i) => (
              <li key={l} className="flex justify-between text-slate-500">
                <span>{l}</span>
                <span className="font-semibold text-brand-dark tabular-nums">{fmt.money(chart.vals[i])}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={confirm}
        danger
        title={action?.kind === 'return' ? t('expiry.returnSupplier') : t('stock.writeOffTitle')}
        message={action ? t(action.kind === 'return' ? 'expiry.confirmReturn' : 'expiry.confirmWriteOff', { qty: action.batch.qty, batch: action.batch.batchNo, name: name(productMap.get(action.batch.productId)) }) : ''}
        confirmLabel={action?.kind === 'return' ? t('expiry.returnSupplier') : t('stock.writeOff')}
      />
    </>
  );
}
