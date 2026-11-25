# Apex Aora Pharmacy — ERP

Standalone pharmacy operations system (React + Vite + Tailwind). Runs fully in
the browser with demo data — no backend yet.

## Run

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # type-check + production build into dist/
```

Demo sign-in: `admin@apexaora.com` / `Admin@123`
(also `manager@apexaora.com` / `Manager@123`, `cashier@apexaora.com` / `Cashier@123`).

## Modules

| Area | Pages |
|---|---|
| Overview | KPIs, sales trend, payment mix, top products, alerts |
| Sales | POS, sales invoices, returns, customers, prescriptions, insurance claims |
| Inventory | Stock (batches & expiry), expiry tracker, transfers, stock counts, movements |
| Purchasing | Suppliers, purchase orders (receive into batches), supplier payables |
| Finance | Expenses, cash registers, profit & loss (with VAT summary) |
| Team | Employees & licences, shifts & attendance |
| Reports / Settings | 8 reports with CSV export; pharmacy profile, VAT, loyalty, reset demo data |

## Structure

```
src/
  erp/            ERP app: store (data + operations), layout, UI kit, charts, pages
    pages/sales   POS, invoices, returns, customers, prescriptions, insurance
    pages/stock   stock, expiry, transfers, counts, movements, suppliers, POs, payables
    pages/fin     overview, expenses, cash, P&L, employees, shifts, reports, settings
  mock/           catalog.ts (products, categories, brands, branches) + local catalog DB
  auth/           local staff sign-in
  messages/       English / Arabic strings
public/images/    product photos, category & brand images, logos
```

## Data

All data lives in the browser's localStorage (`apex_erp_catalog`, `apex_erp`).
Each browser has its own copy, so this is a demo / prototype until it is
connected to a shared database. Settings → "Reset demo data" restores the seed.
Prices and costs in the demo catalog are estimates.
