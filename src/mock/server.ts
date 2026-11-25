/**
 * Local catalog database for the standalone ERP (no backend).
 *
 * Products, categories, brands, branches and staff users are built from
 * ./catalog.ts and kept in localStorage (`apex_erp_catalog`). The ERP store
 * (src/erp/store.ts) reads and updates it through getMockDb()/persistMockDb().
 */
import { BRANCHES, BRANDS, CATEGORIES, PRODUCTS } from './catalog';

type Doc = Record<string, any> & { _id: string };

interface CatalogDb {
  version: number;
  products: Doc[];
  categories: Doc[];
  brands: Doc[];
  branches: Doc[];
  users: Doc[];
}

const KEY = 'apex_erp_catalog';
const VERSION = 1;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

/** Simple, stable hash so demo passwords are not stored as plain text. */
export const hashPw = (pw: string) => {
  let h = 5381;
  for (const ch of `apex:${pw}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `h${h.toString(16)}`;
};

function seed(): CatalogDb {
  const now = new Date().toISOString();
  const categories = CATEGORIES.map((c) => ({ _id: `cat_${c.key}`, name: c.name, nameAr: c.nameAr, slug: slugify(c.name), color: c.tone, image: `/images/categories/${c.key}.webp`, createdAt: now }));
  const brands = BRANDS.map((b) => ({ _id: `brand_${b.key}`, name: b.name, nameAr: b.nameAr, slug: slugify(b.name), image: b.logo === false ? undefined : `/images/brands/${b.key}.png`, createdAt: now }));
  const products = PRODUCTS.map((p) => ({
    _id: `prd_${p.slug}`,
    title: p.title,
    titleAr: p.titleAr,
    slug: p.slug,
    description: p.description,
    descriptionAr: p.descriptionAr,
    price: p.price,
    ...(p.sale ? { priceAfterDiscount: p.sale } : {}),
    quantity: p.quantity,
    sold: p.sold,
    imageCover: `/images/products/${p.slug}.jpg`,
    category: `cat_${p.category}`,
    brand: `brand_${p.brand}`,
    createdAt: now
  }));
  const branches = BRANCHES.map((b, i) => ({ _id: `br_${i + 1}`, ...b, isMain: !!(b as { isMain?: boolean }).isMain, active: true, createdAt: now }));
  const users = [
    { _id: 'usr_admin', name: 'Apex Aora Admin', email: 'admin@apexaora.com', role: 'admin', password: hashPw('Admin@123') },
    { _id: 'usr_manager', name: 'Pharmacy Manager', email: 'manager@apexaora.com', role: 'manager', password: hashPw('Manager@123') },
    { _id: 'usr_cashier', name: 'Front Counter', email: 'cashier@apexaora.com', role: 'cashier', password: hashPw('Cashier@123') }
  ];
  return { version: VERSION, products, categories, brands, branches, users };
}

let db: CatalogDb | null = null;

function load(): CatalogDb {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CatalogDb;
      if (parsed.version === VERSION) return (db = parsed);
    }
  } catch {
    /* reseed */
  }
  db = seed();
  persistMockDb();
  return db;
}

export function getMockDb() {
  return load();
}

export function persistMockDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    console.warn('[catalog] localStorage is full');
  }
}

/** Wipes the catalog (the ERP store reseeds itself when product ids change). */
export function resetCatalog() {
  localStorage.removeItem(KEY);
  db = null;
  load();
}
