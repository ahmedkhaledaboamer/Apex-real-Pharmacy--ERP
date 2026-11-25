import type { en } from './en';
import { appAr } from './app.ar';
import { erpAr } from './erp.ar';
import { erpSalesAr } from './erp.sales.ar';
import { erpStockAr } from './erp.stock.ar';
import { erpFinAr } from './erp.fin.ar';

export const ar: typeof en = { ...appAr, ...erpAr, ...erpSalesAr, ...erpStockAr, ...erpFinAr };
