/** Helpers shared by the ERP sales pages. */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from '../../../lib/i18n';
import { useToast } from '../../../components/ui/Toast';
import { erp, productById, branches, getState, nowISO } from '../../store';
import { useErp, useFmt, useName } from '../../hooks';
import { Button, Field, Input, Modal, Select, Textarea, printHtml } from '../../ui/kit';
import type { Customer, Sale } from '../../types';

/* ------------------------------- date ranges ------------------------------ */
export type RangeKey = 'today' | '7' | '30' | '90' | 'all';
export function rangeStart(r: RangeKey): number {
  if (r === 'all') return 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (r === 'today') return d.getTime();
  return d.getTime() - (Number(r) - 1) * 86400000;
}
export function useRangeTabs() {
  const t = useTranslations('Erp.common');
  return [
    { value: 'today' as RangeKey, label: t('today') },
    { value: '7' as RangeKey, label: t('last7') },
    { value: '30' as RangeKey, label: t('last30') },
    { value: '90' as RangeKey, label: t('last90') },
    { value: 'all' as RangeKey, label: t('all') }
  ];
}

/* ------------------------------ error messages ---------------------------- */
export function useSaleError() {
  const t = useTranslations('ErpSales.errors');
  const name = useName();
  return (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('NOT_ENOUGH_STOCK:')) return t('notEnough', { name: name(productById(msg.split(':')[1])) });
    if (msg === 'PAYMENT_SHORT') return t('paymentShort');
    return t('generic');
  };
}

/* --------------------------------- receipt -------------------------------- */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function usePrintReceipt() {
  const t = useTranslations('ErpSales.receipt');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const name = useName();
  const locale = useLocale();
  return (sale: Sale, change = 0) => {
    const d = getState();
    const s = d.settings;
    const branch = branches().find((b) => b._id === sale.branchId);
    const emp = d.employees.find((e) => e._id === sale.employeeId);
    const cust = d.customers.find((c) => c._id === sale.customerId);
    const method = (m: string) => tc(m);
    const rows = sale.items
      .map((it) => {
        const p = productById(it.productId);
        const line = it.price * it.qty - it.discount;
        return `<tr><td>${esc(name(p))}<div class="muted">${it.qty} × ${fmt.amount(it.price)}${it.discount ? ` − ${fmt.amount(it.discount)}` : ''}</div></td><td class="end">${fmt.amount(line)}</td></tr>`;
      })
      .join('');
    const pays = sale.payments.map((p) => `<tr><td>${method(p.method)}</td><td class="end">${fmt.amount(p.amount)}</td></tr>`).join('');
    const html = `
      <div class="center">
        <img class="logo" src="${location.origin}/images/apex-logo.png" alt="">
        <h1>${esc(locale === 'ar' ? s.pharmacyNameAr : s.pharmacyName)}</h1>
        <div class="muted">${esc(name(branch))}</div>
        <div class="muted">${esc(s.address)} · ${esc(s.phone)}</div>
        <div class="muted">${t('trn')}: ${esc(s.trn)}</div>
        <div style="margin-top:8px;font-weight:700">${t('taxInvoice')}</div>
      </div>
      <table>
        <tr class="tot"><td>${t('invoice')}</td><td class="end">${esc(sale.number)}</td></tr>
        <tr class="tot"><td>${t('date')}</td><td class="end">${fmt.dateTime(sale.createdAt)}</td></tr>
        ${emp ? `<tr class="tot"><td>${t('cashier')}</td><td class="end">${esc(emp.name)}</td></tr>` : ''}
        ${cust ? `<tr class="tot"><td>${tc('customer')}</td><td class="end">${esc(cust.name)}</td></tr>` : ''}
      </table>
      <table><thead><tr><th>${t('item')}</th><th class="end">${tc('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
      <table>
        <tr class="tot"><td>${tc('subtotal')}</td><td class="end">${fmt.amount(sale.subtotal)}</td></tr>
        ${sale.discount ? `<tr class="tot"><td>${tc('discount')}</td><td class="end">−${fmt.amount(sale.discount)}</td></tr>` : ''}
        <tr class="tot"><td>${tc('vat')} (${s.vatRate}%)</td><td class="end">${fmt.amount(sale.vat)}</td></tr>
        <tr class="grand"><td>${tc('total')} (${fmt.currency})</td><td class="end">${fmt.amount(sale.total)}</td></tr>
      </table>
      <table><thead><tr><th>${t('paidBy')}</th><th class="end">${tc('amount')}</th></tr></thead><tbody>${pays}
        ${change > 0 ? `<tr><td>${t('change')}</td><td class="end">${fmt.amount(change)}</td></tr>` : ''}</tbody></table>
      ${sale.pointsEarned ? `<p class="center" style="margin-top:10px">${t('points')}: <b>${sale.pointsEarned}</b></p>` : ''}
      <p class="center muted" style="margin-top:14px">${esc(s.receiptFooter)}</p>`;
    printHtml(sale.number, html, locale === 'ar' ? 'rtl' : 'ltr');
  };
}

/* ------------------------------ customer form ----------------------------- */
const blank = { name: '', phone: '', email: '', gender: '' as '' | 'male' | 'female', dob: '', insuranceId: '', insuranceNo: '', allergies: '', conditions: '', notes: '' };

export function CustomerFormModal({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: Customer | null; onSaved?: (c: Customer) => void }) {
  const t = useTranslations('ErpSales.customers');
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const name = useName();
  const insurers = useErp((d) => d.insurers);
  const [v, setV] = useState(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErr({});
    setV(
      customer
        ? {
            name: customer.name,
            phone: customer.phone,
            email: customer.email ?? '',
            gender: customer.gender ?? '',
            dob: customer.dob ?? '',
            insuranceId: customer.insuranceId ?? '',
            insuranceNo: customer.insuranceNo ?? '',
            allergies: customer.allergies ?? '',
            conditions: customer.conditions ?? '',
            notes: customer.notes ?? ''
          }
        : blank
    );
  }, [open, customer]);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = t('nameRequired');
    if (!v.phone.trim()) e.phone = t('phoneRequired');
    setErr(e);
    if (Object.keys(e).length) return;
    const data = {
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: v.email.trim() || undefined,
      gender: v.gender || undefined,
      dob: v.dob || undefined,
      insuranceId: v.insuranceId || undefined,
      insuranceNo: v.insuranceId ? v.insuranceNo.trim() || undefined : undefined,
      allergies: v.allergies.trim() || undefined,
      conditions: v.conditions.trim() || undefined,
      notes: v.notes.trim() || undefined
    };
    let saved: Customer;
    if (customer) {
      erp.update('customers', customer._id, data);
      saved = { ...customer, ...data };
      toast.success(t('updated'));
    } else {
      saved = erp.insert('customers', { ...data, loyaltyPoints: 0, createdAt: nowISO() }) as Customer;
      toast.success(t('created'));
    }
    onSaved?.(saved);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={customer ? t('edit') : t('add')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {tc('save')}
          </Button>
        </>
      }>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={tc('name')} required error={err.name}>
          <Input value={v.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label={tc('phone')} required error={err.phone}>
          <Input value={v.phone} onChange={set('phone')} dir="ltr" />
        </Field>
        <Field label={tc('email')}>
          <Input type="email" value={v.email} onChange={set('email')} dir="ltr" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('gender')}>
            <Select value={v.gender} onChange={set('gender')}>
              <option value="">—</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </Select>
          </Field>
          <Field label={t('dob')}>
            <Input type="date" value={v.dob} onChange={set('dob')} />
          </Field>
        </div>
        <Field label={t('insurer')}>
          <Select value={v.insuranceId} onChange={set('insuranceId')}>
            <option value="">{t('none')}</option>
            {insurers.map((i) => (
              <option key={i._id} value={i._id}>
                {name(i)} ({i.coveragePct}%)
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('policyNo')}>
          <Input value={v.insuranceNo} onChange={set('insuranceNo')} disabled={!v.insuranceId} dir="ltr" />
        </Field>
        <Field label={t('allergies')}>
          <Input value={v.allergies} onChange={set('allergies')} placeholder={t('allergiesPh')} />
        </Field>
        <Field label={t('conditions')}>
          <Input value={v.conditions} onChange={set('conditions')} placeholder={t('conditionsPh')} />
        </Field>
        <Field label={tc('notes')} className="sm:col-span-2">
          <Textarea value={v.notes} onChange={set('notes')} />
        </Field>
      </div>
    </Modal>
  );
}

/** Words from a customer's allergy text that appear in a product title (simple screening). */
export function allergyHits(allergies: string | undefined, productTitle: string): string[] {
  if (!allergies) return [];
  const title = productTitle.toLowerCase();
  return allergies
    .split(/[,،;/]+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 2 && title.includes(a.toLowerCase().replace(/s$/, '')));
}

export const initials = (n: string) =>
  n
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
