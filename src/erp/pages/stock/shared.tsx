/** Helpers shared by the Inventory & Purchasing pages. */
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useCatalog, useName } from '../../hooks';
import { daysUntil } from '../../store';
import type { Batch, Branch, ErpData, ID } from '../../types';
import { Badge, cx, ProductThumb } from '../../ui/kit';

export const useTs = () => useTranslations('ErpStock');

/** Short branch name ("Dubai Marina" instead of "Apex Aora Pharmacy — Dubai Marina"). */
export function useBranchName() {
  const name = useName();
  return (b?: Branch | null) => (b ? name(b).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '') : '—');
}
export function useBranchLookup() {
  const { branches } = useCatalog();
  const bn = useBranchName();
  return (id?: ID) => bn(branches.find((b) => b._id === id));
}

/** Badge showing days to expiry (red when expired, amber when within warning window). */
export function ExpiryBadge({ expiry, warn = 90 }: { expiry: string; warn?: number }) {
  const t = useTs();
  const n = daysUntil(expiry);
  if (n < 0) return <Badge tone="red">{t('common.expiredAgo', { n: -n })}</Badge>;
  return <Badge tone={n <= 30 ? 'red' : n <= warn ? 'amber' : 'green'}>{t('common.daysLeft', { n })}</Badge>;
}

/** Retail value helper. */
export const batchValue = (b: Batch) => b.qty * b.cost;

/** Supplier balance (unpaid invoices). */
export const supplierBalance = (d: ErpData, supplierId: ID) => d.supplierInvoices.filter((i) => i.supplierId === supplierId).reduce((t, i) => t + (i.amount - i.paid), 0);

/** Searchable product picker that adds a product to a list. */
export function ProductPicker({ onPick, exclude = [], className }: { onPick: (id: ID) => void; exclude?: ID[]; className?: string }) {
  const t = useTs();
  const name = useName();
  const { products, meta } = useCatalog();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => !exclude.includes(p._id))
      .filter((p) => !s || p.title.toLowerCase().includes(s) || (p.titleAr ?? '').includes(s) || meta[p._id]?.barcode.includes(s))
      .slice(0, 8);
  }, [q, products, meta, exclude]);
  return (
    <div className={cx('relative', className)}>
      <div className="relative">
        <Plus className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('common.searchProduct')}
          className="w-full h-10 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 ps-9 pe-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/25 focus:border-brand-gold/50 focus:bg-white"
        />
      </div>
      {open && list.length > 0 && (
        <div className="absolute z-30 top-11 inset-x-0 bg-white rounded-xl border border-slate-200 shadow-xl p-1 max-h-72 overflow-y-auto">
          {list.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={() => {
                onPick(p._id);
                setQ('');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-start">
              <ProductThumb src={p.imageCover} size="w-8 h-8" />
              <span className="text-sm text-brand-dark truncate">{name(p)}</span>
              <span className="ms-auto text-[11px] text-slate-400 tabular-nums">{meta[p._id]?.barcode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Product cell: thumb + localized name + secondary line. */
export function ProductCell({ id, sub }: { id: ID; sub?: React.ReactNode }) {
  const { productMap } = useCatalog();
  const name = useName();
  const p = productMap.get(id);
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <ProductThumb src={p?.imageCover} size="w-9 h-9" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-brand-dark truncate max-w-[260px]">{name(p) || '—'}</span>
        {sub && <span className="block text-[11px] text-slate-400 truncate">{sub}</span>}
      </span>
    </span>
  );
}

/** Small inline toast-free error display helper for store errors. */
export function errText(t: (k: string, v?: Record<string, string | number>) => string, e: unknown, productName?: (id: string) => string) {
  const msg = e instanceof Error ? e.message : '';
  if (msg.startsWith('NOT_ENOUGH_STOCK:')) return t('Erp.common.notEnoughStock', { name: productName?.(msg.split(':')[1]) ?? '' });
  return t('Erp.errors.generic');
}
