/**
 * ERP data store — lives in localStorage (`apex_erp`) next to the website's
 * mock database (`apex_db`), which it shares for products, branches and users.
 *
 * Reading:  useErp((d) => d.sales)          (see hooks.ts)
 * Writing:  erp.insert / erp.update / erp.remove  for simple records,
 *           and the domain operations below (createSale, receivePO, …) for
 *           anything that touches stock or money.
 * Every write persists and notifies subscribers.
 */
import { getMockDb, persistMockDb } from '../mock/server';
import type {
  Batch,
  Branch,
  CatalogProduct,
  CollectionName,
  Customer,
  Employee,
  EmployeeRole,
  ErpData,
  Expense,
  ExpenseCategory,
  ID,
  InsuranceClaim,
  MovementType,
  PaymentMethod,
  Prescription,
  PurchaseOrder,
  Sale,
  SaleItem,
  SaleReturn,
  Shift,
  StockMovement,
  Supplier,
  SupplierInvoice,
  Transfer
} from './types';

const KEY = 'apex_erp';
const VERSION = 2;

/* -------------------------------- helpers -------------------------------- */
export const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
export const nowISO = () => new Date().toISOString();
export const today = (): string => toDay(new Date());
export function toDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const daysUntil = (day: string) => Math.floor((new Date(`${day}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86400000);

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/* ------------------------------ shared data ------------------------------ */
/** Website catalog products (live view of the shared mock DB). */
export function catalogProducts(): CatalogProduct[] {
  return getMockDb().products as unknown as CatalogProduct[];
}
export function branches(): Branch[] {
  return (getMockDb().branches as unknown as Branch[]).filter((b) => b.active !== false);
}
export function categories() {
  return getMockDb().categories as unknown as { _id: ID; name: string; nameAr?: string; color?: string }[];
}
export function productById(id: ID): CatalogProduct | undefined {
  return catalogProducts().find((p) => p._id === id);
}
/** Selling price (respects the website sale price). */
export const sellPrice = (p: CatalogProduct) => p.priceAfterDiscount ?? p.price;

/* --------------------------------- seed ---------------------------------- */
function ean13(n: number): string {
  const base = `629${String(1000000000 + n * 7919).slice(-9)}`; // 629 = UAE GS1 prefix
  const digits = base.split('').map(Number);
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}

function seed(): ErpData {
  const rand = prng(1125);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const now = new Date();
  const products = catalogProducts();
  const brs = branches();
  const main = brs.find((b) => b.isMain) ?? brs[0];

  const data: ErpData = {
    version: VERSION,
    settings: {
      pharmacyName: 'Apex Aora Pharmacy',
      pharmacyNameAr: 'صيدلية أبكس أورا',
      trn: '100234567800003',
      phone: '+971 4 000 0001',
      email: 'info@apexaora.ae',
      address: 'Marina Walk, Tower 3, Dubai, UAE',
      vatRate: 5,
      currency: 'AED',
      receiptFooter: 'Thank you for choosing Apex Aora Pharmacy. Medicines are non-returnable once opened.',
      aedPerPoint: 10,
      pointValue: 0.1,
      expiryWarningDays: 90,
      currentBranchId: main?._id ?? ''
    },
    productMeta: {},
    batches: [],
    movements: [],
    suppliers: [],
    purchaseOrders: [],
    supplierInvoices: [],
    supplierPayments: [],
    insurers: [],
    customers: [],
    prescriptions: [],
    sales: [],
    returns: [],
    claims: [],
    transfers: [],
    stockCounts: [],
    expenses: [],
    employees: [],
    shifts: [],
    cashSessions: [],
    counters: {}
  };
  const next = (key: string, prefix: string) => {
    data.counters[key] = (data.counters[key] ?? 0) + 1;
    return `${prefix}-${String(data.counters[key]).padStart(5, '0')}`;
  };

  // product meta
  products.forEach((p, i) => {
    data.productMeta[p._id] = {
      barcode: ean13(i + 1),
      cost: round2(p.price * (0.58 + rand() * 0.14)),
      reorderLevel: pick([10, 15, 20, 25]),
      rx: false,
      location: `${String.fromCharCode(65 + (i % 8))}-${String(1 + (i % 12)).padStart(2, '0')}`
    };
  });

  // suppliers
  const supplierSeed: [string, string, string, string][] = [
    ['Gulf Drug Distributors', 'موزعو الخليج للأدوية', 'Dubai', 'Khalid Rahman'],
    ['Emirates Medical Supply', 'الإمارات للمستلزمات الطبية', 'Abu Dhabi', 'Sara Mahmoud'],
    ['Al Noor Pharma Trading', 'النور لتجارة الأدوية', 'Sharjah', 'Omar Haddad'],
    ['Oasis Healthcare Logistics', 'الواحة للخدمات اللوجستية الصحية', 'Dubai', 'Rania Saleh'],
    ['Crescent Cosmeceuticals', 'الهلال لمستحضرات التجميل الطبية', 'Dubai', 'Ahmed Fawzi'],
    ['Medline Devices FZE', 'ميدلاين للأجهزة الطبية', 'Ras Al Khaimah', 'Lina Youssef']
  ];
  supplierSeed.forEach(([name, nameAr, city, contactName], i) =>
    data.suppliers.push({
      _id: uid(),
      name,
      nameAr,
      contactName,
      city,
      phone: `+971 5${i} ${String(4000000 + i * 131313).slice(0, 7)}`,
      email: `orders@${name.toLowerCase().replace(/[^a-z]+/g, '')}.ae`,
      trn: `1003${String(10000000000 + i * 987654321).slice(-11)}`,
      paymentTermsDays: pick([30, 45, 60]),
      createdAt: addDays(now, -400 + i * 10).toISOString()
    })
  );
  const supplierFor = (_p: CatalogProduct, idx: number) => data.suppliers[idx % data.suppliers.length]._id;

  // batches: each product in each branch, 1–3 batches with varied expiry
  products.forEach((p, i) => {
    brs.forEach((b, bi) => {
      const n = b._id === main?._id ? int(2, 3) : int(1, 2);
      for (let k = 0; k < n; k++) {
        const r = rand();
        const days = r < 0.04 ? -int(3, 40) : r < 0.14 ? int(5, 30) : r < 0.26 ? int(31, 90) : r < 0.4 ? int(91, 180) : int(181, 900);
        const qty = (i + bi) % 11 === 0 && k === 0 ? int(0, 6) : int(6, 60);
        data.batches.push({
          _id: uid(),
          productId: p._id,
          branchId: b._id,
          batchNo: `${p.slug.slice(0, 3).toUpperCase()}${int(1000, 9999)}${String.fromCharCode(65 + k)}`,
          expiry: toDay(addDays(now, days)),
          qty,
          cost: data.productMeta[p._id].cost,
          supplierId: supplierFor(p, i),
          receivedAt: addDays(now, -int(10, 200)).toISOString()
        });
      }
    });
  });

  // insurers
  [
    ['Gulf Health Insurance', 'الخليج للتأمين الصحي', 80],
    ['Emirates Care', 'الإمارات كير', 70],
    ['Al Noor Takaful', 'النور للتكافل', 90]
  ].forEach(([name, nameAr, pct], i) => data.insurers.push({ _id: uid(), name: name as string, nameAr: nameAr as string, coveragePct: pct as number, phone: `+971 800 ${1200 + i}` }));

  // customers
  const names = [
    'Mohamed Ali', 'Fatima Hassan', 'Omar Khalid', 'Layla Mansour', 'Yousef Ibrahim', 'Noura Saeed', 'Ahmed Mostafa', 'Mariam Adel',
    'Khalid Al Mazrouei', 'Aisha Al Nuaimi', 'Hassan Qasim', 'Sara Ahmed', 'Ravi Kumar', 'Anna Petrova', 'John Miller', 'Priya Nair',
    'Salem Al Ketbi', 'Huda Farouk', 'Tariq Aziz', 'Reem Al Shamsi', 'Imran Sheikh', 'Dina Kamal', 'Faisal Al Hammadi', 'Maya Haddad'
  ];
  const allergies = ['', '', '', 'Penicillin', 'Aspirin', 'Sulfa drugs', 'Ibuprofen', 'Latex'];
  const conditions = ['', '', 'Hypertension', 'Type 2 diabetes', 'Asthma', 'Hypothyroidism', 'High cholesterol', ''];
  names.forEach((name, i) => {
    const insured = rand() < 0.45;
    data.customers.push({
      _id: uid(),
      name,
      phone: `05${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}`,
      email: `${name.split(' ')[0].toLowerCase()}${i}@mail.com`,
      gender: /Fatima|Layla|Noura|Mariam|Aisha|Sara|Anna|Priya|Huda|Reem|Dina|Maya/.test(name) ? 'female' : 'male',
      dob: toDay(addDays(now, -int(18, 75) * 365)),
      insuranceId: insured ? pick(data.insurers)._id : undefined,
      insuranceNo: insured ? `POL-${int(100000, 999999)}` : undefined,
      allergies: pick(allergies) || undefined,
      conditions: pick(conditions) || undefined,
      loyaltyPoints: int(0, 600),
      createdAt: addDays(now, -int(20, 500)).toISOString()
    });
  });

  // employees
  const staff: [string, EmployeeRole, number][] = [
    ['Dr. Hana Youssef', 'manager', 22000], ['Dr. Karim Nabil', 'pharmacist', 16000], ['Dr. Leen Abbas', 'pharmacist', 15500],
    ['Dr. Arjun Menon', 'pharmacist', 15000], ['Dr. Nour El Din', 'pharmacist', 15000], ['Dr. Rasha Tamer', 'pharmacist', 14500],
    ['Mona Said', 'assistant', 7500], ['Joseph D\'Souza', 'assistant', 7200], ['Ali Raza', 'cashier', 6000],
    ['Grace Santos', 'cashier', 6000], ['Bilal Hamdan', 'cashier', 5800], ['Samir Gad', 'driver', 4500]
  ];
  staff.forEach(([name, role, salary], i) => {
    const b = brs[i % brs.length];
    data.employees.push({
      _id: uid(),
      name,
      role,
      branchId: b._id,
      phone: `050 ${int(100, 999)} ${int(1000, 9999)}`,
      email: `${name.replace(/^Dr\. /, '').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}@apexaora.ae`,
      salary,
      licenseNo: role === 'pharmacist' || role === 'manager' ? `DHA-P-${int(10000, 99999)}` : undefined,
      licenseExpiry: role === 'pharmacist' || role === 'manager' ? toDay(addDays(now, int(-10, 600))) : undefined,
      hiredAt: toDay(addDays(now, -int(60, 1500))),
      active: true
    });
  });

  // shifts: this week (Mon..Sun) for every active employee
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  data.employees.forEach((e, ei) => {
    for (let d = 0; d < 7; d++) {
      if ((d + ei) % 7 === 5) continue; // one day off
      const date = addDays(monday, d);
      const morning = (ei + d) % 2 === 0;
      const past = toDay(date) < today();
      const isToday = toDay(date) === today();
      const r = rand();
      data.shifts.push({
        _id: uid(),
        employeeId: e._id,
        branchId: e.branchId,
        date: toDay(date),
        start: morning ? '08:00' : '16:00',
        end: morning ? '16:00' : '00:00',
        status: past || isToday ? (r < 0.08 ? 'absent' : r < 0.18 ? 'late' : r < 0.22 ? 'leave' : 'present') : 'scheduled'
      });
    }
  });

  // sales history: last 120 days (≈ AED 3–4k per branch per day, like a busy community pharmacy)
  const sellable = products.filter((p) => p.price > 0);
  const cashiers = data.employees.filter((e) => e.role === 'cashier' || e.role === 'pharmacist' || e.role === 'manager');
  for (let d = 119; d >= 0; d--) {
    const day = addDays(now, -d);
    const weekend = day.getDay() === 5 || day.getDay() === 6;
    const count = int(16, 24) + (weekend ? 5 : 0) + Math.floor((119 - d) / 30);
    for (let s = 0; s < count; s++) {
      const b = rand() < 0.4 ? main : pick(brs);
      const lines = rand() < 0.35 ? int(3, 5) : int(1, 3);
      const items: SaleItem[] = [];
      for (let l = 0; l < lines; l++) {
        const p = pick(sellable);
        if (items.some((it) => it.productId === p._id)) continue;
        items.push({ productId: p._id, qty: rand() < 0.75 ? 1 : int(2, 3), price: sellPrice(p), discount: 0, cost: data.productMeta[p._id].cost, returnedQty: 0, batches: [] });
      }
      const customer = rand() < 0.45 ? pick(data.customers) : undefined;
      const sub = round2(items.reduce((t, it) => t + it.price * it.qty - it.discount, 0));
      const discount = rand() < 0.08 ? round2(sub * 0.1) : 0;
      const vat = round2((sub - discount) * 0.05);
      const total = round2(sub - discount + vat);
      const insurer = customer?.insuranceId && rand() < 0.5 ? data.insurers.find((x) => x._id === customer.insuranceId) : undefined;
      const insAmount = insurer ? round2((total * insurer.coveragePct) / 100) : 0;
      const rest = round2(total - insAmount);
      const method: PaymentMethod = rand() < 0.55 ? 'card' : 'cash';
      const created = new Date(day);
      created.setHours(int(8, 23), int(0, 59), int(0, 59));
      if (created > now) created.setTime(now.getTime() - int(1, 600) * 60000); // never in the future
      if (created.getDate() !== day.getDate()) continue;
      const sale: Sale = {
        _id: uid(),
        number: next('sale', 'INV'),
        branchId: b._id,
        employeeId: pick(cashiers)._id,
        customerId: customer?._id,
        items,
        subtotal: sub,
        discount,
        vat,
        total,
        payments: [...(rest > 0 ? [{ method, amount: rest }] : []), ...(insAmount > 0 ? [{ method: 'insurance' as const, amount: insAmount }] : [])],
        insuranceCompanyId: insurer?._id,
        pointsEarned: customer ? Math.floor(total / data.settings.aedPerPoint) : 0,
        pointsRedeemed: 0,
        status: 'completed',
        createdAt: created.toISOString()
      };
      data.sales.push(sale);
      if (insurer) {
        const age = d;
        data.claims.push({
          _id: uid(),
          number: next('claim', 'CLM'),
          saleId: sale._id,
          companyId: insurer._id,
          customerId: customer?._id,
          amount: insAmount,
          status: age > 45 ? (rand() < 0.85 ? 'paid' : 'rejected') : age > 20 ? (rand() < 0.6 ? 'approved' : 'submitted') : age > 5 ? 'submitted' : 'pending',
          createdAt: sale.createdAt,
          updatedAt: sale.createdAt
        });
      }
    }
  }
  // a few returns
  for (let r = 0; r < 9; r++) {
    const sale = data.sales[Math.floor(data.sales.length * (0.3 + rand() * 0.65))];
    if (sale.status !== 'completed') continue;
    const it = sale.items[0];
    it.returnedQty = 1;
    const amount = round2((it.price - it.discount / it.qty) * 1.05);
    sale.status = sale.items.every((x) => x.returnedQty >= x.qty) ? 'refunded' : 'partially_refunded';
    data.returns.push({
      _id: uid(),
      number: next('return', 'RET'),
      saleId: sale._id,
      branchId: sale.branchId,
      items: [{ productId: it.productId, qty: 1, amount }],
      amount,
      reason: pick(['Wrong product', 'Customer changed mind', 'Damaged packaging', 'Doctor changed prescription']),
      refundMethod: sale.payments[0]?.method === 'card' ? 'card' : 'cash',
      createdAt: addDays(new Date(sale.createdAt), 1).toISOString()
    });
  }

  // purchase orders
  const poStatuses: PurchaseOrder['status'][] = ['received', 'received', 'received', 'received', 'partial', 'ordered', 'ordered', 'draft', 'received', 'cancelled'];
  poStatuses.forEach((status, i) => {
    const sup = data.suppliers[i % data.suppliers.length];
    const created = addDays(now, -(60 - i * 6));
    const items = Array.from({ length: int(3, 6) }, () => pick(sellable))
      .filter((p, k, arr) => arr.findIndex((x) => x._id === p._id) === k)
      .map((p) => {
        const qty = int(2, 8) * 10;
        return { productId: p._id, qty, cost: data.productMeta[p._id].cost, receivedQty: status === 'received' ? qty : status === 'partial' ? Math.floor(qty / 2) : 0 };
      });
    const po: PurchaseOrder = {
      _id: uid(),
      number: next('po', 'PO'),
      supplierId: sup._id,
      branchId: i % 3 === 0 ? main._id : pick(brs)._id,
      status,
      items,
      expectedAt: toDay(addDays(created, 5)),
      createdAt: created.toISOString(),
      updatedAt: addDays(created, 4).toISOString()
    };
    data.purchaseOrders.push(po);
    if (status === 'received' || status === 'partial') {
      const amount = round2(items.reduce((t, it) => t + it.cost * it.receivedQty, 0) * 1.05);
      const paid = i < 3 ? amount : i === 3 ? round2(amount / 2) : 0;
      data.supplierInvoices.push({
        _id: uid(),
        number: next('pinv', 'SINV'),
        supplierId: sup._id,
        poId: po._id,
        amount,
        paid,
        dueDate: toDay(addDays(created, 4 + sup.paymentTermsDays)),
        status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        createdAt: addDays(created, 4).toISOString()
      });
      if (paid > 0)
        data.supplierPayments.push({ _id: uid(), supplierId: sup._id, invoiceId: data.supplierInvoices[data.supplierInvoices.length - 1]._id, amount: paid, method: 'bank', date: addDays(created, 20).toISOString() });
    }
  });

  // prescriptions
  const doctors = [['Dr. Samer Khoury', 'Mediclinic City Hospital'], ['Dr. Amal Rashed', 'Al Zahra Clinic'], ['Dr. Peter Grant', 'King\'s College Hospital Dubai'], ['Dr. Noha Fathy', 'Aster Clinic']];
  for (let i = 0; i < 14; i++) {
    const c = pick(data.customers);
    const [doctorName, clinic] = pick(doctors);
    const status: Prescription['status'] = i < 5 ? 'pending' : i === 13 ? 'cancelled' : 'dispensed';
    data.prescriptions.push({
      _id: uid(),
      number: next('rx', 'RX'),
      customerId: c._id,
      doctorName,
      clinic,
      date: toDay(addDays(now, -i * 3)),
      items: Array.from({ length: int(1, 3) }, () => pick(sellable))
        .filter((p, k, arr) => arr.findIndex((x) => x._id === p._id) === k)
        .map((p) => ({ productId: p._id, qty: int(1, 2), dosage: pick(['1 tablet twice daily after meals', '5 ml three times daily', 'Apply twice daily', '1 capsule daily', 'As needed, max 4 times daily']) })),
      status,
      branchId: i % 2 ? main._id : pick(brs)._id,
      createdAt: addDays(now, -i * 3).toISOString()
    });
  }

  // transfers
  if (brs.length > 1) {
    (['received', 'received', 'in_transit', 'pending'] as Transfer['status'][]).forEach((status, i) => {
      const from = brs[i % brs.length];
      const to = brs[(i + 1) % brs.length];
      const created = addDays(now, -(20 - i * 5));
      data.transfers.push({
        _id: uid(),
        number: next('transfer', 'TR'),
        fromBranchId: from._id,
        toBranchId: to._id,
        items: Array.from({ length: int(2, 4) }, () => pick(sellable))
          .filter((p, k, arr) => arr.findIndex((x) => x._id === p._id) === k)
          .map((p) => ({ productId: p._id, qty: int(2, 10) })),
        status,
        createdAt: created.toISOString(),
        updatedAt: created.toISOString()
      });
    });
  }

  // expenses: months covered by the sales history, sized from each branch's average monthly sales
  // (rent ≈ 9%, payroll ≈ 12%, utilities ≈ 2% of revenue) so margins look like a real pharmacy
  const firstSale = addDays(now, -119);
  const monthsBack = (now.getFullYear() - firstSale.getFullYear()) * 12 + now.getMonth() - firstSale.getMonth();
  const revByBranch = new Map<string, number>();
  for (const sl of data.sales) revByBranch.set(sl.branchId, (revByBranch.get(sl.branchId) ?? 0) + sl.subtotal - sl.discount);
  for (let m = monthsBack; m >= 0; m--) {
    const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
    brs.forEach((b) => {
      const monthly = (revByBranch.get(b._id) ?? 0) / 4;
      const add = (category: ExpenseCategory, amount: number, dayOfMonth: number, paidVia: Expense['paidVia'] = 'bank', note?: string) => {
        const date = new Date(month.getFullYear(), month.getMonth(), dayOfMonth);
        if (date > now || date < firstSale) return;
        data.expenses.push({ _id: uid(), category, amount: Math.round(amount / 50) * 50, branchId: b._id, date: toDay(date), paidVia, note, createdAt: date.toISOString() });
      };
      add('rent', monthly * 0.09, 1, 'bank', 'Monthly rent');
      add('salaries', monthly * 0.12, 28, 'bank', 'Payroll');
      add('utilities', monthly * (0.018 + rand() * 0.008), 10, 'bank', 'DEWA / internet');
      if (rand() < 0.6) add('marketing', monthly * (0.008 + rand() * 0.012), 15, 'card', 'Social media ads');
      if (rand() < 0.35) add('maintenance', 400 + rand() * 1600, 18, 'cash', 'Fridge / AC service');
    });
  }
  data.expenses.push({ _id: uid(), category: 'licenses', amount: 6500, branchId: main._id, date: toDay(addDays(now, -70)), paidVia: 'bank', note: 'DHA pharmacy licence renewal', createdAt: addDays(now, -70).toISOString() });

  // cash sessions for the main branch: today (open) + previous 6 days (closed, counted = expected ± small variance)
  const cashier = data.employees.find((e) => e.branchId === main._id && (e.role === 'cashier' || e.role === 'pharmacist')) ?? data.employees[0];
  for (let dd = 6; dd >= 0; dd--) {
    const o = addDays(now, -dd);
    o.setHours(8, 0, 0, 0);
    const close = new Date(o);
    close.setHours(23, 59, 59, 0);
    const session = { _id: uid(), number: next('session', 'CS'), branchId: main._id, employeeId: cashier._id, openedAt: o.toISOString(), openingFloat: 1000, status: 'open' as const };
    let cash = 0;
    for (const sl of data.sales) {
      const at = new Date(sl.createdAt);
      if (sl.branchId !== main._id || at < o || at > close) continue;
      sl.sessionId = session._id;
      cash += sl.payments.filter((p) => p.method === 'cash').reduce((t, p) => t + p.amount, 0);
    }
    if (dd === 0) data.cashSessions.push(session);
    else {
      const variance = rand() < 0.7 ? 0 : pick([-15, -5, 5, 10, -20]);
      data.cashSessions.push({ ...session, status: 'closed', closedAt: close.toISOString(), countedCash: round2(1000 + cash + variance) });
    }
  }

  return data;
}

/* ------------------------------ persistence ------------------------------ */
let state: ErpData | null = null;
const listeners = new Set<() => void>();

function load(): ErpData {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ErpData;
      const ids = new Set(catalogProducts().map((p) => p._id));
      // reseed if the website catalog was reset (product ids changed)
      if (parsed.version === VERSION && Object.keys(parsed.productMeta).every((id) => ids.has(id)) && ids.size > 0) {
        state = parsed;
        return state;
      }
    }
  } catch {
    /* reseed */
  }
  state = seed();
  syncCatalogStock(state);
  save();
  return state;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    console.warn('[erp] localStorage is full — changes are kept in memory only');
  }
}

/** Mirrors total sellable (non-expired) stock into the website catalog. */
function syncCatalogStock(d: ErpData) {
  const db = getMockDb();
  const t = today();
  const totals = new Map<string, number>();
  for (const b of d.batches) if (b.expiry >= t) totals.set(b.productId, (totals.get(b.productId) ?? 0) + b.qty);
  for (const p of db.products) p.quantity = totals.get(p._id) ?? 0;
  persistMockDb();
}

function commit(touchStock = false) {
  state = { ...state! }; // new reference so selectors re-run
  if (touchStock) syncCatalogStock(state);
  save();
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getState(): ErpData {
  return load();
}
export function resetErp() {
  window.localStorage.removeItem(KEY);
  state = null;
  load();
  listeners.forEach((l) => l());
}

/* ------------------------------ generic CRUD ----------------------------- */
type ItemOf<K extends CollectionName> = ErpData[K] extends Array<infer T> ? T : never;

export const erp = {
  insert<K extends CollectionName>(coll: K, item: Omit<ItemOf<K>, '_id'> & { _id?: ID }): ItemOf<K> {
    const d = load();
    const rec = { _id: uid(), ...item } as ItemOf<K>;
    (d[coll] as unknown as ItemOf<K>[]) = [...(d[coll] as unknown as ItemOf<K>[]), rec];
    commit();
    return rec;
  },
  update<K extends CollectionName>(coll: K, id: ID, patch: Partial<ItemOf<K>>): void {
    const d = load();
    (d[coll] as unknown as ItemOf<K>[]) = (d[coll] as unknown as (ItemOf<K> & { _id: ID })[]).map((x) => (x._id === id ? { ...x, ...patch } : x));
    commit();
  },
  remove<K extends CollectionName>(coll: K, id: ID): void {
    const d = load();
    (d[coll] as unknown as ItemOf<K>[]) = (d[coll] as unknown as (ItemOf<K> & { _id: ID })[]).filter((x) => x._id !== id);
    commit();
  },
  updateSettings(patch: Partial<ErpData['settings']>) {
    const d = load();
    d.settings = { ...d.settings, ...patch };
    commit();
  },
  setProductMeta(productId: ID, patch: Partial<ErpData['productMeta'][string]>) {
    const d = load();
    d.productMeta = { ...d.productMeta, [productId]: { ...d.productMeta[productId], ...patch } };
    commit();
  },
  /** Next document number, e.g. nextNumber('po','PO') → PO-00011 */
  nextNumber(key: string, prefix: string) {
    const d = load();
    d.counters = { ...d.counters, [key]: (d.counters[key] ?? 0) + 1 };
    return `${prefix}-${String(d.counters[key]).padStart(5, '0')}`;
  }
};

/* ------------------------------ stock engine ----------------------------- */
function move(d: ErpData, m: Omit<StockMovement, '_id' | 'createdAt'>) {
  d.movements = [...d.movements, { _id: uid(), createdAt: nowISO(), ...m }];
}

/** Sellable stock (non-expired) of a product in a branch. */
export function stockOf(d: ErpData, productId: ID, branchId?: ID) {
  const t = today();
  return d.batches.reduce((s, b) => (b.productId === productId && (!branchId || b.branchId === branchId) && b.expiry >= t ? s + b.qty : s), 0);
}

/** Takes `qty` from the batches expiring first (FEFO). Throws if not enough stock. */
function takeFEFO(d: ErpData, productId: ID, branchId: ID, qty: number) {
  const t = today();
  const avail = d.batches.filter((b) => b.productId === productId && b.branchId === branchId && b.qty > 0 && b.expiry >= t).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const total = avail.reduce((s, b) => s + b.qty, 0);
  if (total < qty) throw new Error(`NOT_ENOUGH_STOCK:${productId}`);
  const used: { batchId: ID; qty: number; cost: number }[] = [];
  let left = qty;
  for (const b of avail) {
    if (!left) break;
    const n = Math.min(b.qty, left);
    b.qty -= n;
    left -= n;
    used.push({ batchId: b._id, qty: n, cost: b.cost });
  }
  d.batches = [...d.batches];
  return used;
}

function addBatch(d: ErpData, b: Omit<Batch, '_id' | 'receivedAt'>) {
  const existing = d.batches.find((x) => x.productId === b.productId && x.branchId === b.branchId && x.batchNo === b.batchNo && x.expiry === b.expiry);
  if (existing) existing.qty += b.qty;
  else d.batches.push({ _id: uid(), receivedAt: nowISO(), ...b });
  d.batches = [...d.batches];
}

/** Manual stock adjustment (+/-) on a specific batch, or write-off. */
export function adjustBatch(batchId: ID, delta: number, type: Extract<MovementType, 'adjustment' | 'write_off'>, note?: string) {
  const d = load();
  const b = d.batches.find((x) => x._id === batchId);
  if (!b) throw new Error('BATCH_NOT_FOUND');
  b.qty = Math.max(0, b.qty + delta);
  d.batches = [...d.batches];
  move(d, { productId: b.productId, branchId: b.branchId, batchId, type, qty: delta, note });
  commit(true);
}

/** Adds a new batch manually (e.g. opening stock). */
export function receiveBatch(b: Omit<Batch, '_id' | 'receivedAt'>, note?: string) {
  const d = load();
  addBatch(d, b);
  move(d, { productId: b.productId, branchId: b.branchId, type: 'adjustment', qty: b.qty, note: note ?? 'Manual receipt' });
  commit(true);
}

/* --------------------------------- sales --------------------------------- */
export interface NewSaleInput {
  branchId: ID;
  employeeId?: ID;
  sessionId?: ID;
  customerId?: ID;
  prescriptionId?: ID;
  lines: { productId: ID; qty: number; price: number; discount?: number }[];
  discount?: number;
  /** Non-insurance payments; insurance share is computed from the customer's insurer when useInsurance is set. */
  payments: { method: Exclude<PaymentMethod, 'insurance'>; amount: number }[];
  useInsurance?: boolean;
  redeemPoints?: number;
}

/** Totals for a cart (used by POS before checkout). */
export function computeTotals(lines: NewSaleInput['lines'], opts: { discount?: number; customer?: Customer; useInsurance?: boolean; redeemPoints?: number } = {}) {
  const d = load();
  const subtotal = round2(lines.reduce((t, l) => t + l.price * l.qty - (l.discount ?? 0), 0));
  const pointsValue = round2((opts.redeemPoints ?? 0) * d.settings.pointValue);
  const discount = round2(Math.min(subtotal, (opts.discount ?? 0) + pointsValue));
  const vat = round2(((subtotal - discount) * d.settings.vatRate) / 100);
  const total = round2(subtotal - discount + vat);
  const insurer = opts.useInsurance && opts.customer?.insuranceId ? d.insurers.find((i) => i._id === opts.customer!.insuranceId) : undefined;
  const insuranceShare = insurer ? round2((total * insurer.coveragePct) / 100) : 0;
  return { subtotal, discount, vat, total, insurer, insuranceShare, patientShare: round2(total - insuranceShare) };
}

export function createSale(input: NewSaleInput): Sale {
  const d = load();
  const customer = input.customerId ? d.customers.find((c) => c._id === input.customerId) : undefined;
  const redeem = Math.min(input.redeemPoints ?? 0, customer?.loyaltyPoints ?? 0);
  const totals = computeTotals(input.lines, { discount: input.discount, customer, useInsurance: input.useInsurance, redeemPoints: redeem });
  const paid = round2(input.payments.reduce((t, p) => t + p.amount, 0));
  if (paid + 0.009 < totals.patientShare) throw new Error('PAYMENT_SHORT');

  // stock first (all-or-nothing)
  const snapshot = d.batches.map((b) => ({ ...b }));
  const items: SaleItem[] = [];
  try {
    for (const l of input.lines) {
      const used = takeFEFO(d, l.productId, input.branchId, l.qty);
      const cost = round2(used.reduce((t, u) => t + u.cost * u.qty, 0) / l.qty);
      items.push({ productId: l.productId, qty: l.qty, price: l.price, discount: l.discount ?? 0, cost, returnedQty: 0, batches: used.map(({ batchId, qty }) => ({ batchId, qty })) });
    }
  } catch (e) {
    d.batches = snapshot;
    throw e;
  }

  // cash payments: keep only what is owed (change is given back)
  const payments: Sale['payments'] = [];
  let due = totals.patientShare;
  for (const p of input.payments) {
    if (due <= 0) break;
    const amt = round2(Math.min(p.amount, due));
    if (amt > 0) payments.push({ method: p.method, amount: amt });
    due = round2(due - amt);
  }
  if (totals.insuranceShare > 0) payments.push({ method: 'insurance', amount: totals.insuranceShare });

  const sale: Sale = {
    _id: uid(),
    number: erp.nextNumber('sale', 'INV'),
    branchId: input.branchId,
    employeeId: input.employeeId,
    sessionId: input.sessionId,
    customerId: customer?._id,
    prescriptionId: input.prescriptionId,
    items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    vat: totals.vat,
    total: totals.total,
    payments,
    insuranceCompanyId: totals.insurer?._id,
    pointsEarned: customer ? Math.floor(totals.patientShare / d.settings.aedPerPoint) : 0,
    pointsRedeemed: redeem,
    status: 'completed',
    createdAt: nowISO()
  };
  d.sales = [...d.sales, sale];
  for (const it of items) for (const b of it.batches) move(d, { productId: it.productId, branchId: input.branchId, batchId: b.batchId, type: 'sale', qty: -b.qty, refId: sale._id, refNo: sale.number });

  if (customer) {
    d.customers = d.customers.map((c) => (c._id === customer._id ? { ...c, loyaltyPoints: c.loyaltyPoints - redeem + sale.pointsEarned } : c));
  }
  if (totals.insurer) {
    const claim: InsuranceClaim = { _id: uid(), number: erp.nextNumber('claim', 'CLM'), saleId: sale._id, companyId: totals.insurer._id, customerId: customer?._id, amount: totals.insuranceShare, status: 'pending', createdAt: sale.createdAt, updatedAt: sale.createdAt };
    d.claims = [...d.claims, claim];
  }
  if (input.prescriptionId) {
    d.prescriptions = d.prescriptions.map((r) => (r._id === input.prescriptionId ? { ...r, status: 'dispensed', saleId: sale._id } : r));
  }
  // keep the website's "sold" counter in step
  const db = getMockDb();
  for (const it of items) {
    const p = db.products.find((x) => x._id === it.productId);
    if (p) p.sold = (p.sold ?? 0) + it.qty;
  }
  commit(true);
  return sale;
}

/** Returns items of a sale back to stock (to the batches they came from). */
export function returnSale(saleId: ID, lines: { productId: ID; qty: number }[], reason: string, refundMethod: PaymentMethod): SaleReturn {
  const d = load();
  const sale = d.sales.find((s) => s._id === saleId);
  if (!sale) throw new Error('SALE_NOT_FOUND');
  const ratio = sale.subtotal > 0 ? (sale.subtotal - sale.discount) / sale.subtotal : 1;
  const items: SaleReturn['items'] = [];
  for (const l of lines) {
    const it = sale.items.find((x) => x.productId === l.productId);
    if (!it || l.qty <= 0) continue;
    const qty = Math.min(l.qty, it.qty - it.returnedQty);
    if (!qty) continue;
    it.returnedQty += qty;
    // put back into the original batches (latest first)
    let left = qty;
    for (const ref of [...it.batches].reverse()) {
      if (!left) break;
      const b = d.batches.find((x) => x._id === ref.batchId);
      if (!b) continue;
      const n = Math.min(left, ref.qty);
      b.qty += n;
      left -= n;
      move(d, { productId: it.productId, branchId: sale.branchId, batchId: b._id, type: 'return', qty: n, refId: sale._id, refNo: sale.number });
    }
    if (left > 0) {
      // historic sales have no batch link: add to the latest batch of the branch
      const b = d.batches.filter((x) => x.productId === it.productId && x.branchId === sale.branchId).sort((a, z) => z.expiry.localeCompare(a.expiry))[0];
      if (b) {
        b.qty += left;
        move(d, { productId: it.productId, branchId: sale.branchId, batchId: b._id, type: 'return', qty: left, refId: sale._id, refNo: sale.number });
      }
    }
    const unit = (it.price - it.discount / it.qty) * ratio;
    items.push({ productId: it.productId, qty, amount: round2(unit * qty * (1 + d.settings.vatRate / 100)) });
  }
  if (!items.length) throw new Error('NOTHING_TO_RETURN');
  d.batches = [...d.batches];
  sale.status = sale.items.every((x) => x.returnedQty >= x.qty) ? 'refunded' : 'partially_refunded';
  d.sales = d.sales.map((s) => (s._id === sale._id ? { ...sale } : s));
  const ret: SaleReturn = { _id: uid(), number: erp.nextNumber('return', 'RET'), saleId, branchId: sale.branchId, items, amount: round2(items.reduce((t, i) => t + i.amount, 0)), reason, refundMethod, createdAt: nowISO() };
  d.returns = [...d.returns, ret];
  commit(true);
  return ret;
}

/* ------------------------------- purchasing ------------------------------ */
/** Receives (part of) a purchase order into stock as new batches and books a supplier invoice. */
export function receivePO(poId: ID, lines: { productId: ID; qty: number; batchNo: string; expiry: string; cost?: number }[]) {
  const d = load();
  const po = d.purchaseOrders.find((p) => p._id === poId);
  if (!po) throw new Error('PO_NOT_FOUND');
  let value = 0;
  for (const l of lines) {
    if (l.qty <= 0) continue;
    const it = po.items.find((x) => x.productId === l.productId);
    if (!it) continue;
    const cost = l.cost ?? it.cost;
    it.receivedQty += l.qty;
    value += cost * l.qty;
    addBatch(d, { productId: l.productId, branchId: po.branchId, batchNo: l.batchNo, expiry: l.expiry, qty: l.qty, cost, supplierId: po.supplierId });
    move(d, { productId: l.productId, branchId: po.branchId, type: 'purchase', qty: l.qty, refId: po._id, refNo: po.number });
    d.productMeta = { ...d.productMeta, [l.productId]: { ...d.productMeta[l.productId], cost } };
  }
  po.status = po.items.every((i) => i.receivedQty >= i.qty) ? 'received' : 'partial';
  po.updatedAt = nowISO();
  d.purchaseOrders = d.purchaseOrders.map((p) => (p._id === po._id ? { ...po, items: [...po.items] } : p));
  if (value > 0) {
    const sup = d.suppliers.find((s) => s._id === po.supplierId);
    const inv: SupplierInvoice = {
      _id: uid(),
      number: erp.nextNumber('pinv', 'SINV'),
      supplierId: po.supplierId,
      poId: po._id,
      amount: round2(value * (1 + d.settings.vatRate / 100)),
      paid: 0,
      dueDate: toDay(addDays(new Date(), sup?.paymentTermsDays ?? 30)),
      status: 'unpaid',
      createdAt: nowISO()
    };
    d.supplierInvoices = [...d.supplierInvoices, inv];
  }
  commit(true);
}

export function paySupplierInvoice(invoiceId: ID, amount: number, method: 'bank' | 'cash' | 'cheque', note?: string) {
  const d = load();
  const inv = d.supplierInvoices.find((i) => i._id === invoiceId);
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  const pay = round2(Math.min(amount, inv.amount - inv.paid));
  if (pay <= 0) return;
  d.supplierPayments = [...d.supplierPayments, { _id: uid(), supplierId: inv.supplierId, invoiceId, amount: pay, method, date: nowISO(), note }];
  const paid = round2(inv.paid + pay);
  d.supplierInvoices = d.supplierInvoices.map((i) => (i._id === invoiceId ? { ...i, paid, status: paid >= i.amount ? 'paid' : 'partial' } : i));
  commit();
}

/* -------------------------------- transfers ------------------------------ */
/** Moves stock out of the source branch (FEFO) when dispatched; in to the target when received. */
export function dispatchTransfer(id: ID) {
  const d = load();
  const tr = d.transfers.find((t) => t._id === id);
  if (!tr || tr.status !== 'pending') return;
  const snapshot = d.batches.map((b) => ({ ...b }));
  try {
    const moved: { productId: ID; qty: number; batchNo: string; expiry: string; cost: number }[] = [];
    for (const it of tr.items) {
      for (const u of takeFEFO(d, it.productId, tr.fromBranchId, it.qty)) {
        const b = d.batches.find((x) => x._id === u.batchId)!;
        moved.push({ productId: it.productId, qty: u.qty, batchNo: b.batchNo, expiry: b.expiry, cost: u.cost });
        move(d, { productId: it.productId, branchId: tr.fromBranchId, batchId: b._id, type: 'transfer_out', qty: -u.qty, refId: tr._id, refNo: tr.number });
      }
    }
    (tr as Transfer & { _moved?: typeof moved })._moved = moved;
  } catch (e) {
    d.batches = snapshot;
    throw e;
  }
  tr.status = 'in_transit';
  tr.updatedAt = nowISO();
  d.transfers = d.transfers.map((t) => (t._id === id ? { ...tr } : t));
  commit(true);
}

export function receiveTransfer(id: ID) {
  const d = load();
  const tr = d.transfers.find((t) => t._id === id) as (Transfer & { _moved?: { productId: ID; qty: number; batchNo: string; expiry: string; cost: number }[] }) | undefined;
  if (!tr || tr.status !== 'in_transit') return;
  const moved = tr._moved ?? tr.items.map((it) => ({ productId: it.productId, qty: it.qty, batchNo: `TR-${tr.number.slice(-4)}`, expiry: toDay(addDays(new Date(), 365)), cost: d.productMeta[it.productId]?.cost ?? 0 }));
  for (const m of moved) {
    addBatch(d, { productId: m.productId, branchId: tr.toBranchId, batchNo: m.batchNo, expiry: m.expiry, qty: m.qty, cost: m.cost });
    move(d, { productId: m.productId, branchId: tr.toBranchId, type: 'transfer_in', qty: m.qty, refId: tr._id, refNo: tr.number });
  }
  tr.status = 'received';
  tr.updatedAt = nowISO();
  delete tr._moved;
  d.transfers = d.transfers.map((t) => (t._id === id ? { ...tr } : t));
  commit(true);
}

/* ------------------------------- stock counts ---------------------------- */
/** Posts a stock count: differences become adjustments on the latest batch. */
export function postStockCount(id: ID) {
  const d = load();
  const sc = d.stockCounts.find((s) => s._id === id);
  if (!sc || sc.status !== 'open') return;
  for (const line of sc.lines) {
    if (line.counted === null) continue;
    const diff = line.counted - line.expected;
    if (!diff) continue;
    const bs = d.batches.filter((b) => b.productId === line.productId && b.branchId === sc.branchId).sort((a, z) => (diff < 0 ? a.expiry.localeCompare(z.expiry) : z.expiry.localeCompare(a.expiry)));
    let left = Math.abs(diff);
    for (const b of bs) {
      if (!left) break;
      const n = diff < 0 ? Math.min(b.qty, left) : left;
      b.qty += diff < 0 ? -n : n;
      left -= n;
      move(d, { productId: line.productId, branchId: sc.branchId, batchId: b._id, type: 'adjustment', qty: diff < 0 ? -n : n, refId: sc._id, refNo: sc.number, note: 'Stock count' });
    }
  }
  d.batches = [...d.batches];
  d.stockCounts = d.stockCounts.map((s) => (s._id === id ? { ...s, status: 'posted', postedAt: nowISO() } : s));
  commit(true);
}

/* ------------------------------- selectors ------------------------------- */
export const netSaleAmount = (s: Sale) => round2(s.total - 0); // VAT inclusive
export const saleRevenueExVat = (s: Sale) => round2(s.subtotal - s.discount);
export const saleCost = (s: Sale) => round2(s.items.reduce((t, it) => t + it.cost * (it.qty - it.returnedQty), 0));

/** Returns amount refunded for a sale. */
export const refundedFor = (d: ErpData, saleId: ID) => round2(d.returns.filter((r) => r.saleId === saleId).reduce((t, r) => t + r.amount, 0));

export type { Supplier, Employee, Shift, Customer, Prescription };
