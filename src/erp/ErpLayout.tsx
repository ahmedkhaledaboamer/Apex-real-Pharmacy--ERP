import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChevronsLeft,
  ClipboardCheck,
  ClipboardList,
  FileHeart,
  FileText,
  Globe,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Timer,
  Truck,
  Undo2,
  Users,
  UserSquare2,
  Wallet,
  X,
  type LucideIcon
} from 'lucide-react';
import { useLocale, useSetLocale, useTranslations } from '../lib/i18n';
import { useAuth } from '../auth/AuthContext';
import { useAlerts } from './alerts';
import { useCatalog, useCurrentBranch, useErpState, useName } from './hooks';
import { erp } from './store';
import { cx } from './ui/kit';

interface NavItem {
  to: string;
  key: string;
  icon: LucideIcon;
  end?: boolean;
}
const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ to: '/erp', key: 'overview', icon: LayoutDashboard, end: true }] },
  {
    group: 'groupSales',
    items: [
      { to: '/erp/pos', key: 'pos', icon: ShoppingCart },
      { to: '/erp/invoices', key: 'invoices', icon: Receipt },
      { to: '/erp/returns', key: 'returns', icon: Undo2 },
      { to: '/erp/customers', key: 'customers', icon: UserSquare2 },
      { to: '/erp/prescriptions', key: 'prescriptions', icon: FileHeart },
      { to: '/erp/insurance', key: 'insurance', icon: ShieldCheck }
    ]
  },
  {
    group: 'groupInventory',
    items: [
      { to: '/erp/stock', key: 'stock', icon: Boxes },
      { to: '/erp/expiry', key: 'expiry', icon: CalendarClock },
      { to: '/erp/transfers', key: 'transfers', icon: ArrowLeftRight },
      { to: '/erp/stock-counts', key: 'stockCounts', icon: ClipboardCheck },
      { to: '/erp/movements', key: 'movements', icon: History }
    ]
  },
  {
    group: 'groupPurchasing',
    items: [
      { to: '/erp/suppliers', key: 'suppliers', icon: Truck },
      { to: '/erp/purchase-orders', key: 'purchaseOrders', icon: ClipboardList },
      { to: '/erp/payables', key: 'payables', icon: HandCoins }
    ]
  },
  {
    group: 'groupFinance',
    items: [
      { to: '/erp/expenses', key: 'expenses', icon: Wallet },
      { to: '/erp/cash', key: 'cash', icon: Banknote },
      { to: '/erp/profit-loss', key: 'profitLoss', icon: PieChart }
    ]
  },
  {
    group: 'groupPeople',
    items: [
      { to: '/erp/employees', key: 'employees', icon: Users },
      { to: '/erp/shifts', key: 'shifts', icon: Timer }
    ]
  },
  {
    items: [
      { to: '/erp/reports', key: 'reports', icon: BarChart3 },
      { to: '/erp/settings', key: 'settings', icon: Settings }
    ]
  }
];

function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const t = useTranslations('Erp');
  const alerts = useAlerts();
  const badge: Record<string, number> = {
    expiry: alerts.filter((a) => a.key === 'expired' || a.key === 'expiring').reduce((s, a) => s + a.vars.n, 0),
    prescriptions: alerts.find((a) => a.key === 'rx')?.vars.n ?? 0,
    payables: alerts.find((a) => a.key === 'payables')?.vars.n ?? 0
  };
  return (
    <div className="flex flex-col h-full text-white bg-[radial-gradient(120%_60%_at_0%_0%,#2A1A6E_0%,#0B1F5C_45%,#081640_100%)]">
      <div className={cx('flex items-center h-16 shrink-0 border-b border-white/10', collapsed ? 'justify-center px-2' : 'px-5 gap-3')}>
        <img src="/images/apex-logo-light.png" alt="Apex Aora" className={cx('w-auto', collapsed ? 'h-7 object-cover object-top' : 'h-9')} style={collapsed ? { width: 40, objectPosition: 'center 15%' } : undefined} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">ERP</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 [scrollbar-width:thin]">
        {NAV.map((sec, i) => (
          <div key={i}>
            {sec.group && !collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{t(`nav.${sec.group}`)}</p>}
            {sec.group && collapsed && <div className="mx-3 mb-2 border-t border-white/10" />}
            <ul className="space-y-0.5">
              {sec.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    title={collapsed ? t(`nav.${it.key}`) : undefined}
                    className={({ isActive }) =>
                      cx(
                        'relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition',
                        collapsed ? 'justify-center h-10' : 'px-3 h-9',
                        isActive ? 'bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                      )
                    }>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#B57BFF] to-brand-goldLight" />}
                        <it.icon className={cx('w-[18px] h-[18px] shrink-0', isActive ? 'text-[#C9A4FF]' : '')} />
                        {!collapsed && <span className="truncate">{t(`nav.${it.key}`)}</span>}
                        {!!badge[it.key] && (collapsed ? <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-rose-400" /> : <span className="ms-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/90 text-[10px] font-bold flex items-center justify-center">{badge[it.key]}</span>)}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {onToggle && (
        <button onClick={onToggle} className="hidden lg:flex items-center gap-2 h-11 px-5 border-t border-white/10 text-xs text-white/50 hover:text-white">
          <ChevronsLeft className={cx('w-4 h-4 transition-transform rtl:rotate-180', collapsed && 'rotate-180 rtl:rotate-0')} />
          {!collapsed && t('layout.collapse')}
        </button>
      )}
    </div>
  );
}

function GlobalSearch() {
  const t = useTranslations('Erp.layout');
  const name = useName();
  const navigate = useNavigate();
  const d = useErpState();
  const { products, meta } = useCatalog();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return null;
    return {
      products: products.filter((p) => p.title.toLowerCase().includes(s) || (p.titleAr ?? '').includes(s) || meta[p._id]?.barcode.includes(s)).slice(0, 5),
      customers: d.customers.filter((c) => c.name.toLowerCase().includes(s) || c.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 4),
      invoices: d.sales.filter((x) => x.number.toLowerCase().includes(s)).slice(-4).reverse()
    };
  }, [q, products, meta, d]);
  const go = (to: string) => {
    setOpen(false);
    setQ('');
    navigate(to);
  };
  const empty = res && !res.products.length && !res.customers.length && !res.invoices.length;
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t('search')}
        className="w-full h-10 rounded-xl bg-slate-100/80 border border-transparent ps-9 pe-14 text-sm placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/20"
      />
      <kbd className="hidden md:block absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
      {open && res && (
        <div className="absolute top-12 inset-x-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 max-h-[70vh] overflow-y-auto">
          {empty && <p className="p-4 text-sm text-slate-500 text-center">{t('noResults')}</p>}
          {!!res.products.length && <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('products')}</p>}
          {res.products.map((p) => (
            <button key={p._id} onMouseDown={() => go(`/erp/stock/${p._id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-start">
              <img src={p.imageCover} alt="" className="w-8 h-8 rounded-lg object-contain bg-slate-50" />
              <span className="text-sm text-brand-dark truncate">{name(p)}</span>
              <span className="ms-auto text-[11px] text-slate-400 tabular-nums">{meta[p._id]?.barcode}</span>
            </button>
          ))}
          {!!res.customers.length && <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('customers')}</p>}
          {res.customers.map((c) => (
            <button key={c._id} onMouseDown={() => go(`/erp/customers/${c._id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-start">
              <span className="w-8 h-8 rounded-full bg-brand-pink text-brand-gold text-xs font-bold flex items-center justify-center">{c.name.slice(0, 2).toUpperCase()}</span>
              <span className="text-sm text-brand-dark truncate">{c.name}</span>
              <span className="ms-auto text-[11px] text-slate-400">{c.phone}</span>
            </button>
          ))}
          {!!res.invoices.length && <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('invoices')}</p>}
          {res.invoices.map((s) => (
            <button key={s._id} onMouseDown={() => go(`/erp/invoices/${s._id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-start">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium text-brand-dark">{s.number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Popover({ button, children, align = 'end' }: { button: (toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {button(() => setOpen((o) => !o))}
      {open && <div className={cx('absolute top-12 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl', align === 'end' ? 'end-0' : 'start-0')}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations('Erp.layout');
  const locale = useLocale();
  const setLocale = useSetLocale();
  const name = useName();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const alerts = useAlerts();
  const branch = useCurrentBranch();
  const { branches } = useCatalog();
  const tones = { red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600' };
  return (
    <header className="sticky top-0 z-40 h-16 shrink-0 bg-white/85 backdrop-blur-md border-b border-slate-200/70 flex items-center gap-3 px-4 lg:px-6">
      <button onClick={onMenu} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100" aria-label={t('menu')}>
        <Menu className="w-5 h-5" />
      </button>
      <GlobalSearch />
      <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
        <label className="hidden md:flex items-center gap-2 h-10 ps-3 pe-1 rounded-xl border border-slate-200 bg-white">
          <Building2 className="w-4 h-4 text-brand-gold" />
          <select value={branch?._id} onChange={(e) => erp.updateSettings({ currentBranchId: e.target.value })} className="h-9 bg-transparent text-sm font-semibold text-brand-dark focus:outline-none max-w-[200px]" aria-label={t('branch')}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {name(b).replace(/^Apex Aora Pharmacy — |^صيدلية أبكس أورا — /, '')}
              </option>
            ))}
          </select>
        </label>
        <Link to="/erp/pos" className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-gold to-brand-goldLight shadow-md shadow-brand-gold/20 hover:brightness-110">
          <ShoppingCart className="w-4 h-4" />
          {t('openPos')}
        </Link>
        <Popover
          button={(toggle) => (
            <button onClick={toggle} className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label={t('notifications')}>
              <Bell className="w-5 h-5" />
              {!!alerts.length && <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">{alerts.length}</span>}
            </button>
          )}>
          {(close) => (
            <div className="w-80 p-2">
              <p className="px-3 pt-2 pb-2 text-sm font-bold text-brand-dark">{t('notifications')}</p>
              {!alerts.length && <p className="px-3 pb-4 text-sm text-slate-500">{t('noAlerts')}</p>}
              {alerts.map((a) => (
                <button
                  key={a.key}
                  onClick={() => {
                    close();
                    navigate(a.to);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-start">
                  <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tones[a.tone])}>
                    <Bell className="w-4 h-4" />
                  </span>
                  <span className="text-sm text-brand-dark">{t(a.msg, a.vars)}</span>
                </button>
              ))}
            </div>
          )}
        </Popover>
        <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <Globe className="w-4 h-4" />
          {t('language')}
        </button>
        <Popover
          button={(toggle) => (
            <button onClick={toggle} className="flex items-center gap-2 h-10 ps-1 pe-2 rounded-xl hover:bg-slate-100">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-goldLight text-white text-xs font-bold flex items-center justify-center">{(user?.name ?? 'A').slice(0, 2).toUpperCase()}</span>
              <span className="hidden xl:block text-start leading-tight">
                <span className="block text-sm font-semibold text-brand-dark">{user?.name}</span>
                <span className="block text-[11px] text-slate-500 capitalize">{user?.role}</span>
              </span>
            </button>
          )}>
          {() => (
            <div className="w-60 p-2">
              <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-brand-dark hover:bg-slate-50">
                <Globe className="w-4 h-4 text-slate-400" />
                {t('language')}
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => logout({ redirectTo: '/login' })} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50">
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}

export function ErpLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('erp_sidebar') === '1');
  const [mobile, setMobile] = useState(false);
  const { pathname } = useLocation();
  const fullBleed = pathname.startsWith('/erp/pos');
  useEffect(() => setMobile(false), [pathname]);
  useEffect(() => localStorage.setItem('erp_sidebar', collapsed ? '1' : '0'), [collapsed]);
  return (
    <div className="min-h-screen bg-[#F5F6FB] font-sans text-brand-dark">
      <aside className={cx('hidden lg:block fixed inset-y-0 start-0 z-50 transition-[width] duration-300', collapsed ? 'w-[76px]' : 'w-[264px]')}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-brand-dark/50" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 start-0 w-[280px] shadow-2xl">
            <button onClick={() => setMobile(false)} className="absolute top-4 end-3 z-10 w-8 h-8 rounded-lg text-white/70 hover:bg-white/10 flex items-center justify-center" aria-label="close">
              <X className="w-4 h-4" />
            </button>
            <Sidebar collapsed={false} onNavigate={() => setMobile(false)} />
          </aside>
        </div>
      )}
      <div className={cx('flex flex-col min-h-screen transition-[padding] duration-300', collapsed ? 'lg:ps-[76px]' : 'lg:ps-[264px]')}>
        <TopBar onMenu={() => setMobile(true)} />
        <main className={cx('flex-1', fullBleed ? '' : 'p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto')}>{children}</main>
      </div>
    </div>
  );
}

