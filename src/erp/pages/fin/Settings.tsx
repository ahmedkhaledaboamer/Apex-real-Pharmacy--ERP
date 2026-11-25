import { useEffect, useState, type ReactNode } from 'react';
import { Building2, Clock, Gift, Percent, RotateCcw, Save, Settings as SettingsIcon, Store, TriangleAlert } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useErpState, useName } from '../../hooks';
import { erp, resetErp } from '../../store';
import type { ErpSettings } from '../../types';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from '../../ui/kit';

function Section({ title, icon, children, subtitle }: { title: string; subtitle?: string; icon: typeof SettingsIcon; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations('ErpFin.settings');
  const tc = useTranslations('Erp.common');
  const name = useName();
  const toast = useToast();
  const d = useErpState();
  const { branches } = useCatalog();
  const [v, setV] = useState<ErpSettings>(d.settings);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setV(d.settings), [d.settings]);
  const set = <K extends keyof ErpSettings>(k: K, val: ErpSettings[K]) => setV((x) => ({ ...x, [k]: val }));
  const num = (k: 'vatRate' | 'aedPerPoint' | 'pointValue' | 'expiryWarningDays') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));
  const dirty = JSON.stringify(v) !== JSON.stringify(d.settings);
  const save = () => {
    erp.updateSettings({ ...v, vatRate: Math.max(0, v.vatRate), aedPerPoint: Math.max(1, v.aedPerPoint), pointValue: Math.max(0, v.pointValue), expiryWarningDays: Math.max(1, Math.round(v.expiryWarningDays)) });
    toast.success(t('saved'));
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={SettingsIcon}
        actions={
          <Button variant="primary" icon={Save} onClick={save} disabled={!dirty}>
            {tc('save')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Section title={t('profile')} icon={Store}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('nameEn')}>
                <Input value={v.pharmacyName} onChange={(e) => set('pharmacyName', e.target.value)} />
              </Field>
              <Field label={t('nameAr')}>
                <Input dir="rtl" value={v.pharmacyNameAr} onChange={(e) => set('pharmacyNameAr', e.target.value)} />
              </Field>
              <Field label={t('trn')}>
                <Input value={v.trn} onChange={(e) => set('trn', e.target.value)} className="tabular-nums" />
              </Field>
              <Field label={tc('phone')}>
                <Input value={v.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label={tc('email')}>
                <Input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label={t('address')}>
                <Input value={v.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
            </div>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title={t('tax')} icon={Percent}>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('vatRate')}>
                  <Input type="number" min="0" step="0.5" value={v.vatRate} onChange={num('vatRate')} />
                </Field>
                <Field label={t('currency')}>
                  <Input value={v.currency} disabled />
                </Field>
              </div>
            </Section>
            <Section title={t('loyalty')} icon={Gift}>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('aedPerPoint')}>
                  <Input type="number" min="1" value={v.aedPerPoint} onChange={num('aedPerPoint')} />
                </Field>
                <Field label={t('pointValue')}>
                  <Input type="number" min="0" step="0.01" value={v.pointValue} onChange={num('pointValue')} />
                </Field>
              </div>
              <p className="mt-3 text-xs text-slate-500">{t('loyaltyHint', { aed: v.aedPerPoint, value: Math.round(v.pointValue * 100 * 100) / 100 })}</p>
            </Section>
          </div>
          <Section title={t('operations')} icon={Clock}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('expiryDays')}>
                <Input type="number" min="1" value={v.expiryWarningDays} onChange={num('expiryWarningDays')} />
              </Field>
              <Field label={t('currentBranch')}>
                <Select value={v.currentBranchId} onChange={(e) => set('currentBranchId', e.target.value)}>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {name(b)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('receipt')} className="sm:col-span-2">
                <Textarea value={v.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} />
              </Field>
            </div>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title={t('branches')} subtitle={t('branchesSub')} icon={Building2}>
            <ul className="space-y-2">
              {branches.map((b) => (
                <li key={b._id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                  <span className="w-9 h-9 rounded-xl bg-brand-pink text-brand-gold flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-brand-dark truncate">{name(b).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '')}</span>
                    <span className="block text-xs text-slate-500">{name({ name: b.city, nameAr: b.cityAr })}</span>
                  </span>
                  {b.isMain && <Badge tone="purple">{t('main')}</Badge>}
                </li>
              ))}
            </ul>
          </Section>
          <Card className="border-rose-200/70">
            <CardHeader title={t('danger')} subtitle={t('dangerSub')} icon={TriangleAlert} />
            <Button variant="danger" icon={RotateCcw} onClick={() => setConfirm(true)}>
              {t('reset')}
            </Button>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        danger
        title={t('resetTitle')}
        message={t('resetMsg')}
        confirmLabel={t('reset')}
        onConfirm={() => {
          resetErp();
          toast.success(t('resetDone'));
        }}
      />
    </>
  );
}
