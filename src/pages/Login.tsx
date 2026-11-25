import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, Globe, LayoutGrid, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLocale, useSetLocale, useTranslations } from '../lib/i18n';
import { Button, Field, Input } from '../erp/ui/kit';

const DEMO = [
  { email: 'admin@apexaora.com', password: 'Admin@123', role: 'Admin' },
  { email: 'manager@apexaora.com', password: 'Manager@123', role: 'Manager' },
  { email: 'cashier@apexaora.com', password: 'Cashier@123', role: 'Cashier' }
];

export function LoginPage() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const setLocale = useSetLocale();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/erp';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to={from} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError(t('invalid'));
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F5F6FB]">
      {/* brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-[radial-gradient(120%_80%_at_0%_0%,#3B1F8C_0%,#0B1F5C_50%,#081640_100%)]">
        <div className="absolute -bottom-32 -end-32 w-[28rem] h-[28rem] rounded-full bg-brand-goldLight/30 blur-3xl" />
        <div className="absolute top-1/3 -start-24 w-80 h-80 rounded-full bg-brand-gold/40 blur-3xl" />
        <img src="/images/apex-logo-light.png" alt="Apex Aora Pharmacy" className="relative w-56" />
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50 mb-4">ERP</p>
          <h1 className="text-4xl font-extrabold leading-tight mb-8">{t('subtitle')}</h1>
          <ul className="space-y-4">
            {[
              [LayoutGrid, t('side1')],
              [CalendarClock, t('side2')],
              [ShieldCheck, t('side3')]
            ].map(([Icon, text], i) => {
              const I = Icon as typeof LayoutGrid;
              return (
                <li key={i} className="flex items-center gap-3 text-white/85">
                  <span className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                    <I className="w-5 h-5" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Apex Aora Pharmacy</p>
      </div>

      {/* form */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-between items-center">
          <img src="/images/apex-logo.png" alt="Apex Aora Pharmacy" className="h-12 lg:invisible" />
          <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white">
            <Globe className="w-4 h-4" />
            {t('language')}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <form onSubmit={submit} className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-brand-dark mb-1">{t('title')}</h2>
            <p className="text-sm text-slate-500 mb-8">{t('subtitle')}</p>
            <div className="space-y-4">
              <Field label={t('email')}>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="ps-9 h-11" />
                </div>
              </Field>
              <Field label={t('password')}>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="ps-9 h-11" />
                </div>
              </Field>
              {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full">
                {t('submit')}
              </Button>
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t('demo')}</p>
              <div className="space-y-1">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                      setError('');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 text-start">
                    <span className="font-semibold text-brand-dark">{d.role}</span>
                    <span className="text-slate-500 truncate" dir="ltr">
                      {d.email} · {d.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
