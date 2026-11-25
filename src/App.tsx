import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/Login';

const ErpApp = lazy(() => import('./erp/ErpApp').then((m) => ({ default: m.ErpApp })));

function RequireStaff({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />;
  return children;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-[3px] border-brand-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/erp/*" element={<RequireStaff><ErpApp /></RequireStaff>} />
              <Route path="*" element={<Navigate to="/erp" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
