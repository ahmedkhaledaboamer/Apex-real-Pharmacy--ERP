import { useMemo } from 'react';
import { daysUntil, stockOf, today } from './store';
import { useCatalog, useCurrentBranch, useErpState } from './hooks';

export type AlertTone = 'red' | 'amber' | 'blue';
export interface ErpAlert {
  key: string;
  /** Erp.layout.* message key */
  msg: string;
  vars: Record<string, number>;
  tone: AlertTone;
  to: string;
}

/** Operational alerts for the current branch (expiry, stock, prescriptions, payables, licences). */
export function useAlerts(): ErpAlert[] {
  const d = useErpState();
  const branch = useCurrentBranch();
  const { products } = useCatalog();
  return useMemo(() => {
    const b = branch?._id;
    const t = today();
    const warn = d.settings.expiryWarningDays;
    const inBranch = d.batches.filter((x) => x.branchId === b && x.qty > 0);
    const expired = inBranch.filter((x) => x.expiry < t).length;
    const expiring = inBranch.filter((x) => x.expiry >= t && daysUntil(x.expiry) <= warn).length;
    let low = 0;
    let out = 0;
    for (const p of products) {
      const s = stockOf(d, p._id, b);
      if (s === 0) out++;
      else if (s <= (d.productMeta[p._id]?.reorderLevel ?? 10)) low++;
    }
    const rx = d.prescriptions.filter((r) => r.status === 'pending' && r.branchId === b).length;
    const overdue = d.supplierInvoices.filter((i) => i.status !== 'paid' && i.dueDate < t).length;
    const licences = d.employees.filter((e) => e.active && e.licenseExpiry && daysUntil(e.licenseExpiry) <= 60).length;
    const list: ErpAlert[] = [];
    if (expired) list.push({ key: 'expired', msg: 'alertExpired', vars: { n: expired }, tone: 'red', to: '/erp/expiry?tab=expired' });
    if (out) list.push({ key: 'out', msg: 'alertOut', vars: { n: out }, tone: 'red', to: '/erp/stock?filter=out' });
    if (expiring) list.push({ key: 'expiring', msg: 'alertExpiring', vars: { n: expiring, days: warn }, tone: 'amber', to: '/erp/expiry' });
    if (low) list.push({ key: 'low', msg: 'alertLow', vars: { n: low }, tone: 'amber', to: '/erp/stock?filter=low' });
    if (overdue) list.push({ key: 'payables', msg: 'alertPayables', vars: { n: overdue }, tone: 'amber', to: '/erp/payables' });
    if (licences) list.push({ key: 'licence', msg: 'alertLicense', vars: { n: licences }, tone: 'amber', to: '/erp/employees' });
    if (rx) list.push({ key: 'rx', msg: 'alertRx', vars: { n: rx }, tone: 'blue', to: '/erp/prescriptions' });
    return list;
  }, [d, branch, products]);
}
