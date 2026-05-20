export type Product = {
  id: number;
  stockCode: string;
  barcode: string;
  brand: string;
  typeName: string;
  quantity: string | number;
  currency?: Currency;
  purchasePrice?: string | number;
  salePrice?: string | number;
  buyPrice: string | number;
  sellPrice: string | number;
  buyPriceTry?: string | number;
  buyPriceUsd?: string | number | null;
  buyPriceEur?: string | number | null;
  averageCostTry?: string | number;
  sellPriceTry?: string | number;
  sellPriceUsd?: string | number | null;
  sellPriceEur?: string | number | null;
  active: boolean;
  stockMovements?: StockMovement[];
};

export type Currency = 'TRY' | 'USD' | 'EUR';
export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTING' | 'VIEWER' | 'STAFF';

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

export type PermissionMatrix = {
  permissionGroups: Record<string, string>;
  rolePermissions: Record<UserRole, string[]>;
};

export type StockMovement = {
  id: number;
  productId: number;
  productName?: string;
  productStockCode?: string;
  movementType: string;
  quantity: string | number;
  unitCostTry?: string | number | null;
  valueChangeTry?: string | number | null;
  stockAfter?: string | number | null;
  averageCostAfterTry?: string | number | null;
  sourceDocumentType: string;
  sourceDocumentId: number;
  documentNo?: string | null;
  note?: string | null;
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

export type CurrentAccountMovement = {
  id: number;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: number | null;
  partyName: string;
  customerId?: number | null;
  supplierId?: number | null;
  documentType: 'SALES_RECEIPT' | 'PURCHASE_RECEIPT' | 'PAYMENT' | 'COLLECTION' | 'CANCEL';
  documentId: number;
  documentNo: string;
  direction: 'DEBIT' | 'CREDIT';
  currency: Currency;
  amount: string | number;
  amountTry?: string | number | null;
  accountCurrency?: Currency;
  accountAmount?: string | number;
  documentCurrency?: Currency;
  documentAmount?: string | number;
  description?: string | null;
  paymentMethod?: 'CASH' | 'BANK' | 'CARD' | 'OTHER' | null;
  createdAt: string;
};

export type CashMovementInput = {
  customerId?: number;
  supplierId?: number;
  amount: number;
  currency: Currency;
  amountTry?: number;
  description?: string | null;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'OTHER';
  createdAt?: string;
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

export type DashboardSummary = {
  todaySalesCount: number;
  todaySalesTotal: number;
  todayItemQuantity: number;
  activeCustomerCount: number;
  productCount: number;
  lowStockCount: number;
  pendingSyncCount: number;
  failedSyncCount: number;
  lastSyncAt: string | null;
};

export type RecentSaleReport = {
  receiptNo: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  originalTotal?: number;
  totalTry?: number;
  currency: Currency;
  documentCurrency?: Currency;
  createdAt: string;
  sourceTerminal: string;
};

export type TopProductReport = {
  productName: string;
  productCode: string;
  quantity: number;
  totalAmount: number;
};

export type CustomerSummaryReport = {
  customerName: string;
  receiptCount: number;
  totalAmount: number;
  lastSaleAt: string | null;
};

export type StockCard = {
  id: number;
  stockCode: string;
  barcode: string;
  productName: string;
  brand: string;
  typeName: string;
  quantity: number;
  sellPrice: number;
  sellPriceTry: number;
  sellPriceUsd?: number | null;
  sellPriceEur?: number | null;
  active: boolean;
  lowStock: boolean;
  updatedAt: string;
};

export type CustomerCard = {
  id: number;
  customerCode: string;
  name: string;
  city: string;
  currency: Currency;
  active: boolean;
  receiptCount: number;
  totalAmount: number;
  lastSaleAt: string | null;
};

export type TerminalSyncLog = {
  id: number;
  localUuid: string;
  terminalId: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  syncedAt?: string | null;
  payloadJson?: unknown;
};

export type TerminalSyncSummary = {
  ok?: boolean;
  total: number;
  pending: number;
  synced: number;
  failed: number;
};

export type StockMovementReport = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  barcode: string;
  movementType: string;
  quantity: number;
  sourceDocumentType: string;
  sourceDocumentId: number;
  createdAt: string;
};

export type StockValuationRow = {
  productId: number;
  productCode: string;
  barcode: string;
  name: string;
  brand: string;
  currency: Currency;
  stockQuantity: number;
  purchasePrice: number;
  averageCostTry: number;
  stockValueTry: number;
  salePrice: number;
  salePriceTry: number;
  potentialSaleValueTry: number;
  potentialGrossProfitTry: number;
  profitMargin: number;
  lowStock: boolean;
};

export type StockValuationSummary = {
  totalProductCount: number;
  totalStockQuantity: number;
  totalStockValueTry: number;
  totalPotentialSaleValueTry: number;
  totalPotentialGrossProfitTry: number;
  lowStockCount: number;
};

export type SalesAnalytics = {
  dailySales: { receiptCount: number; totalAmount: number };
  weeklySales: { receiptCount: number; totalAmount: number };
  topProduct: TopProductReport | null;
  activeCustomer: { customerName: string; receiptCount: number; totalAmount: number } | null;
  currencyTotals: Array<{ currency: Currency; receiptCount: number; totalAmount: number }>;
};

export type ProfitCostStatus = 'ok' | 'missing';

export type ProductProfitReport = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  salesAmountTry: number;
  costTry: number;
  grossProfitTry: number;
  profitMargin: number;
  costStatus: ProfitCostStatus;
  missingCostCount?: number;
  threshold?: number;
};

export type SalesProfitReport = {
  receiptId: number;
  documentNo: string;
  customerName: string;
  documentCurrency: Currency;
  originalTotal: number;
  totalTry: number;
  createdAt: string;
  quantity: number;
  salesAmountTry: number;
  costTry: number;
  grossProfitTry: number;
  profitMargin: number;
  costStatus: ProfitCostStatus;
  missingCostCount?: number;
};

export type SalesReceiptProfitDetail = Omit<SalesProfitReport, 'quantity' | 'missingCostCount'> & {
  items: Array<{
    itemId: number;
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    lineCurrency: Currency;
    lineTotalOriginal: number;
    lineTotalTry: number;
    unitCostTry: number;
    totalCostTry: number;
    grossProfitTry: number;
    profitMargin: number;
    costStatus: ProfitCostStatus;
  }>;
};

export type ImportKind = 'products' | 'customers' | 'suppliers' | 'prices' | 'stock';
export type ImportMode = 'createOnly' | 'updateOnly' | 'upsert' | 'stockAdjustment';
export type ImportAction = 'create' | 'update' | 'skip';
export type ImportStatus = 'valid' | 'warning' | 'error' | 'duplicate';

export type ImportSummary = {
  total: number;
  valid: number;
  warning: number;
  error: number;
  duplicate: number;
  created: number;
  updated: number;
  skipped: number;
};

export type ImportPreviewRow = {
  rowNumber: number;
  status: ImportStatus;
  valid: boolean;
  warning: string[];
  error: string[];
  duplicate: boolean;
  action: ImportAction;
  data: Record<string, unknown>;
  existingId?: number;
};

export type ImportPreviewResponse = {
  ok: boolean;
  kind: ImportKind;
  mode: ImportMode;
  fileName?: string;
  importJobId?: number;
  headers: string[];
  summary: ImportSummary;
  rows: ImportPreviewRow[];
};

export type ImportJobRow = {
  id: number;
  importJobId: number;
  rowNumber: number;
  status: ImportStatus | string;
  action: ImportAction | string;
  errorJson?: string[] | null;
  warningJson?: string[] | null;
  rawJson?: Record<string, unknown> | null;
  entityId?: number | null;
  createdAt: string;
};

export type ImportJob = {
  id: number;
  kind: 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS' | 'PRICES' | 'STOCK';
  mode: ImportMode;
  fileName?: string | null;
  status: 'PREVIEWED' | 'APPLIED' | 'FAILED';
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  appliedBy?: number | null;
  createdAt: string;
  appliedAt?: string | null;
  appliedUser?: AppUser | null;
  rows?: ImportJobRow[];
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
  documentCurrency?: Currency;
  exchangeRateToTry?: string | number;
  originalTotal?: string | number;
  totalTry?: string | number;
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
  documentCurrency?: Currency;
  exchangeRateToTry?: string | number;
  originalTotal?: string | number;
  totalTry?: string | number;
  exchangeRateSnapshot?: unknown;
  usdToTry?: string | number;
  eurToTry?: string | number;
  eurToUsd?: string | number | null;
  note?: string | null;
  createdAt: string;
  supplier?: Supplier;
  items?: ReceiptItem[];
  header?: {
    id: number;
    documentNo: string;
    supplierId: number;
    supplierName: string;
    currency: Currency;
    status: 'ACTIVE' | 'CANCELLED';
    cancelled: boolean;
    createdAt: string;
  };
  totals?: {
    totalQuantity: number;
    subtotal: string | number;
    vat: string | number;
    grandTotal: string | number;
    totalAmountTry?: string | number | null;
    currency: Currency;
  };
  supplierDebtEffect?: {
    supplierId: number;
    supplierName: string;
    direction: 'debt_increase' | 'cancelled';
    amount: string | number;
    currency: Currency;
    balanceTry: string | number;
    balanceUsd: string | number;
    balanceEur: string | number;
  };
};

export type ReceiptItem = {
  id: number;
  productId?: number;
  quantity: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  lineCurrency?: Currency;
  unitPriceOriginal?: string | number;
  lineTotalOriginal?: string | number;
  unitPriceTry?: string | number;
  lineTotalTry?: string | number;
  unitCostTry?: string | number;
  totalCostTry?: string | number;
  grossProfitTry?: string | number;
  profitMargin?: string | number;
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
