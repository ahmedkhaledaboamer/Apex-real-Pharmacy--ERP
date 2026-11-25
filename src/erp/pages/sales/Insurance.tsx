import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CircleDollarSign, Download, Hourglass, ShieldCheck, ShieldX } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useToast } from '../../../components/ui/Toast';
import { erp, nowISO } from '../../store';
import { useErpState, useFmt, useName } from '../../hooks';
import { Button, Card, DataTable, PageHeader, Progress, SearchInput, Select, StatCard, StatusBadge, Tabs, Toolbar, cx, downloadCsv, type Column } from '../../ui/kit';
import type { ClaimStatus, InsuranceClaim } from '../../types';

const STATUSES: ClaimStatus[] = ['pending', 'submitted', 'approved', 'rejected', 'paid'];

export default function InsurancePage() {
  const t = useTranslations('ErpSales.ins');
  const tc = useTranslations('Erp.common');
  const ts = useTranslations('Erp.status');
  const fmt = useFmt();
  const name = useName();
  const toast = useToast();
  const d = useErpState();
  const [tab, setTab] = useState<'all' | ClaimStatus>('all');
  const [insurer, setInsurer] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<ClaimStatus>('submitted');

  const saleNo = useMemo(() => new Map(d.sales.map((s) => [s._id, s.number])), [d.sales]);
  const custName = useMemo(() => new Map(d.customers.map((c) => [c._id, c.name])), [d.customers]);
  const insMap = useMemo(() => new Map(d.insurers.map((i) => [i._id, i])), [d.insurers]);

  const scoped = useMemo(() => d.claims.filter((c) => !insurer || c.companyId === insurer), [d.claims, insurer]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return scoped
      .filter((c) => tab === 'all' || c.status === tab)
      .filter((c) => !s || c.number.toLowerCase().includes(s) || (saleNo.get(c.saleId) ?? '').toLowerCase().includes(s) || (custName.get(c.customerId ?? '') ?? '').toLowerCase().includes(s))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [scoped, tab, q, saleNo, custName]);

  const sum = (f: (c: InsuranceClaim) => boolean) => scoped.filter(f).reduce((s, c) => s + c.amount, 0);
  const outstanding = sum((c) => ['pending', 'submitted', 'approved'].includes(c.status));
  const decided = scoped.filter((c) => ['approved', 'rejected', 'paid'].includes(c.status)).length;
  const rejectionRate = decided ? (scoped.filter((c) => c.status === 'rejected').length / decided) * 100 : 0;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r._id));
  const apply = () => {
    const at = nowISO();
    sel.forEach((id) => erp.update('claims', id, { status: target, updatedAt: at }));
    toast.success(t('updated', { n: sel.size }));
    setSel(new Set());
  };

  const cols: Column<InsuranceClaim>[] = [
    {
      key: 'sel',
      header: <input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r._id)))} className="w-4 h-4 accent-brand-gold" aria-label="select all" />,
      cell: (c) => <input type="checkbox" checked={sel.has(c._id)} onChange={() => toggle(c._id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-brand-gold" aria-label={c.number} />
    },
    { key: 'no', header: t('claim'), cell: (c) => <span className="font-semibold">{c.number}</span>, sort: (c) => c.number },
    { key: 'date', header: tc('date'), cell: (c) => fmt.date(c.createdAt), sort: (c) => c.createdAt },
    {
      key: 'inv',
      header: t('invoice'),
      cell: (c) => (
        <Link to={`/erp/invoices/${c.saleId}`} className="text-brand-gold font-medium hover:underline">
          {saleNo.get(c.saleId)}
        </Link>
      )
    },
    { key: 'pt', header: t('patient'), cell: (c) => custName.get(c.customerId ?? '') ?? '—' },
    { key: 'ins', header: t('insurer'), cell: (c) => <span className="text-slate-600">{name(insMap.get(c.companyId))}</span> },
    { key: 'st', header: tc('status'), cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'amt', header: tc('amount'), cell: (c) => <span className="font-semibold tabular-nums">{fmt.money(c.amount)}</span>, sort: (c) => c.amount, align: 'end' }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={ShieldCheck}
        actions={
          <Button icon={Download} onClick={() => downloadCsv('insurance-claims.csv', [t('claim'), tc('date'), t('invoice'), t('patient'), t('insurer'), tc('status'), tc('amount')], rows.map((c) => [c.number, c.createdAt, saleNo.get(c.saleId) ?? '', custName.get(c.customerId ?? '') ?? '', name(insMap.get(c.companyId)), c.status, c.amount]))}>
            {tc('export')}
          </Button>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('outstanding')} value={fmt.money(outstanding)} icon={Hourglass} tone="amber" />
        <StatCard label={t('approved')} value={fmt.money(sum((c) => c.status === 'approved'))} icon={BadgeCheck} tone="teal" />
        <StatCard label={t('paid')} value={fmt.money(sum((c) => c.status === 'paid'))} icon={CircleDollarSign} tone="purple" />
        <StatCard label={t('rejectionRate')} value={fmt.pct(rejectionRate)} icon={ShieldX} tone="rose" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {d.insurers.map((i) => {
          const cl = d.claims.filter((c) => c.companyId === i._id);
          const out = cl.filter((c) => ['pending', 'submitted', 'approved'].includes(c.status)).reduce((s, c) => s + c.amount, 0);
          const paid = cl.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
          const active = insurer === i._id;
          return (
            <button key={i._id} onClick={() => setInsurer(active ? '' : i._id)} className={cx('text-start bg-white rounded-2xl border p-4 transition', active ? 'border-brand-gold ring-2 ring-brand-gold/20' : 'border-slate-200/70 hover:border-brand-gold/40')}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-brand-dark truncate">{name(i)}</p>
                  <p className="text-xs text-slate-500">
                    {t('coverage', { pct: i.coveragePct })} · {t('claims', { n: cl.length })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between text-sm">
                <span>
                  <span className="block text-[11px] text-slate-400">{t('outstanding')}</span>
                  <span className="font-bold text-brand-dark tabular-nums">{fmt.money(out)}</span>
                </span>
                <span className="text-end">
                  <span className="block text-[11px] text-slate-400">{t('paid')}</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">{fmt.money(paid)}</span>
                </span>
              </div>
              <div className="mt-2">
                <Progress value={paid} max={paid + out} tone="green" />
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <Toolbar>
          <Tabs value={tab} onChange={setTab} items={[{ value: 'all' as const, label: tc('all'), count: scoped.length }, ...STATUSES.map((s) => ({ value: s, label: ts(s), count: scoped.filter((c) => c.status === s).length }))]} />
          <Select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="!w-auto">
            <option value="">{t('anyInsurer')}</option>
            {d.insurers.map((i) => (
              <option key={i._id} value={i._id}>
                {name(i)}
              </option>
            ))}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="w-full sm:w-64 sm:ms-auto" />
        </Toolbar>
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl bg-brand-pink/60 px-4 py-2.5">
            <span className="text-sm font-semibold text-brand-gold">{t('selected', { n: sel.size })}</span>
            <span className="text-sm text-slate-600 ms-auto">{t('markAs')}</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value as ClaimStatus)} className="!w-auto h-9">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ts(s)}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="primary" onClick={apply}>
              {t('apply')}
            </Button>
          </div>
        )}
        <DataTable rows={rows} columns={cols} rowKey={(c) => c._id} onRowClick={(c) => toggle(c._id)} pageSize={15} />
      </Card>
    </>
  );
}
