export interface Category {
  id: string;
  name: string;
  accentBg: string; // e.g. 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200/50'
  accentColor: string; // hex or tailwind class
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number; // Price in Somoni (TJS)
  costPrice?: number; // Себестоимость
  active: boolean;
  icon?: string;
  description?: string;
}

export interface Employee {
  id: string;
  name: string;
  pin: string; // 4-digit PIN
  role: 'admin' | 'cashier' | 'barista';
  active: boolean;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'qr';

export interface SaleItem {
  productId: string;
  name: string;
  categoryName?: string;
  quantity: number;
  price: number;
  costPrice?: number;
  subtotal: number;
}

export interface Sale {
  id: string; // UUID
  orderNumber: number;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost?: number;
  paymentMethod: PaymentMethod;
  createdAt: string; // ISO date
}

export interface Shift {
  id: string; // UUID
  cafeId: string;
  cafeName: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  salesCount: number;
  totalRevenue: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    qr: number;
  };
  sales: Sale[];
}

export interface POSSettings {
  cafeId: string;
  cafeName: string;
  currency: string;
  adminPin: string;
  taxRatePercent?: number;
}

export interface EncryptedCatalogFile {
  format: 'pos.catalog.v1';
  header: {
    cafeId: string;
    cafeName: string;
    version: number;
    exportedAt: string;
    algorithm: 'AES-256-GCM';
    salt: string; // Base64
    iv: string; // Base64
    kdf: 'PBKDF2-SHA256';
    iterations: number;
    checksum: string;
  };
  encryptedPayload: string; // Base64
}

export interface DecryptedCatalogPayload {
  cafeId: string;
  cafeName: string;
  version: number;
  exportedAt: string;
  categories: Category[];
  products: Product[];
  employees: Employee[];
  settings: POSSettings;
}

export interface ShiftReportFile {
  format: 'pos.report.v1';
  header: {
    cafeId: string;
    cafeName: string;
    shiftId: string;
    employeeId: string;
    employeeName: string;
    version: number;
    startTime: string;
    endTime: string;
    salesCount: number;
    totalRevenue: number;
    checksum: string;
    exportedAt: string;
  };
  data: {
    shift: Shift;
    itemsSummary: {
      productId: string;
      name: string;
      categoryName?: string;
      quantity: number;
      price: number;
      total: number;
    }[];
    paymentSummary: {
      cash: number;
      card: number;
      qr: number;
    };
  };
  signature: string;
}

export interface CatalogDiff {
  oldVersion: number;
  newVersion: number;
  addedProducts: Product[];
  updatedProducts: {
    product: Product;
    oldPrice: number;
    newPrice: number;
  }[];
  removedProducts: Product[];
  categoriesCount: number;
}
