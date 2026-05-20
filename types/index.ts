export type AppScreen =
  | 'login'
  | 'dashboard'
  | 'newSale'
  | 'openDocuments'
  | 'qrAlbum'
  | 'messages'
  | 'failedQueue'
  | 'dataUpdate'
  | 'fieldTest'
  | 'settings';

export type UserSession = {
  username: string;
  branch: string;
  terminalId: string;
  offlineMode: boolean;
};

export type MessageType = 'Acil' | 'Merkez' | 'Muhasebe' | 'Depo' | 'Fiş Notu';

export type Message = {
  id: string;
  type: MessageType;
  sender: string;
  title: string;
  body: string;
  read: boolean;
  relatedDocument?: string;
  timeLabel: string;
};

export type OpenDocumentStatus = 'Açık' | 'Beklemede' | 'Gönderilemedi';

export type OpenDocument = {
  id: string;
  customerName: string;
  itemCount: number;
  status: OpenDocumentStatus;
  updatedAt: string;
};

export type Product = {
  code: string;
  name: string;
  color: string;
  size: string;
  id?: number;
  barcode?: string;
  brand?: string;
  typeName?: string;
  sellPrice?: number;
  sellPriceTry?: number;
  sellPriceUsd?: number | null;
  sellPriceEur?: number | null;
};

export type SaleLine = Product & {
  lineId: string;
  quantity: number;
};

export type SaleStatus = 'Taslak' | 'Hazır';

export type ActiveSaleDraft = {
  documentNo: string;
  customerName: string;
  status: SaleStatus;
  lines: SaleLine[];
  updatedAt: string;
};

export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

export type ExchangeRateSnapshot = {
  usdToTry: number;
  eurToTry: number;
  tryToUsd?: number | null;
  tryToEur?: number | null;
  eurToUsd?: number | null;
  usdToEur?: number | null;
};

export type OfflineSalesReceipt = {
  localUuid: string;
  terminalId: string;
  documentNo: string;
  customerName: string;
  customerId?: number;
  synced: boolean;
  status?: 'PENDING' | 'SYNCED' | 'FAILED';
  currency?: CurrencyCode;
  usedExchangeRate?: ExchangeRateSnapshot | null;
  totalAmount?: number;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  lines: SaleLine[];
};

export type OfflineSyncSummary = {
  total: number;
  pending: number;
  synced: number;
  failed: number;
};

export type CachedProduct = {
  id: number;
  stockCode: string;
  barcode: string;
  brand: string;
  typeName: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
  buyPriceTry: number;
  buyPriceUsd?: number | null;
  buyPriceEur?: number | null;
  sellPriceTry: number;
  sellPriceUsd?: number | null;
  sellPriceEur?: number | null;
  active: boolean;
};

export type CachedCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  balance: number;
  defaultCurrency: CurrencyCode;
  balanceTry: number;
  balanceUsd: number;
  balanceEur: number;
  active: boolean;
};

export type TerminalBootstrapSettings = {
  generatedAt: string;
  terminalMode: 'offline-first';
  currency: string;
  exchangeRate?: ExchangeRateSnapshot | null;
};

export type TerminalBootstrapData = {
  products: CachedProduct[];
  customers: CachedCustomer[];
  settings: TerminalBootstrapSettings;
  generatedAt: string;
};

export type QRAlbumItem = {
  id: string;
  code: string;
  name: string;
  color: string;
  size: string;
};

export type QRAlbum = {
  documentNo: string;
  customerLabel: string;
  status: 'Hazır' | 'Taslak';
  items: QRAlbumItem[];
};

export type TerminalSettings = {
  terminalId: string;
  branch: string;
  apiBaseUrl: string;
  vibrationEnabled: boolean;
  urgentVibrationEnabled: boolean;
  lastSuccessfulConnectionAt?: string;
};

export type FailedOperation = {
  id: string;
  documentNo: string;
  operationType: string;
  title: string;
  reason: string;
  createdAt: string;
  status: 'Bekliyor' | 'Gönderilemedi' | 'Tekrar denenecek' | 'Senkronlandı';
};

export type ApiHealth = {
  status: string;
  databaseConnected: boolean;
  timestamp: string;
  appVersion: string;
  environment: string;
};
