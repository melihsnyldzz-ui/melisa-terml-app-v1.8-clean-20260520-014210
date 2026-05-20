import type { AppUser, CashMovementInput, CurrentAccountMovement, Customer, CustomerCard, CustomerSummaryReport, DashboardStats, DashboardSummary, ExchangeRate, ImportJob, ImportKind, ImportMode, ImportPreviewResponse, LoginResponse, PartyMovement, PermissionMatrix, Product, ProductProfitReport, PurchaseReceipt, PurchaseReceiptInput, RecentSaleReport, SalesAnalytics, SalesProfitReport, SalesReceipt, SalesReceiptInput, SalesReceiptProfitDetail, StockCard, StockMovement, StockMovementReport, StockValuationRow, StockValuationSummary, Supplier, SystemStatus, TerminalSyncLog, TerminalSyncSummary, TopProductReport, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'melisa-mini-erp:token';
const USER_KEY = 'melisa-mini-erp:user';
const DEV_ROLE_KEY = 'melisa-mini-erp:dev-role';
const OPEN_ADMIN_TOKEN = 'open-admin';
const OPEN_ADMIN_USER: AppUser = {
  id: 0,
  name: 'Açık Admin',
  username: 'open-admin',
  role: 'ADMIN',
  active: true,
};

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY) ?? OPEN_ADMIN_TOKEN;
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AppUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) as AppUser : OPEN_ADMIN_USER;
}

export function setStoredUser(user: AppUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getDevRole(): UserRole {
  const role = window.localStorage.getItem(DEV_ROLE_KEY) as UserRole | null;
  return role ?? getStoredUser()?.role ?? 'ADMIN';
}

export function setDevRole(role: UserRole) {
  window.localStorage.setItem(DEV_ROLE_KEY, role);
}

function devUserHeaders() {
  const role = getDevRole();
  return {
    'x-user-role': role,
    'x-user-id': role === 'ADMIN' ? '0' : String(roleOptionsIndex(role) + 1),
    'x-username': `dev-${role.toLowerCase()}`,
  };
}

function roleOptionsIndex(role: UserRole) {
  return ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING', 'VIEWER', 'STAFF'].indexOf(role);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = path.startsWith('/import') || path.startsWith('/reports') ? 30000 : 10000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...devUserHeaders(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...init?.headers,
    },
  }).finally(() => window.clearTimeout(timeout));

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API hata verdi: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestText(path: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...devUserHeaders(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API hata verdi: ${response.status}`);
  }
  return response.text();
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...devUserHeaders(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API hata verdi: ${response.status}`);
  }
  return response.blob();
}

export const api = {
  login: (data: { username: string; password: string }) => request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  products: () => request<Product[]>('/products'),
  customers: () => request<Customer[]>('/customers'),
  suppliers: () => request<Supplier[]>('/suppliers'),
  salesReceipts: () => request<SalesReceipt[]>('/sales-receipts'),
  salesReceipt: (id: number) => request<SalesReceipt>(`/sales-receipts/${id}`),
  salesReceiptProfit: (id: number) => request<SalesReceiptProfitDetail>(`/sales-receipts/${id}/profit`),
  purchaseReceipts: () => request<PurchaseReceipt[]>('/purchase-receipts'),
  purchaseReceipt: (id: number) => request<PurchaseReceipt>(`/purchase-receipts/${id}`),
  stockMovements: (query = '') => request<StockMovement[]>(`/stock-movements${query}`),
  customerMovements: (id: number) => request<PartyMovement[]>(`/customers/${id}/movements`),
  supplierMovements: (id: number) => request<PartyMovement[]>(`/suppliers/${id}/movements`),
  currentAccountMovements: (query = '') => request<CurrentAccountMovement[]>(`/current-account/movements${query}`),
  currentAccountPartyMovements: (partyType: 'CUSTOMER' | 'SUPPLIER', partyId: number) => request<CurrentAccountMovement[]>(`/current-account/movements/${partyType}/${partyId}`),
  createCollection: (data: CashMovementInput) => request<CurrentAccountMovement>('/current-account/collection', { method: 'POST', body: JSON.stringify(data) }),
  createPayment: (data: CashMovementInput) => request<CurrentAccountMovement>('/current-account/payment', { method: 'POST', body: JSON.stringify(data) }),
  activeExchangeRate: () => request<ExchangeRate | null>('/exchange-rates/active'),
  exchangeRates: () => request<ExchangeRate[]>('/exchange-rates'),
  dashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  dashboardSummary: () => request<DashboardSummary>('/reports/dashboard-summary'),
  recentSalesReport: () => request<RecentSaleReport[]>('/reports/recent-sales'),
  topProductsReport: () => request<TopProductReport[]>('/reports/top-products'),
  customerSummaryReport: () => request<CustomerSummaryReport[]>('/reports/customer-summary'),
  stockCards: () => request<StockCard[]>('/products/stock-cards'),
  customerCards: () => request<CustomerCard[]>('/customers/cards'),
  terminalSyncLogs: () => request<{ ok: boolean; logs: TerminalSyncLog[] }>('/terminal-sync/logs'),
  terminalSyncSummary: () => request<TerminalSyncSummary>('/terminal-sync/summary'),
  stockMovementReport: (query = '') => request<StockMovementReport[]>(`/reports/stock-movements${query}`),
  stockValuation: () => request<StockValuationRow[]>('/reports/stock-valuation'),
  stockValuationSummary: () => request<StockValuationSummary>('/reports/stock-valuation/summary'),
  salesAnalytics: () => request<SalesAnalytics>('/reports/sales-analytics'),
  productProfit: (query = '') => request<ProductProfitReport[]>(`/reports/product-profit${query}`),
  salesProfit: (query = '') => request<SalesProfitReport[]>(`/reports/sales-profit${query}`),
  lowProfitProducts: (query = '') => request<ProductProfitReport[]>(`/reports/low-profit-products${query}`),
  importTemplate: (kind: ImportKind) => requestText(`/import/templates/${kind}`),
  importTemplateXlsx: (kind: ImportKind) => requestBlob(`/import/templates/${kind}.xlsx`),
  importPreview: (kind: ImportKind, data: { csv?: string; fileBase64?: string; fileName?: string; mode: ImportMode }) => request<ImportPreviewResponse>(`/import/${kind}/preview`, { method: 'POST', body: JSON.stringify(data) }),
  importApply: (kind: ImportKind, data: { csv?: string; fileBase64?: string; fileName?: string; mode: ImportMode; importJobId?: number }) => request<ImportPreviewResponse>(`/import/${kind}/apply`, { method: 'POST', body: JSON.stringify(data) }),
  importJobs: () => request<ImportJob[]>('/import/jobs'),
  importJob: (id: number) => request<ImportJob>(`/import/jobs/${id}`),
  importJobErrorsCsv: (id: number) => requestText(`/import/jobs/${id}/errors.csv`),
  systemStatus: () => request<SystemStatus>('/system/status'),
  users: () => request<AppUser[]>('/users'),
  permissionMatrix: () => request<PermissionMatrix>('/system/permissions'),
  createUser: (data: { name: string; username: string; role: AppUser['role']; password: string; active: boolean }) => request<AppUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<Pick<AppUser, 'name' | 'username' | 'role' | 'active'>>) => request<AppUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateUser: (id: number) => request<AppUser>(`/users/${id}/deactivate`, { method: 'PATCH' }),
  resetUserPassword: (id: number, password: string) => request<AppUser>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  createProduct: (data: Omit<Product, 'id'>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: Partial<Product>) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createCustomer: (data: Omit<Customer, 'id' | 'balance' | 'active'>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify({ ...data, balance: 0, active: true }) }),
  updateCustomer: (id: number, data: Partial<Customer>) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createSupplier: (data: Omit<Supplier, 'id' | 'balance' | 'active'>) => request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify({ ...data, balance: 0, active: true }) }),
  updateSupplier: (id: number, data: Partial<Supplier>) => request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createPurchaseReceipt: (data: PurchaseReceiptInput) => request('/purchase-receipts', { method: 'POST', body: JSON.stringify(data) }),
  createSalesReceipt: (data: SalesReceiptInput) => request('/sales-receipts', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseReceipt: (id: number, data: PurchaseReceiptInput) => request<PurchaseReceipt>(`/purchase-receipts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateSalesReceipt: (id: number, data: SalesReceiptInput) => request<SalesReceipt>(`/sales-receipts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelPurchaseReceipt: (id: number, reason: string) => request<PurchaseReceipt>(`/purchase-receipts/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancelSalesReceipt: (id: number, reason: string) => request<SalesReceipt>(`/sales-receipts/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  createExchangeRate: (data: { usdToTry: number; eurToTry: number; tryToUsd?: number; tryToEur?: number; eurToUsd?: number | null; usdToEur?: number | null }) => request<ExchangeRate>('/exchange-rates', { method: 'POST', body: JSON.stringify(data) }),
};
