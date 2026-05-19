export type Product = {
  id: number;
  stockCode: string;
  barcode: string;
  brand: string;
  typeName: string;
  quantity: string | number;
  buyPrice: string | number;
  sellPrice: string | number;
  buyPriceTry?: string | number;
  buyPriceUsd?: string | number | null;
  buyPriceEur?: string | number | null;
  sellPriceTry?: string | number;
  sellPriceUsd?: string | number | null;
  sellPriceEur?: string | number | null;
  active: boolean;
  stockMovements?: StockMovement[];
};

export type Currency = 'TRY' | 'USD' | 'EUR';
export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type AppUser = {
  id: number | null;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponse = {
  token: string;
  user: AppUser;
};

export type AuditLog = {
  id: number;
  userId?: number | null;
  action: string;
  entityType: string;
  entityId: number;
  detailsJson?: unknown;
  createdAt: string;
  user?: AppUser | null;
};

export type SystemStatus = {
  databaseConnected: boolean;
  appVersion: string;
  environment: string;
  activeUser: AppUser;
  roleRules: Record<UserRole, string[]>;
  recentAuditLogs: AuditLog[];
};

export type StockMovement = {
  id: number;
  productId: number;
  productName?: string;
  productStockCode?: string;
  movementType: string;
  quantity: string | number;
  sourceDocumentType: string;
  sourceDocumentId: number;
  documentNo?: string | null;
  createdAt: string;
};

export type PartyMovement = {
  id: number;
  documentNo: string;
  type: 'SALE' | 'PURCHASE';
  currency: Currency;
  amount: string | number;
  createdAt: string;
  receiptId: number;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  balance: string | number;
  defaultCurrency?: Currency;
  balanceTry?: string | number;
  balanceUsd?: string | number;
  balanceEur?: string | number;
  active: boolean;
};

export type Supplier = Customer;

export type DashboardStats = {
  productCount: number;
  customerCount: number;
  supplierCount: number;
  todaySales: number;
  totalSales: number;
  lastSale?: {
    documentNo: string;
    totalAmount: number;
    currency?: Currency;
    createdAt: string;
  } | null;
  pendingTerminalReceipts: number;
  receivables?: CurrencyTotals;
  supplierPayables?: CurrencyTotals;
};

export type CurrencyTotals = {
  try: number;
  usd: number;
  eur: number;
};

export type ReceiptItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type PurchaseReceiptInput = {
  supplierId: number;
  currency?: Currency;
  documentNo?: string;
  note?: string;
  items: ReceiptItemInput[];
};

export type SalesReceiptInput = {
  customerId: number;
  currency?: Currency;
  documentNo?: string;
  note?: string;
  items: ReceiptItemInput[];
};

export type SalesReceipt = {
  id: number;
  documentNo: string;
  status?: 'ACTIVE' | 'CANCELLED';
  cancelled?: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  totalAmount: string | number;
  totalAmountTry?: string | number | null;
  currency?: Currency;
  exchangeRateSnapshot?: unknown;
  usdToTry?: string | number;
  eurToTry?: string | number;
  eurToUsd?: string | number | null;
  terminalId?: string | null;
  localUuid?: string | null;
  synced: boolean;
  createdAt: string;
  customer?: Customer;
  items?: ReceiptItem[];
};

export type PurchaseReceipt = {
  id: number;
  documentNo: string;
  status?: 'ACTIVE' | 'CANCELLED';
  cancelled?: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  totalAmount: string | number;
  totalAmountTry?: string | number | null;
  currency?: Currency;
  exchangeRateSnapshot?: unknown;
  usdToTry?: string | number;
  eurToTry?: string | number;
  eurToUsd?: string | number | null;
  createdAt: string;
  supplier?: Supplier;
  items?: ReceiptItem[];
};

export type ReceiptItem = {
  id: number;
  quantity: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  currency?: Currency;
  originalUnitPrice?: string | number | null;
  originalCurrency?: Currency | null;
  receiptCurrency?: Currency | null;
  exchangeRateUsed?: string | number | null;
  convertedUnitPrice?: string | number | null;
  usdToTry?: string | number;
  eurToTry?: string | number;
  eurToUsd?: string | number | null;
  product?: Product;
};

export type ExchangeRate = {
  id: number;
  usdToTry: string | number;
  eurToTry: string | number;
  tryToUsd?: string | number | null;
  tryToEur?: string | number | null;
  eurToUsd?: string | number | null;
  usdToEur?: string | number | null;
  baseCurrency?: Currency | null;
  targetCurrency?: Currency | null;
  rate?: string | number | null;
  active: boolean;
  effectiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
};
