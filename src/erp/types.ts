/** Apex Aora Pharmacy ERP — domain types (all data lives in the browser). */

export type ID = string;
export type ISODate = string; // full ISO timestamp
export type DayDate = string; // YYYY-MM-DD

/** Website catalog product (shared with the storefront). */
export interface CatalogProduct {
  _id: ID;
  title: string;
  titleAr?: string;
  slug: string;
  price: number;
  priceAfterDiscount?: number;
  quantity: number;
  sold: number;
  imageCover: string;
  category?: ID;
  brand?: ID | null;
}

export interface Branch {
  _id: ID;
  name: string;
  nameAr?: string;
  city: string;
  cityAr?: string;
  isMain?: boolean;
  active?: boolean;
}

/** ERP-only data attached to a catalog product. */
export interface ProductMeta {
  barcode: string;
  cost: number;
  reorderLevel: number;
  /** Prescription-only medicine. */
  rx: boolean;
  /** Shelf / bin location in the branch. */
  location: string;
}

export interface Batch {
  _id: ID;
  productId: ID;
  branchId: ID;
  batchNo: string;
  expiry: DayDate;
  qty: number;
  cost: number;
  supplierId?: ID;
  receivedAt: ISODate;
}

export type MovementType = 'sale' | 'return' | 'purchase' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'write_off';
export interface StockMovement {
  _id: ID;
  productId: ID;
  branchId: ID;
  batchId?: ID;
  type: MovementType;
  qty: number; // signed
  refId?: ID;
  refNo?: string;
  note?: string;
  createdAt: ISODate;
}

export interface Supplier {
  _id: ID;
  name: string;
  nameAr?: string;
  contactName: string;
  phone: string;
  email: string;
  trn: string;
  city: string;
  paymentTermsDays: number;
  createdAt: ISODate;
}

export type POStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
export interface POItem {
  productId: ID;
  qty: number;
  cost: number;
  receivedQty: number;
}
export interface PurchaseOrder {
  _id: ID;
  number: string;
  supplierId: ID;
  branchId: ID;
  status: POStatus;
  items: POItem[];
  notes?: string;
  expectedAt?: DayDate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type PayableStatus = 'unpaid' | 'partial' | 'paid';
export interface SupplierInvoice {
  _id: ID;
  number: string;
  supplierId: ID;
  poId?: ID;
  amount: number;
  paid: number;
  dueDate: DayDate;
  status: PayableStatus;
  createdAt: ISODate;
}
export interface SupplierPayment {
  _id: ID;
  supplierId: ID;
  invoiceId: ID;
  amount: number;
  method: 'bank' | 'cash' | 'cheque';
  date: ISODate;
  note?: string;
}

export interface InsuranceCompany {
  _id: ID;
  name: string;
  nameAr?: string;
  /** Share of the invoice covered by the insurer (0–100). */
  coveragePct: number;
  phone: string;
}

export interface Customer {
  _id: ID;
  name: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female';
  dob?: DayDate;
  insuranceId?: ID;
  insuranceNo?: string;
  allergies?: string;
  conditions?: string;
  loyaltyPoints: number;
  notes?: string;
  createdAt: ISODate;
}

export type RxStatus = 'pending' | 'dispensed' | 'cancelled';
export interface Prescription {
  _id: ID;
  number: string;
  customerId: ID;
  doctorName: string;
  clinic: string;
  date: DayDate;
  items: { productId: ID; qty: number; dosage: string }[];
  status: RxStatus;
  saleId?: ID;
  branchId: ID;
  notes?: string;
  createdAt: ISODate;
}

export type PaymentMethod = 'cash' | 'card' | 'insurance';
export interface SaleItem {
  productId: ID;
  qty: number;
  price: number; // unit price before line discount
  discount: number; // line discount amount
  cost: number; // unit cost (for profit)
  returnedQty: number;
  batches: { batchId: ID; qty: number }[];
}
export type SaleStatus = 'completed' | 'partially_refunded' | 'refunded';
export interface Sale {
  _id: ID;
  number: string;
  branchId: ID;
  employeeId?: ID;
  sessionId?: ID;
  customerId?: ID;
  prescriptionId?: ID;
  items: SaleItem[];
  subtotal: number; // sum(price*qty) - line discounts, VAT exclusive
  discount: number; // invoice-level discount
  vat: number;
  total: number; // subtotal - discount + vat
  payments: { method: PaymentMethod; amount: number }[];
  insuranceCompanyId?: ID;
  pointsEarned: number;
  pointsRedeemed: number;
  status: SaleStatus;
  createdAt: ISODate;
}

export interface SaleReturn {
  _id: ID;
  number: string;
  saleId: ID;
  branchId: ID;
  items: { productId: ID; qty: number; amount: number }[];
  amount: number;
  reason: string;
  refundMethod: PaymentMethod;
  createdAt: ISODate;
}

export type ClaimStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';
export interface InsuranceClaim {
  _id: ID;
  number: string;
  saleId: ID;
  companyId: ID;
  customerId?: ID;
  amount: number;
  status: ClaimStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';
export interface Transfer {
  _id: ID;
  number: string;
  fromBranchId: ID;
  toBranchId: ID;
  items: { productId: ID; qty: number }[];
  status: TransferStatus;
  notes?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface StockCount {
  _id: ID;
  number: string;
  branchId: ID;
  status: 'open' | 'posted';
  lines: { productId: ID; expected: number; counted: number | null }[];
  createdAt: ISODate;
  postedAt?: ISODate;
}

export type ExpenseCategory = 'rent' | 'salaries' | 'utilities' | 'marketing' | 'maintenance' | 'licenses' | 'other';
export interface Expense {
  _id: ID;
  category: ExpenseCategory;
  amount: number;
  branchId: ID;
  date: DayDate;
  note?: string;
  paidVia: 'bank' | 'cash' | 'card';
  createdAt: ISODate;
}

export type EmployeeRole = 'manager' | 'pharmacist' | 'assistant' | 'cashier' | 'driver';
export interface Employee {
  _id: ID;
  name: string;
  role: EmployeeRole;
  branchId: ID;
  phone: string;
  email: string;
  salary: number;
  licenseNo?: string;
  licenseExpiry?: DayDate;
  hiredAt: DayDate;
  active: boolean;
}

export type ShiftStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'leave';
export interface Shift {
  _id: ID;
  employeeId: ID;
  branchId: ID;
  date: DayDate;
  start: string; // HH:mm
  end: string; // HH:mm
  status: ShiftStatus;
}

export interface CashSession {
  _id: ID;
  number: string;
  branchId: ID;
  employeeId: ID;
  openedAt: ISODate;
  closedAt?: ISODate;
  openingFloat: number;
  countedCash?: number;
  status: 'open' | 'closed';
  note?: string;
}

export interface ErpSettings {
  pharmacyName: string;
  pharmacyNameAr: string;
  trn: string;
  phone: string;
  email: string;
  address: string;
  vatRate: number; // percent
  currency: string;
  receiptFooter: string;
  /** AED spent per loyalty point earned. */
  aedPerPoint: number;
  /** AED value of one point when redeemed. */
  pointValue: number;
  expiryWarningDays: number;
  currentBranchId: ID;
}

export interface ErpData {
  version: number;
  settings: ErpSettings;
  productMeta: Record<ID, ProductMeta>;
  batches: Batch[];
  movements: StockMovement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  supplierInvoices: SupplierInvoice[];
  supplierPayments: SupplierPayment[];
  insurers: InsuranceCompany[];
  customers: Customer[];
  prescriptions: Prescription[];
  sales: Sale[];
  returns: SaleReturn[];
  claims: InsuranceClaim[];
  transfers: Transfer[];
  stockCounts: StockCount[];
  expenses: Expense[];
  employees: Employee[];
  shifts: Shift[];
  cashSessions: CashSession[];
  counters: Record<string, number>;
}

export type CollectionName = {
  [K in keyof ErpData]: ErpData[K] extends Array<{ _id: ID }> ? K : never;
}[keyof ErpData];
