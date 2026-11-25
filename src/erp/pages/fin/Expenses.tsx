import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Download, Layers, Pencil, Plus, ReceiptText, Trash2, TrendingDown, Wallet } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { erp, nowISO, round2, today } from '../../store';
import type { Expense, ExpenseCategory } from '../../types';
import { BarChart, CHART_COLORS, Donut } from '../../ui/charts';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Textarea, Toolbar, downloadCsv, type Column } from '../../ui/kit';
import { delta, expensesIn, lastMonths, monthRange } from './metrics';
import { KpiTile } from './parts';

const CATS: ExpenseCategory[] = ['rent', 'salaries', 'utilities', 'marketing', 'maintenance', 'licenses', 'other'];
const CAT_COLOR: Record<ExpenseCategory, string> = { rent: CHART_COLORS[0], salaries: CHART_COLORS[1], utilities: CHART_COLORS[2], marketing: CHART_COLORS[3], maintenance: CHART_COLORS[4], licenses: '#64748B', other: '#94A3B8' };
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function ExpensesPage() {
  const t = useTranslations('ErpFin.expenses');
  const tc = useTranslations('Erp.common');
  const tcat = useTranslations('Erp.expenseCats');
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { branches } = useCatalog();
  const [sp, setSp] = useSearchParams();
  const months = useMemo(() => lastMonths(12).reverse(), []);
  const [month, setMonth] = useState(monthKey(months[0]));
  const [scope, setScope] = useState<string>(branch?._id ?? 'all');
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const bId = scope === 'all' ? undefined : scope;

  useEffect(() => {
    if (sp.get('new')) {
      setEditing('new');
      sp.delete('new');
      setSp(sp, { replace: true });
    }
  }, [sp, setSp]);

  const m = useMemo(() => {
    const cur = months.find((x) => monthKey(x) === month) ?? months[0];
    const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    const rows = expensesIn(d, monthRange(cur), bId).sort((a, b) => b.date.localeCompare(a.date));
    const total = round2(rows.reduce((s, e) => s + e.amount, 0));
    const prevTotal = round2(expensesIn(d, monthRange(prev), bId).reduce((s, e) => s + e.amount, 0));
    const byCat = CATS.map((c) => ({ c, v: round2(rows.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)) })).filter((x) => x.v > 0);
    const biggest = [...byCat].sort((a, b) => b.v - a.v)[0];
    const six = lastMonths(6);
    // stack the 4 biggest categories + "other" (keeps the palette within 5 series)
    const top4 = CATS.map((c) => ({ c, v: d.expenses.filter((e) => e.category === c && (!bId || e.branchId === bId)).reduce((s, e) => s + e.amount, 0) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 4)
      .map((x) => x.c);
    const series = [
      ...top4.map((c, i) => ({ name: tcat(c), color: CHART_COLORS[i], values: six.map((mm) => round2(expensesIn(d, monthRange(mm), bId).filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0))) })),
      { name: tcat('other'), color: '#94A3B8', values: six.map((mm) => round2(expensesIn(d, monthRange(mm), bId).filter((e) => !top4.includes(e.category)).reduce((s, e) => s + e.amount, 0))) }
    ];
    return { rows, total, prevTotal, byCat, biggest, six, series };
  }, [d, month, months, bId, tcat]);

  const bName = (id: string) => name(branches.find((b) => b._id === id)).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '');
  const cols: Column<Expense>[] = [
    { key: 'date', header: tc('date'), cell: (e) => fmt.date(e.date), sort: (e) => e.date },
    {
      key: 'cat',
      header: t('category'),
      cell: (e) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: CAT_COLOR[e.category] }} />
          {tcat(e.category)}
        </span>
      ),
      sort: (e) => e.category
    },
    { key: 'note', header: t('note'), cell: (e) => <span className="text-slate-500">{e.note || '—'}</span> },
    { key: 'branch', header: tc('branch'), cell: (e) => bName(e.branchId) },
    { key: 'via', header: t('paidVia'), cell: (e) => tc(e.paidVia === 'bank' ? 'bank' : e.paidVia) },
    { key: 'amount', header: tc('amount'), align: 'end', cell: (e) => <span className="font-semibold tabular-nums">{fmt.money(e.amount)}</span>, sort: (e) => e.amount },
    {
      key: 'act',
      header: '',
      align: 'end',
      cell: (e) => (
        <span className="inline-flex gap-1">
          <IconButton icon={Pencil} label={tc('edit')} onClick={() => setEditing(e)} />
          <IconButton icon={Trash2} label={tc('delete')} className="hover:text-rose-600" onClick={() => setDeleting(e)} />
        </span>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Wallet}
        actions={
          <>
            <Button icon={Download} onClick={() => downloadCsv(`expenses-${month}.csv`, [tc('date'), t('category'), t('note'), tc('branch'), t('paidVia'), tc('amount')], m.rows.map((e) => [e.date, tcat(e.category), e.note ?? '', bName(e.branchId), e.paidVia, e.amount]))}>
              {tc('export')}
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
              {t('add')}
            </Button>
          </>
        }
      />
      <Toolbar>
        <label className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-44">
            {months.map((mm) => (
              <option key={monthKey(mm)} value={monthKey(mm)}>
                {new Intl.DateTimeFormat(fmt.locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { month: 'long', year: 'numeric' }).format(mm)}
              </option>
            ))}
          </Select>
        </label>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!w-56">
          <option value="all">{t('allBranches')}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {bName(b._id)}
            </option>
          ))}
        </Select>
      </Toolbar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <KpiTile label={t('thisMonth')} value={fmt.money(m.total)} icon={Wallet} delta={delta(m.total, m.prevTotal)} hint={t('lastMonth')} invert tone="rose" />
        <KpiTile label={t('biggest')} value={m.biggest ? tcat(m.biggest.c) : '—'} icon={Layers} hint={m.biggest ? fmt.money(m.biggest.v) : undefined} tone="amber" />
        <KpiTile label={t('count')} value={fmt.int(m.rows.length)} icon={ReceiptText} tone="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-4">
        <Card className="xl:col-span-2">
          <CardHeader title={t('byCategory')} icon={Layers} />
          {m.byCat.length ? <Donut data={m.byCat.map((x) => ({ label: tcat(x.c), value: x.v, color: CAT_COLOR[x.c] }))} format={fmt.compact} centerLabel={tc('total')} size={170} /> : <EmptyState title={t('none')} />}
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title={t('monthly')} subtitle={t('monthlySub')} icon={TrendingDown} />
          <BarChart labels={m.six.map((x) => fmt.month(x))} series={m.series} stacked format={fmt.compact} height={250} />
        </Card>
      </div>

      <Card>
        <CardHeader title={t('list')} />
        <DataTable rows={m.rows} columns={cols} rowKey={(e) => e._id} empty={<EmptyState title={t('none')} icon={Wallet} />} />
      </Card>

      {editing && <ExpenseModal expense={editing === 'new' ? null : editing} defaultBranch={bId ?? branch?._id ?? ''} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        danger
        title={t('deleteTitle')}
        message={t('deleteMsg')}
        confirmLabel={tc('delete')}
        onConfirm={() => deleting && erp.remove('expenses', deleting._id)}
      />
    </>
  );
}

function ExpenseModal({ expense, defaultBranch, onClose }: { expense: Expense | null; defaultBranch: string; onClose: () => void }) {
  const t = useTranslations('ErpFin.expenses');
  const tc = useTranslations('Erp.common');
  const tcat = useTranslations('Erp.expenseCats');
  const name = useName();
  const toast = useToast();
  const { branches } = useCatalog();
  const [v, setV] = useState({
    category: expense?.category ?? ('utilities' as ExpenseCategory),
    amount: expense ? String(expense.amount) : '',
    branchId: expense?.branchId ?? defaultBranch,
    date: expense?.date ?? today(),
    paidVia: expense?.paidVia ?? ('bank' as Expense['paidVia']),
    note: expense?.note ?? ''
  });
  const [err, setErr] = useState('');
  const save = () => {
    const amount = Number(v.amount);
    if (!(amount > 0)) return setErr(t('errAmount'));
    const rec = { category: v.category, amount: round2(amount), branchId: v.branchId, date: v.date, paidVia: v.paidVia, note: v.note.trim() || undefined };
    if (expense) erp.update('expenses', expense._id, rec);
    else erp.insert('expenses', { ...rec, createdAt: nowISO() });
    toast.success(tc('saved'));
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? t('edit') : t('add')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('category')} required>
          <Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as ExpenseCategory })}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {tcat(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tc('amount')} required error={err}>
          <Input type="number" min="0" step="0.01" value={v.amount} onChange={(e) => (setV({ ...v, amount: e.target.value }), setErr(''))} />
        </Field>
        <Field label={tc('branch')}>
          <Select value={v.branchId} onChange={(e) => setV({ ...v, branchId: e.target.value })}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {name(b)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tc('date')}>
          <Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        </Field>
        <Field label={t('paidVia')}>
          <Select value={v.paidVia} onChange={(e) => setV({ ...v, paidVia: e.target.value as Expense['paidVia'] })}>
            <option value="bank">{tc('bank')}</option>
            <option value="cash">{tc('cash')}</option>
            <option value="card">{tc('card')}</option>
          </Select>
        </Field>
        <Field label={t('note')} className="sm:col-span-2">
          <Textarea value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
