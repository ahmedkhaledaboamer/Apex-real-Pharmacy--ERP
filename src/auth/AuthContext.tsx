import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getMockDb, hashPw } from '../mock/server';

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
}

interface AuthValue {
  user: StaffUser | null;
  login: (email: string, password: string) => StaffUser;
  logout: (opts?: { redirectTo?: string }) => void;
}

const KEY = 'apex_erp_session';
const AuthContext = createContext<AuthValue | null>(null);

function readSession(): StaffUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

/** Local staff sign-in for the ERP (users live in the local catalog DB). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(readSession);

  const login = useCallback((email: string, password: string) => {
    const u = getMockDb().users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== hashPw(password)) throw new Error('INVALID_CREDENTIALS');
    const session: StaffUser = { _id: u._id, name: u.name, email: u.email, role: u.role };
    localStorage.setItem(KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback((opts?: { redirectTo?: string }) => {
    localStorage.removeItem(KEY);
    setUser(null);
    if (opts?.redirectTo) window.location.assign(opts.redirectTo);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
