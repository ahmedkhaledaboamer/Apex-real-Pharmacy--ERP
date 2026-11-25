import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErpLayout } from './ErpLayout';

/*
 * Apex Aora Pharmacy ERP — mounted at /erp/* (staff only).
 * Each page module default-exports a component; modules with sub-pages
 * (list + detail) declare their own nested <Routes>.
 */
const page = (loader: () => Promise<{ default: React.ComponentType }>) => lazy(loader);

const Overview = page(() => import('./pages/fin/Overview'));
const Pos = page(() => import('./pages/sales/Pos'));
const Invoices = page(() => import('./pages/sales/Invoices'));
const Returns = page(() => import('./pages/sales/Returns'));
const Customers = page(() => import('./pages/sales/Customers'));
const Prescriptions = page(() => import('./pages/sales/Prescriptions'));
const Insurance = page(() => import('./pages/sales/Insurance'));
const Stock = page(() => import('./pages/stock/Stock'));
const Expiry = page(() => import('./pages/stock/Expiry'));
const Transfers = page(() => import('./pages/stock/Transfers'));
const StockCounts = page(() => import('./pages/stock/StockCounts'));
const Movements = page(() => import('./pages/stock/Movements'));
const Suppliers = page(() => import('./pages/stock/Suppliers'));
const PurchaseOrders = page(() => import('./pages/stock/PurchaseOrders'));
const Payables = page(() => import('./pages/stock/Payables'));
const Expenses = page(() => import('./pages/fin/Expenses'));
const CashRegisters = page(() => import('./pages/fin/CashRegisters'));
const ProfitLoss = page(() => import('./pages/fin/ProfitLoss'));
const Employees = page(() => import('./pages/fin/Employees'));
const Shifts = page(() => import('./pages/fin/Shifts'));
const Reports = page(() => import('./pages/fin/Reports'));
const Settings = page(() => import('./pages/fin/Settings'));

function Loading() {
  return (
    <div className="flex items-center justify-center py-32">
      <span className="w-8 h-8 border-[3px] border-brand-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ErpApp() {
  return (
    <ErpLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="pos" element={<Pos />} />
          <Route path="invoices/*" element={<Invoices />} />
          <Route path="returns/*" element={<Returns />} />
          <Route path="customers/*" element={<Customers />} />
          <Route path="prescriptions/*" element={<Prescriptions />} />
          <Route path="insurance/*" element={<Insurance />} />
          <Route path="stock/*" element={<Stock />} />
          <Route path="expiry" element={<Expiry />} />
          <Route path="transfers/*" element={<Transfers />} />
          <Route path="stock-counts/*" element={<StockCounts />} />
          <Route path="movements" element={<Movements />} />
          <Route path="suppliers/*" element={<Suppliers />} />
          <Route path="purchase-orders/*" element={<PurchaseOrders />} />
          <Route path="payables" element={<Payables />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="cash/*" element={<CashRegisters />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="employees/*" element={<Employees />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/erp" replace />} />
        </Routes>
      </Suspense>
    </ErpLayout>
  );
}
