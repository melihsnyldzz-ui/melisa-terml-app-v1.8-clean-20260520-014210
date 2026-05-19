import type { AppUser, Customer, DashboardStats, ExchangeRate, LoginResponse, PartyMovement, Product, PurchaseReceipt, PurchaseReceiptInput, SalesReceipt, SalesReceiptInput, StockMovement, Supplier, SystemStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'melisa-mini-erp:token';
const USER_KEY = 'melisa-mini-erp:user';

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY);
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
  return raw ? JSON.parse(raw) as AppUser : null;
}

export function setStoredUser(user: AppUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
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

export const api = {
  login: (data: { username: string; password: string }) => request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  products: () => request<Product[]>('/products'),
  customers: () => request<Customer[]>('/customers'),
  suppliers: () => request<Supplier[]>('/suppliers'),
  salesReceipts: () => request<SalesReceipt[]>('/sales-receipts'),
  purchaseReceipts: () => request<PurchaseReceipt[]>('/purchase-receipts'),
  stockMovements: (query = '') => request<StockMovement[]>(`/stock-movements${query}`),
  customerMovements: (id: number) => request<PartyMovement[]>(`/customers/${id}/movements`),
  supplierMovements: (id: number) => request<PartyMovement[]>(`/suppliers/${id}/movements`),
  activeExchangeRate: () => request<ExchangeRate | null>('/exchange-rates/active'),
  exchangeRates: () => request<ExchangeRate[]>('/exchange-rates'),
  dashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  systemStatus: () => request<SystemStatus>('/system/status'),
  users: () => request<AppUser[]>('/users'),
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
  cancelPurchaseReceipt: (id: number, reason: string) => request<PurchaseReceipt>(`/purchase-receipts/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancelSalesReceipt: (id: number, reason: string) => request<SalesReceipt>(`/sales-receipts/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  createExchangeRate: (data: { usdToTry: number; eurToTry: number; tryToUsd?: number; tryToEur?: number; eurToUsd?: number | null; usdToEur?: number | null }) => request<ExchangeRate>('/exchange-rates', { method: 'POST', body: JSON.stringify(data) }),
};
