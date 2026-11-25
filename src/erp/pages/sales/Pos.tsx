import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileHeart,
  Minus,
  PauseCircle,
  Percent,
  Pill,
  Plus,
  Printer,
  ScanBarcode,
  ShieldCheck,
  ShoppingBag,
  Split,
  Star,
  Trash2,
  UserPlus,
  UserRound,
  X
} from 'lucide-react';
import { useTranslations } from '../../../lib/i18n';
import { useToast } from '../../../components/ui/Toast';
import { computeTotals, createSale, round2, sellPrice, stockOf } from '../../store';
import { useCatalog, useCurrentBranch, useErpState, useFmt, useName } from '../../hooks';
import { Badge, Button, Field, Input, Modal, ProductThumb, cx } from '../../ui/kit';
import type { CatalogProduct, Customer, ID, Prescription, Sale } from '../../types';
import { CustomerFormModal, allergyHits, initials, usePrintReceipt, useSaleError } from './shared';

interface Line {
  productId: ID;
  qty: number;
  price: number;
  discount: number;
}
interface Held {
  id: string;
  at: string;
  lines: Line[];
  customerId?: ID;
  rxId?: ID;
}
const HELD_KEY = 'erp_pos_held';
const loadHeld = (): Held[] => {
  try {
    return JSON.parse(localStorage.getItem(HELD_KEY) || '[]');
  } catch {
    return [];
  }
};

export default function PosPage() {
  const t = useTranslations('ErpSales.pos');
  const tc = useTranslations('Erp.common');
  const toast = useToast();
  const fmt = useFmt();
  const name = useName();
  const d = useErpState();
  const branch = useCurrentBranch();
  const { products, categories, meta } = useCatalog();
  const saleError = useSaleError();
  const printReceipt = usePrintReceipt();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('');
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState<ID | undefined>();
  const [useInsurance, setUseInsurance] = useState(false);
  const [rxId, setRxId] = useState<ID | undefined>();
  const [invDiscount, setInvDiscount] = useState(0);
  const [redeem, setRedeem] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [done, setDone] = useState<{ sale: Sale; change: number } | null>(null);
  const [custModal, setCustModal] = useState(false);
  const [rxModal, setRxModal] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [held, setHeld] = useState<Held[]>(loadHeld);
  const searchRef = useRef<HTMLInputElement>(null);

  const branchId = branch?._id ?? '';
  const customer = d.customers.find((c) => c._id === customerId);
  const insurer = customer?.insuranceId ? d.insurers.find((i) => i._id === customer.insuranceId) : undefined;
  const session = d.cashSessions.find((s) => s.status === 'open' && s.branchId === branchId);
  const stockMap = useMemo(() => new Map(products.map((p) => [p._id, stockOf(d, p._id, branchId)])), [products, d, branchId]);

  useEffect(() => localStorage.setItem(HELD_KEY, JSON.stringify(held)), [held]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category === cat) && (!s || p.title.toLowerCase().includes(s) || (p.titleAr ?? '').includes(q.trim()) || meta[p._id]?.barcode.includes(s)));
  }, [products, q, cat, meta]);

  const totals = useMemo(
    () => computeTotals(lines, { discount: invDiscount, customer, useInsurance: useInsurance && !!insurer, redeemPoints: redeem }),
    [lines, invDiscount, customer, useInsurance, insurer, redeem, d] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const add = (p: CatalogProduct, qty = 1) => {
    const stock = stockMap.get(p._id) ?? 0;
    setLines((ls) => {
      const ex = ls.find((l) => l.productId === p._id);
      const next = (ex?.qty ?? 0) + qty;
      if (next > stock) {
        toast.error(stock ? t('maxStock', { n: stock }) : t('notEnough', { name: name(p) }));
        return ls;
      }
      return ex ? ls.map((l) => (l.productId === p._id ? { ...l, qty: next } : l)) : [...ls, { productId: p._id, qty, price: sellPrice(p), discount: 0 }];
    });
  };
  const setQty = (id: ID, qty: number) => {
    const stock = stockMap.get(id) ?? 0;
    if (qty > stock) return toast.error(t('maxStock', { n: stock }));
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.productId !== id) : ls.map((l) => (l.productId === id ? { ...l, qty } : l))));
  };
  const reset = () => {
    setLines([]);
    setCustomerId(undefined);
    setUseInsurance(false);
    setRxId(undefined);
    setInvDiscount(0);
    setRedeem(0);
    searchRef.current?.focus();
  };

  const loadRx = (rx: Prescription) => {
    reset();
    setCustomerId(rx.customerId);
    const c = d.customers.find((x) => x._id === rx.customerId);
    setUseInsurance(!!c?.insuranceId);
    setRxId(rx._id);
    setLines(
      rx.items
        .map((it) => {
          const p = products.find((x) => x._id === it.productId);
          return p ? { productId: p._id, qty: Math.min(it.qty, Math.max(1, stockMap.get(p._id) ?? 0)), price: sellPrice(p), discount: 0 } : null;
        })
        .filter(Boolean) as Line[]
    );
    toast.success(t('rxLoaded', { n: rx.number }));
  };
  // ?rx=<id> from the Prescriptions page
  useEffect(() => {
    const id = params.get('rx');
    if (!id) return;
    const rx = d.prescriptions.find((r) => r._id === id && r.status === 'pending');
    if (rx) loadRx(rx);
    params.delete('rx');
    setParams(params, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'F9' && lines.length && !payOpen && !done) {
        e.preventDefault();
        setPayOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lines.length, payOpen, done]);

  const onSearchEnter = () => {
    const s = q.trim();
    if (!s) return;
    const byCode = products.find((p) => meta[p._id]?.barcode === s);
    const pick = byCode ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (pick) {
      add(pick);
      setQ('');
    }
  };

  const hold = () => {
    if (!lines.length) return;
    setHeld((h) => [{ id: crypto.randomUUID(), at: new Date().toISOString(), lines, customerId, rxId }, ...h].slice(0, 6));
    toast.success(t('heldSaved'));
    reset();
  };
  const resume = (h: Held) => {
    if (lines.length) hold();
    setLines(h.lines);
    setCustomerId(h.customerId);
    setRxId(h.rxId);
    setHeld((all) => all.filter((x) => x.id !== h.id));
    setHeldOpen(false);
  };

  const maxRedeem = Math.min(customer?.loyaltyPoints ?? 0, Math.floor(Math.max(0, totals.subtotal - invDiscount) / d.settings.pointValue));
  const employeeId = session?.employeeId ?? d.employees.find((e) => e.branchId === branchId && e.active)?._id;

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)]">
      {/* ------------------------------ catalog ------------------------------ */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="p-4 lg:p-5 pb-3 space-y-3 border-b border-slate-200/70 bg-[#F5F6FB]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
              <input
                ref={searchRef}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
                placeholder={t('search')}
                className="w-full h-12 rounded-2xl bg-white border border-slate-200 ps-11 pe-4 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/25 focus:border-brand-gold/50"
              />
            </div>
            <Button size="lg" icon={PauseCircle} onClick={() => setHeldOpen(true)} className="relative">
              <span className="hidden md:inline">{t('held')}</span>
              {!!held.length && <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-brand-gold text-white text-[10px] font-bold flex items-center justify-center">{held.length}</span>}
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[{ _id: '', name: t('allCategories'), nameAr: t('allCategories'), color: '#0B1F5C' }, ...categories].map((c) => (
              <button
                key={c._id}
                onClick={() => setCat(c._id)}
                className={cx('shrink-0 h-9 px-4 rounded-full text-sm font-semibold border transition', cat === c._id ? 'text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}
                style={cat === c._id ? { background: c.color ?? '#7A1FB8' } : undefined}>
                {name(c)}
              </button>
            ))}
          </div>
          {!session && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200/70 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t('noSession')}</span>
              <Link to="/erp/cash" className="font-semibold underline underline-offset-2">
                {t('openSession')}
              </Link>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 bg-[#F5F6FB]">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filtered.map((p) => {
              const stock = stockMap.get(p._id) ?? 0;
              const inCart = lines.find((l) => l.productId === p._id)?.qty ?? 0;
              return (
                <button
                  key={p._id}
                  disabled={!stock}
                  onClick={() => add(p)}
                  className={cx('group relative text-start bg-white rounded-2xl border p-2.5 transition flex flex-col', stock ? 'border-slate-200/70 hover:border-brand-gold/40 hover:shadow-lg hover:-translate-y-0.5' : 'opacity-50 border-slate-200/70 cursor-not-allowed', inCart > 0 && 'ring-2 ring-brand-gold/60')}>
                  <div className="relative aspect-[4/3] rounded-xl bg-slate-50 overflow-hidden mb-2">
                    <img src={p.imageCover} alt="" loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    {meta[p._id]?.rx && (
                      <Badge tone="red" className="absolute top-1.5 start-1.5">
                        {t('rx')}
                      </Badge>
                    )}
                    {!!inCart && <span className="absolute top-1.5 end-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-brand-gold text-white text-[11px] font-bold flex items-center justify-center">{inCart}</span>}
                  </div>
                  <p className="text-[13px] font-semibold text-brand-dark leading-snug line-clamp-2 min-h-[2.4em]">{name(p)}</p>
                  <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
                    <span className="text-sm font-bold text-brand-dark tabular-nums">{fmt.money(sellPrice(p))}</span>
                    <span className={cx('text-[10px] font-semibold', stock === 0 ? 'text-rose-600' : stock <= (meta[p._id]?.reorderLevel ?? 10) ? 'text-amber-600' : 'text-slate-400')}>{stock ? t('inStock', { n: stock }) : t('outOfStock')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------- cart -------------------------------- */}
      <aside className="w-full lg:w-[400px] xl:w-[440px] shrink-0 bg-white border-s border-slate-200/70 flex flex-col lg:h-full">
        {/* customer */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-gold" />
              {t('cart')}
            </h2>
            <span className="text-[11px] text-slate-400">{t('shortcuts')}</span>
          </div>
          {customer ? (
            <CustomerCard customer={customer} insurerName={insurer ? `${name(insurer)}` : undefined} pct={insurer?.coveragePct} onClear={() => (setCustomerId(undefined), setUseInsurance(false), setRedeem(0))} />
          ) : (
            <CustomerPicker customers={d.customers} onPick={(c) => (setCustomerId(c._id), setUseInsurance(!!c.insuranceId))} onNew={() => setCustModal(true)} />
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="soft" icon={FileHeart} onClick={() => setRxModal(true)}>
              {t('loadRx')}
            </Button>
            {rxId && (
              <Badge tone="purple">
                {t('prescription')} {d.prescriptions.find((r) => r._id === rxId)?.number}
                <button onClick={() => setRxId(undefined)} aria-label="remove">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* lines */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[160px]">
          {!lines.length && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <span className="w-14 h-14 rounded-2xl bg-brand-pink text-brand-gold flex items-center justify-center mb-3">
                <ScanBarcode className="w-7 h-7" />
              </span>
              <p className="font-semibold text-brand-dark">{t('emptyCart')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('emptyCartHint')}</p>
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {lines.map((l) => {
              const p = products.find((x) => x._id === l.productId);
              if (!p) return null;
              const hits = allergyHits(customer?.allergies, `${p.title} ${p.titleAr ?? ''}`);
              return (
                <li key={l.productId} className="py-3">
                  <div className="flex gap-3">
                    <ProductThumb src={p.imageCover} size="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-brand-dark leading-snug line-clamp-2">{name(p)}</p>
                        <button onClick={() => setQty(l.productId, 0)} className="text-slate-300 hover:text-rose-500 shrink-0" aria-label={tc('delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {!!hits.length && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                          <AlertTriangle className="w-3 h-3" />
                          {t('allergies', { v: hits.join(', ') })}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-lg border border-slate-200">
                          <button onClick={() => setQty(l.productId, l.qty - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-brand-dark" aria-label="-">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                          <button onClick={() => setQty(l.productId, l.qty + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-brand-dark" aria-label="+">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums">× {fmt.amount(l.price)}</span>
                        <label className="ms-auto flex items-center gap-1 text-[11px] text-slate-400" title={t('lineDiscount')}>
                          <Percent className="w-3 h-3" />
                          <input
                            type="number"
                            min={0}
                            value={l.discount || ''}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(l.price * l.qty, Number(e.target.value) || 0));
                              setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, discount: v } : x)));
                            }}
                            placeholder="0"
                            className="w-14 h-7 rounded-md border border-slate-200 px-1.5 text-xs text-brand-dark text-end focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                          />
                        </label>
                        <span className="w-20 text-end text-sm font-bold text-brand-dark tabular-nums">{fmt.amount(l.price * l.qty - l.discount)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* totals */}
        <div className="border-t border-slate-200/70 p-4 space-y-3 bg-slate-50/60">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 h-9 rounded-lg border border-slate-200 bg-white px-2.5">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              <input type="number" min={0} value={invDiscount || ''} onChange={(e) => setInvDiscount(Math.max(0, Number(e.target.value) || 0))} placeholder={t('invoiceDiscount')} className="w-full bg-transparent text-xs focus:outline-none" />
            </label>
            <label className={cx('flex items-center gap-2 h-9 rounded-lg border border-slate-200 bg-white px-2.5', !customer?.loyaltyPoints && 'opacity-50')} title={customer ? t('pointsAvailable', { n: customer.loyaltyPoints, v: fmt.money(customer.loyaltyPoints * d.settings.pointValue) }) : undefined}>
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <input type="number" min={0} max={maxRedeem} disabled={!customer?.loyaltyPoints} value={redeem || ''} onChange={(e) => setRedeem(Math.max(0, Math.min(maxRedeem, Math.floor(Number(e.target.value) || 0))))} placeholder={customer ? `${t('redeem')} (${customer.loyaltyPoints})` : t('points')} className="w-full bg-transparent text-xs focus:outline-none" />
            </label>
          </div>
          {insurer && (
            <label className="flex items-center justify-between gap-2 rounded-lg bg-teal-50 border border-teal-200/70 px-3 h-9 text-xs font-semibold text-teal-800 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {t('useInsurance')} · {insurer.coveragePct}%
              </span>
              <input type="checkbox" checked={useInsurance} onChange={(e) => setUseInsurance(e.target.checked)} className="w-4 h-4 accent-teal-600" />
            </label>
          )}
          <dl className="space-y-1.5 text-sm">
            <Row label={tc('subtotal')} value={fmt.money(totals.subtotal)} />
            {totals.discount > 0 && <Row label={tc('discount')} value={`− ${fmt.money(totals.discount)}`} accent="text-rose-600" />}
            <Row label={`${tc('vat')} (${d.settings.vatRate}%)`} value={fmt.money(totals.vat)} />
            <div className="flex items-baseline justify-between pt-2 border-t border-dashed border-slate-200">
              <dt className="font-semibold text-brand-dark">{tc('total')}</dt>
              <dd className="text-xl font-extrabold text-brand-dark tabular-nums">{fmt.money(totals.total)}</dd>
            </div>
            {totals.insuranceShare > 0 && (
              <>
                <Row label={t('insuranceShare')} value={fmt.money(totals.insuranceShare)} accent="text-teal-700" />
                <Row label={t('patientPays')} value={fmt.money(totals.patientShare)} accent="text-brand-dark font-bold" />
              </>
            )}
          </dl>
          <div className="grid grid-cols-[auto_auto_1fr] gap-2">
            <Button size="lg" variant="ghost" icon={Trash2} onClick={reset} disabled={!lines.length} aria-label={t('clear')} />
            <Button size="lg" icon={PauseCircle} onClick={hold} disabled={!lines.length}>
              {t('hold')}
            </Button>
            <Button size="lg" variant="primary" disabled={!lines.length} onClick={() => setPayOpen(true)} className="text-base">
              {t('pay')} · {fmt.money(totals.patientShare)}
            </Button>
          </div>
        </div>
      </aside>

      <PaymentModal
        open={payOpen}
        due={totals.patientShare}
        onClose={() => setPayOpen(false)}
        onPay={(payments, change) => {
          try {
            const sale = createSale({
              branchId,
              employeeId,
              sessionId: session?._id,
              customerId,
              prescriptionId: rxId,
              lines,
              discount: invDiscount,
              payments,
              useInsurance: useInsurance && !!insurer,
              redeemPoints: redeem
            });
            setPayOpen(false);
            setDone({ sale, change });
            reset();
          } catch (e) {
            toast.error(saleError(e));
          }
        }}
      />

      <Modal
        open={!!done}
        onClose={() => setDone(null)}
        size="sm"
        title={t('saleDone')}
        footer={
          <>
            <Button icon={Printer} onClick={() => done && printReceipt(done.sale, done.change)}>
              {tc('print')}
            </Button>
            <Button variant="primary" onClick={() => setDone(null)}>
              {t('newSale')}
            </Button>
          </>
        }>
        {done && (
          <div className="text-center">
            <span className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-9 h-9" />
            </span>
            <p className="text-sm text-slate-500">{done.sale.number}</p>
            <p className="text-3xl font-extrabold text-brand-dark tabular-nums mt-1">{fmt.money(done.sale.total)}</p>
            {done.change > 0 && (
              <div className="mt-4 rounded-2xl bg-brand-pink/60 py-3">
                <p className="text-xs font-semibold text-brand-gold">{t('change')}</p>
                <p className="text-2xl font-extrabold text-brand-dark tabular-nums">{fmt.money(done.change)}</p>
              </div>
            )}
            {done.sale.pointsEarned > 0 && (
              <p className="mt-3 text-sm text-slate-600 inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                {t('pointsEarned')}: <b>{done.sale.pointsEarned}</b>
              </p>
            )}
          </div>
        )}
      </Modal>

      <CustomerFormModal open={custModal} onClose={() => setCustModal(false)} onSaved={(c) => (setCustomerId(c._id), setUseInsurance(!!c.insuranceId))} />

      <Modal open={rxModal} onClose={() => setRxModal(false)} title={t('loadRx')} size="md">
        {(() => {
          const pending = d.prescriptions.filter((r) => r.status === 'pending').sort((a, b) => (a.branchId === branchId ? -1 : 0) - (b.branchId === branchId ? -1 : 0));
          if (!pending.length) return <p className="text-sm text-slate-500 py-6 text-center">{t('noPendingRx')}</p>;
          return (
            <ul className="divide-y divide-slate-100">
              {pending.map((r) => {
                const c = d.customers.find((x) => x._id === r.customerId);
                return (
                  <li key={r._id}>
                    <button
                      onClick={() => {
                        loadRx(r);
                        setRxModal(false);
                      }}
                      className="w-full flex items-center gap-3 py-3 text-start hover:bg-slate-50 rounded-xl px-2">
                      <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Pill className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-brand-dark">
                          {r.number} · {c?.name}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {r.doctorName} · {r.items.map((i) => name(products.find((p) => p._id === i.productId))).join(', ')}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">{fmt.dateShort(r.date)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </Modal>

      <Modal open={heldOpen} onClose={() => setHeldOpen(false)} title={t('held')} size="sm">
        {!held.length && <p className="text-sm text-slate-500 py-6 text-center">{t('noHeld')}</p>}
        <ul className="space-y-2">
          {held.map((h) => {
            const total = computeTotals(h.lines).total;
            const c = d.customers.find((x) => x._id === h.customerId);
            return (
              <li key={h.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">
                    {fmt.time(h.at)} · {c?.name ?? tc('walkIn')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tc('items', { n: h.lines.length })} · {fmt.money(total)}
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={() => resume(h)}>
                  {t('resume')}
                </Button>
                <button onClick={() => setHeld((all) => all.filter((x) => x.id !== h.id))} className="text-slate-300 hover:text-rose-500" aria-label={tc('delete')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cx('tabular-nums', accent ?? 'text-brand-dark')}>{value}</dd>
    </div>
  );
}

function CustomerPicker({ customers, onPick, onNew }: { customers: Customer[]; onPick: (c: Customer) => void; onNew: () => void }) {
  const t = useTranslations('ErpSales.pos');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers.slice(-5).reverse();
    return customers.filter((c) => c.name.toLowerCase().includes(s) || c.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 6);
  }, [q, customers]);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <UserRound className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('chooseCustomer')}
          className="w-full h-10 rounded-xl border border-slate-200 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/25"
        />
        {open && !!res.length && (
          <ul className="absolute z-30 top-11 inset-x-0 bg-white rounded-xl border border-slate-200 shadow-xl p-1 max-h-64 overflow-y-auto">
            {res.map((c) => (
              <li key={c._id}>
                <button
                  onMouseDown={() => {
                    onPick(c);
                    setQ('');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-start">
                  <span className="w-8 h-8 rounded-full bg-brand-pink text-brand-gold text-[11px] font-bold flex items-center justify-center">{initials(c.name)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-brand-dark truncate">{c.name}</span>
                    <span className="block text-[11px] text-slate-400" dir="ltr">
                      {c.phone}
                    </span>
                  </span>
                  {c.insuranceId && <ShieldCheck className="w-4 h-4 text-teal-600" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button icon={UserPlus} onClick={onNew} aria-label={t('newCustomer')} title={t('newCustomer')} />
    </div>
  );
}

function CustomerCard({ customer, insurerName, pct, onClear }: { customer: Customer; insurerName?: string; pct?: number; onClear: () => void }) {
  const t = useTranslations('ErpSales.pos');
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-goldLight text-white text-xs font-bold flex items-center justify-center">{initials(customer.name)}</span>
        <div className="flex-1 min-w-0">
          <Link to={`/erp/customers/${customer._id}`} className="block text-sm font-semibold text-brand-dark truncate hover:underline">
            {customer.name}
          </Link>
          <p className="text-[11px] text-slate-500 flex items-center gap-2">
            <span dir="ltr">{customer.phone}</span>
            <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
              <Star className="w-3 h-3" />
              {customer.loyaltyPoints}
            </span>
          </p>
        </div>
        <button onClick={onClear} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center" aria-label={t('removeCustomer')}>
          <X className="w-4 h-4" />
        </button>
      </div>
      {(customer.allergies || customer.conditions || insurerName) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {customer.allergies && (
            <Badge tone="red">
              <AlertTriangle className="w-3 h-3" />
              {t('allergies', { v: customer.allergies })}
            </Badge>
          )}
          {customer.conditions && <Badge tone="amber">{t('conditions', { v: customer.conditions })}</Badge>}
          {insurerName && (
            <Badge tone="teal">
              <ShieldCheck className="w-3 h-3" />
              {t('insured', { name: insurerName, pct: pct ?? 0 })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentModal({ open, due, onClose, onPay }: { open: boolean; due: number; onClose: () => void; onPay: (payments: { method: 'cash' | 'card'; amount: number }[], change: number) => void }) {
  const t = useTranslations('ErpSales.pos');
  const tc = useTranslations('Erp.common');
  const fmt = useFmt();
  const [mode, setMode] = useState<'cash' | 'card' | 'split'>('cash');
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  useEffect(() => {
    if (open) {
      setMode('cash');
      setCash('');
      setCard('');
    }
  }, [open]);
  const cashN = Number(cash) || 0;
  const cardN = mode === 'card' ? due : mode === 'split' ? Math.min(due, Number(card) || 0) : 0;
  const received = round2(cashN + cardN);
  const remaining = round2(Math.max(0, due - received));
  const change = round2(Math.max(0, received - due));
  const ok = due <= 0 || remaining <= 0.009;
  const quick = Array.from(new Set([due, Math.ceil(due / 10) * 10, Math.ceil(due / 50) * 50, Math.ceil(due / 100) * 100, Math.ceil(due / 200) * 200].filter((v) => v > 0))).slice(0, 5);
  const submit = () => {
    if (!ok) return;
    const payments: { method: 'cash' | 'card'; amount: number }[] = [];
    if (cardN > 0) payments.push({ method: 'card', amount: cardN });
    if (cashN > 0) payments.push({ method: 'cash', amount: cashN });
    onPay(payments, mode === 'card' ? 0 : change);
  };
  const methods = [
    { k: 'cash' as const, icon: Banknote, label: tc('cash') },
    { k: 'card' as const, icon: CreditCard, label: tc('card') },
    { k: 'split' as const, icon: Split, label: t('split') }
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('paymentTitle')}
      footer={
        <>
          <Button onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" size="lg" disabled={!ok} onClick={submit} icon={CheckCircle2}>
            {t('complete')}
          </Button>
        </>
      }>
      <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-[#2A1A6E] text-white p-5 text-center mb-5">
        <p className="text-xs uppercase tracking-wider text-white/60">{t('amountDue')}</p>
        <p className="text-4xl font-extrabold tabular-nums mt-1">{fmt.money(due)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {methods.map((m) => (
          <button
            key={m.k}
            onClick={() => setMode(m.k)}
            className={cx('h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-sm font-semibold transition', mode === m.k ? 'border-brand-gold bg-brand-pink/50 text-brand-gold' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
            <m.icon className="w-5 h-5" />
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'split' && (
        <Field label={t('cardAmount')} className="mb-4">
          <Input type="number" min={0} value={card} onChange={(e) => setCard(e.target.value)} className="h-12 text-lg font-semibold" />
        </Field>
      )}
      {mode !== 'card' && (
        <>
          <Field label={t('cashReceived')}>
            <Input type="number" min={0} autoFocus value={cash} onChange={(e) => setCash(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="h-12 text-lg font-semibold" />
          </Field>
          <div className="flex flex-wrap gap-2 mt-3">
            {(mode === 'split' ? [round2(Math.max(0, due - cardN))] : quick).map((v, i) => (
              <button key={i} onClick={() => setCash(String(v))} className="h-9 px-3.5 rounded-xl bg-slate-100 text-sm font-semibold text-brand-dark hover:bg-slate-200 tabular-nums">
                {i === 0 ? `${t('exact')} · ` : ''}
                {fmt.amount(v)}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">{t('remaining')}</p>
          <p className={cx('text-lg font-bold tabular-nums', remaining > 0 ? 'text-rose-600' : 'text-brand-dark')}>{fmt.money(remaining)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">{t('change')}</p>
          <p className="text-lg font-bold tabular-nums text-emerald-700">{fmt.money(mode === 'card' ? 0 : change)}</p>
        </div>
      </div>
    </Modal>
  );
}
