import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSaleDraft, CachedCustomer, CachedProduct, FailedOperation, OfflineSalesReceipt, OpenDocument, TerminalBootstrapData, TerminalSettings, UserSession } from '../types';
import {
  loadCachedCustomersFromSQLite,
  loadCachedProductsFromSQLite,
  loadOfflineSalesReceiptsFromSQLite,
  markOfflineSalesReceiptStatusInSQLite,
  isSQLiteAvailable,
  saveBootstrapCacheToSQLite,
  saveOfflineSalesReceiptToSQLite,
} from './sqliteStorage';

const KEYS = {
  settings: 'melisa-terminal:settings',
  session: 'melisa-terminal:session',
  failedOperations: 'melisa-terminal:failed-operations',
  draftDocuments: 'melisa-terminal:draft-documents',
  activeSaleDraft: 'melisa-terminal:active-sale-draft',
  offlineSalesReceipts: 'melisa-terminal:offline-sales-receipts',
  cachedProducts: 'melisa-terminal:cached-products',
  cachedCustomers: 'melisa-terminal:cached-customers',
  bootstrapMeta: 'melisa-terminal:bootstrap-meta',
  lastSyncAt: 'melisa-terminal:last-sync-at',
};

const defaultSettings: TerminalSettings = {
  terminalId: 'MB-TERM-001',
  branch: 'Merkez Depo',
  apiBaseUrl: 'http://localhost:4000/api',
  vibrationEnabled: true,
  urgentVibrationEnabled: true,
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<TerminalSettings> {
  const settings = await readJson(KEYS.settings, defaultSettings);
  const normalizedSettings = { ...defaultSettings, ...settings };
  return normalizedSettings.apiBaseUrl.toLowerCase().includes('mock') ? { ...normalizedSettings, apiBaseUrl: defaultSettings.apiBaseUrl } : normalizedSettings;
}

export async function saveSettings(settings: TerminalSettings): Promise<void> {
  await writeJson(KEYS.settings, settings);
}

export async function loadSession(): Promise<UserSession | null> {
  return readJson<UserSession | null>(KEYS.session, null);
}

export async function saveSession(session: UserSession): Promise<void> {
  await writeJson(KEYS.session, session);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
}

export async function loadFailedOperations(): Promise<FailedOperation[]> {
  return readJson(KEYS.failedOperations, []);
}

export async function loadFailedOperationsSnapshot(): Promise<FailedOperation[] | null> {
  const value = await AsyncStorage.getItem(KEYS.failedOperations);
  return value ? (JSON.parse(value) as FailedOperation[]) : null;
}

export async function saveFailedOperations(operations: FailedOperation[]): Promise<void> {
  await writeJson(KEYS.failedOperations, operations);
}

export async function loadDraftDocuments(): Promise<OpenDocument[]> {
  return readJson(KEYS.draftDocuments, []);
}

export async function saveDraftDocuments(documents: OpenDocument[]): Promise<void> {
  await writeJson(KEYS.draftDocuments, documents);
}

export async function loadActiveSaleDraft(): Promise<ActiveSaleDraft | null> {
  return readJson<ActiveSaleDraft | null>(KEYS.activeSaleDraft, null);
}

export async function saveActiveSaleDraft(draft: ActiveSaleDraft): Promise<void> {
  await writeJson(KEYS.activeSaleDraft, draft);
}

export async function clearActiveSaleDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.activeSaleDraft);
}

export async function loadOfflineSalesReceipts(): Promise<OfflineSalesReceipt[]> {
  try {
    const sqliteReceipts = await loadOfflineSalesReceiptsFromSQLite();
    if (sqliteReceipts.length > 0) return sqliteReceipts;
  } catch {
    // AsyncStorage fallback keeps older devices and web preview usable.
  }
  return readJson(KEYS.offlineSalesReceipts, []);
}

export async function saveOfflineSalesReceipt(receipt: OfflineSalesReceipt): Promise<void> {
  const receipts = await loadOfflineSalesReceipts();
  const normalizedReceipt = { ...receipt, status: receipt.status ?? (receipt.synced ? 'SYNCED' : 'PENDING') } satisfies OfflineSalesReceipt;
  const withoutDuplicate = receipts.filter((item) => item.localUuid !== normalizedReceipt.localUuid);
  await writeJson(KEYS.offlineSalesReceipts, [normalizedReceipt, ...withoutDuplicate]);
  try {
    await saveOfflineSalesReceiptToSQLite(normalizedReceipt);
  } catch {
    // SQLite is the preferred queue, AsyncStorage remains the compatibility layer.
  }
}

export async function markOfflineSalesReceiptSynced(localUuid: string): Promise<void> {
  const receipts = await loadOfflineSalesReceipts();
  await writeJson(
    KEYS.offlineSalesReceipts,
    receipts.map((receipt) => (receipt.localUuid === localUuid ? { ...receipt, synced: true, status: 'SYNCED', lastError: undefined } : receipt)),
  );
  try {
    await markOfflineSalesReceiptStatusInSQLite(localUuid, 'SYNCED');
  } catch {
    // Fallback already persisted above.
  }
  await saveLastSyncAt(new Date().toISOString());
}

export async function markOfflineSalesReceiptFailed(localUuid: string, lastError: string): Promise<void> {
  const receipts = await loadOfflineSalesReceipts();
  await writeJson(
    KEYS.offlineSalesReceipts,
    receipts.map((receipt) => (
      receipt.localUuid === localUuid
        ? { ...receipt, synced: false, status: 'FAILED', retryCount: receipt.retryCount + 1, lastError }
        : receipt
    )),
  );
  try {
    await markOfflineSalesReceiptStatusInSQLite(localUuid, 'FAILED', lastError);
  } catch {
    // Fallback already persisted above.
  }
}

export async function saveBootstrapCache(data: TerminalBootstrapData): Promise<void> {
  await Promise.all([
    writeJson(KEYS.cachedProducts, data.products),
    writeJson(KEYS.cachedCustomers, data.customers),
    writeJson(KEYS.bootstrapMeta, data.settings),
  ]);
  try {
    await saveBootstrapCacheToSQLite(data);
  } catch {
    // AsyncStorage cache remains available if SQLite is not initialized in preview.
  }
}

export async function loadBootstrapMeta(): Promise<TerminalBootstrapData['settings'] | null> {
  return readJson<TerminalBootstrapData['settings'] | null>(KEYS.bootstrapMeta, null);
}

export async function loadCachedProducts(): Promise<CachedProduct[]> {
  try {
    const products = await loadCachedProductsFromSQLite();
    if (products.length > 0) return products;
  } catch {
    // Fallback below.
  }
  return readJson(KEYS.cachedProducts, []);
}

export async function loadCachedCustomers(): Promise<CachedCustomer[]> {
  try {
    const customers = await loadCachedCustomersFromSQLite();
    if (customers.length > 0) return customers;
  } catch {
    // Fallback below.
  }
  return readJson(KEYS.cachedCustomers, []);
}

export async function saveLastSuccessfulConnectionAt(timestamp: string): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, lastSuccessfulConnectionAt: timestamp });
}

export async function loadLastSuccessfulConnectionAt(): Promise<string | null> {
  const settings = await loadSettings();
  return settings.lastSuccessfulConnectionAt ?? null;
}

export async function saveLastSyncAt(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastSyncAt, timestamp);
}

export async function loadLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastSyncAt);
}

export async function checkSQLiteAvailable(): Promise<boolean> {
  return isSQLiteAvailable();
}
