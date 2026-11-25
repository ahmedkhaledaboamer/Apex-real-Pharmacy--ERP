import { useMemo, useSyncExternalStore } from 'react';
import { useLocale } from '../lib/i18n';
import { branches, catalogProducts, categories, getState, subscribe } from './store';
import type { Branch, CatalogProduct, ErpData, ID } from './types';

/** Whole ERP state (re-renders on every write). Prefer selecting with useMemo on top. */
export function useErpState(): ErpData {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Selects part of the state: `const sales = useErp((d) => d.sales)` */
export function useErp<T>(select: (d: ErpData) => T): T {
  const d = useErpState();
  return useMemo(() => select(d), [d]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Website catalog products + branches (re-read whenever ERP data changes, since stock syncs into them). */
export function useCatalog() {
  const d = useErpState();
  return useMemo(() => {
    const products = catalogProducts();
    const map = new Map<ID, CatalogProduct>(products.map((p) => [p._id, p]));
    const cats = categories();
    return { products, productMap: map, categories: cats, branches: branches(), meta: d.productMeta };
  }, [d]);
}

export function useCurrentBranch(): Branch | undefined {
  const d = useErpState();
  return useMemo(() => branches().find((b) => b._id === d.settings.currentBranchId) ?? branches()[0], [d]);
}

/* ------------------------------- formatting ------------------------------ */
export function useFmt() {
  const locale = useLocale();
  return useMemo(() => {
    const tag = locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE';
    const num = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
    const int = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
    const money = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 });
    const date = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' });
    const dateShort = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' });
    const dateTime = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const time = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' });
    const monthName = new Intl.DateTimeFormat(tag, { month: 'short', year: '2-digit' });
    const cur = locale === 'ar' ? 'د.إ' : 'AED';
    const toDate = (v: string | Date) => (typeof v === 'string' ? new Date(v.length === 10 ? `${v}T00:00:00` : v) : v);
    return {
      locale,
      /** 1,234.50 AED */
      money: (n: number) => (locale === 'ar' ? `${money.format(n)} ${cur}` : `${cur} ${money.format(n)}`),
      /** money without currency */
      amount: (n: number) => money.format(n),
      moneyCompact: (n: number) => (locale === 'ar' ? `${compact.format(n)} ${cur}` : `${cur} ${compact.format(n)}`),
      num: (n: number) => num.format(n),
      int: (n: number) => int.format(n),
      compact: (n: number) => compact.format(n),
      pct: (n: number) => `${num.format(Math.round(n * 10) / 10)}%`,
      date: (v: string | Date) => date.format(toDate(v)),
      dateShort: (v: string | Date) => dateShort.format(toDate(v)),
      dateTime: (v: string | Date) => dateTime.format(toDate(v)),
      time: (v: string | Date) => time.format(toDate(v)),
      month: (v: string | Date) => monthName.format(toDate(v)),
      currency: cur
    };
  }, [locale]);
}

/** Localised name for anything with name/nameAr or title/titleAr. */
export function useName() {
  const locale = useLocale();
  return (x?: { name?: string; nameAr?: string; title?: string; titleAr?: string } | null) =>
    !x ? '' : locale === 'ar' ? x.nameAr || x.titleAr || x.name || x.title || '' : x.name || x.title || x.nameAr || x.titleAr || '';
}
