import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataTable } from './components/DataTable';
import { api, clearAuthToken, getAuthToken, getDevRole, getStoredUser, setAuthToken, setDevRole, setStoredUser } from './services/api';
import type { AppUser, CashMovementInput, Currency, CurrentAccountMovement, Customer, CustomerCard, CustomerSummaryReport, DashboardStats, DashboardSummary, ExchangeRate, ImportJob, ImportKind, ImportMode, ImportPreviewResponse, ImportPreviewRow, PermissionMatrix, Product, ProductProfitReport, PurchaseReceipt, PurchaseReceiptInput, ReceiptItemInput, RecentSaleReport, SalesAnalytics, SalesProfitReport, SalesReceipt, SalesReceiptInput, SalesReceiptProfitDetail, StockCard, StockMovement, StockMovementReport, StockValuationRow, StockValuationSummary, Supplier, SystemStatus, TerminalSyncLog, TerminalSyncSummary, TopProductReport, UserRole } from './types';
import './styles.css';

type Tab =
  | 'dashboard'
  | 'salesReceipts'
  | 'newSalesReceipt'
  | 'pendingSyncReceipts'
  | 'purchaseReceipts'
  | 'newPurchaseReceipt'
  | 'supplierPayables'
  | 'stockCards'
  | 'barcodeList'
  | 'stockMovements'
  | 'stockValuation'
  | 'lowStockReport'
  | 'customerCards'
  | 'customerMovements'
  | 'collectionEntry'
  | 'paymentEntry'
  | 'accountStatement'
  | 'accountSummary'
  | 'supplierCards'
  | 'supplierMovements'
  | 'customerSalesSummary'
  | 'dailySalesReport'
  | 'productSalesReport'
  | 'productProfitReport'
  | 'salesProfitReport'
  | 'lowProfitProducts'
  | 'customerSalesReport'
  | 'terminalPerformanceReport'
  | 'terminalDevices'
  | 'terminalSync'
  | 'offlineQueue'
  | 'failedSync'
  | 'users'
  | 'permissions'
  | 'companySettings'
  | 'productImport'
  | 'customerImport'
  | 'supplierImport'
  | 'priceImport'
  | 'stockImport'
  | 'importHistory'
  | 'salesAnalytics'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'purchase'
  | 'sales'
  | 'rates'
  | 'history'
  | 'system';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'salesReceipts', label: 'Satış Fişleri' },
  { id: 'stockCards', label: 'Stok Kartları' },
  { id: 'customerCards', label: 'Müşteri Kartları' },
  { id: 'terminalSync', label: 'Terminal Sync' },
  { id: 'stockMovements', label: 'Stok Hareketleri' },
  { id: 'salesAnalytics', label: 'Satış Analizleri' },
];

type MenuItem = { id: Tab; label: string; ready?: boolean };
type MenuGroup = { title: string; items: MenuItem[] };
type PermissionCode =
  | 'salesView'
  | 'salesCreate'
  | 'salesCancel'
  | 'purchaseView'
  | 'purchaseCreate'
  | 'purchaseCancel'
  | 'stockView'
  | 'stockAdjust'
  | 'priceUpdate'
  | 'partyManage'
  | 'cashMovement'
  | 'importApply'
  | 'reportsView'
  | 'terminalSyncView'
  | 'userManage';

const menuGroups: MenuGroup[] = [
  { title: 'Ana Sayfa', items: [{ id: 'dashboard', label: 'Dashboard' }] },
  {
    title: 'Satış',
    items: [
      { id: 'salesReceipts', label: 'Satış Fişleri' },
      { id: 'newSalesReceipt', label: 'Yeni Satış Fişi' },
      { id: 'pendingSyncReceipts', label: 'Bekleyen/Hatalı Sync Fişleri' },
    ],
  },
  {
    title: 'Alış',
    items: [
      { id: 'purchaseReceipts', label: 'Alış Fişleri' },
      { id: 'newPurchaseReceipt', label: 'Yeni Alış Fişi' },
      { id: 'supplierPayables', label: 'Tedarikçi Borçları' },
    ],
  },
  {
    title: 'Stok',
    items: [
      { id: 'stockCards', label: 'Stok Kartları' },
      { id: 'barcodeList', label: 'Barkod Listesi' },
      { id: 'stockMovements', label: 'Stok Hareketleri' },
      { id: 'lowStockReport', label: 'Düşük Stok Raporu' },
    ],
  },
  {
    title: 'Cari',
    items: [
      { id: 'customerCards', label: 'Müşteri Kartları' },
      { id: 'supplierCards', label: 'Tedarikçi Kartları' },
      { id: 'customerMovements', label: 'Cari Hareketler' },
      { id: 'collectionEntry', label: 'Tahsilat Girişi' },
      { id: 'paymentEntry', label: 'Ödeme Girişi' },
      { id: 'accountStatement', label: 'Cari Ekstre' },
      { id: 'accountSummary', label: 'Borç/Alacak Özeti' },
      { id: 'supplierMovements', label: 'Tedarikçi Hareketleri' },
      { id: 'customerSalesSummary', label: 'Müşteri Satış Özeti' },
    ],
  },
  {
    title: 'Raporlar',
    items: [
      { id: 'dailySalesReport', label: 'Günlük Satış Raporu' },
      { id: 'stockValuation', label: 'Stok Değer Raporu' },
      { id: 'productSalesReport', label: 'Ürün Satış Raporu' },
      { id: 'customerSalesReport', label: 'Müşteri Satış Raporu' },
      { id: 'productProfitReport', label: 'Ürün Kar Raporu' },
      { id: 'salesProfitReport', label: 'Fiş Kar Analizi' },
      { id: 'lowProfitProducts', label: 'Düşük Karlı Ürünler' },
      { id: 'terminalPerformanceReport', label: 'Terminal Performans Raporu', ready: false },
    ],
  },
  {
    title: 'Terminal',
    items: [
      { id: 'terminalDevices', label: 'Terminal Cihazları', ready: false },
      { id: 'terminalSync', label: 'Sync Logları' },
      { id: 'offlineQueue', label: 'Offline Kuyruk', ready: false },
      { id: 'failedSync', label: 'Hatalı Gönderimler' },
    ],
  },
  {
    title: 'Toplu İşlemler',
    items: [
      { id: 'productImport', label: 'Ürün Import' },
      { id: 'customerImport', label: 'Müşteri Import' },
      { id: 'supplierImport', label: 'Tedarikçi Import' },
      { id: 'priceImport', label: 'Fiyat Güncelle' },
      { id: 'stockImport', label: 'Stok Güncelle / Stok Sayım' },
      { id: 'importHistory', label: 'Import Geçmişi' },
    ],
  },
  {
    title: 'Ayarlar',
    items: [
      { id: 'users', label: 'Kullanıcılar' },
      { id: 'permissions', label: 'Yetkiler' },
      { id: 'companySettings', label: 'Firma Ayarları', ready: false },
    ],
  },
];

const emptyStats: DashboardStats = {
  productCount: 0,
  customerCount: 0,
  supplierCount: 0,
  todaySales: 0,
  totalSales: 0,
  lastSale: null,
  pendingTerminalReceipts: 0,
};

const emptyDashboardSummary: DashboardSummary = {
  todaySalesCount: 0,
  todaySalesTotal: 0,
  todayItemQuantity: 0,
  activeCustomerCount: 0,
  productCount: 0,
  lowStockCount: 0,
  pendingSyncCount: 0,
  failedSyncCount: 0,
  lastSyncAt: null,
};

const emptyTerminalSyncSummary: TerminalSyncSummary = {
  total: 0,
  pending: 0,
  synced: 0,
  failed: 0,
};

const emptySalesAnalytics: SalesAnalytics = {
  dailySales: { receiptCount: 0, totalAmount: 0 },
  weeklySales: { receiptCount: 0, totalAmount: 0 },
  topProduct: null,
  activeCustomer: null,
  currencyTotals: [],
};

const emptyStockValuationSummary: StockValuationSummary = {
  totalProductCount: 0,
  totalStockQuantity: 0,
  totalStockValueTry: 0,
  totalPotentialSaleValueTry: 0,
  totalPotentialGrossProfitTry: 0,
  lowStockCount: 0,
};

const roleOptions: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING', 'VIEWER'];
const permissionLabels: Record<PermissionCode, string> = {
  salesView: 'Satış görüntüleme',
  salesCreate: 'Satış oluşturma',
  salesCancel: 'Satış iptal',
  purchaseView: 'Alış görüntüleme',
  purchaseCreate: 'Alış oluşturma',
  purchaseCancel: 'Alış iptal',
  stockView: 'Stok görüntüleme',
  stockAdjust: 'Stok düzeltme',
  priceUpdate: 'Fiyat güncelleme',
  partyManage: 'Müşteri/tedarikçi yönetimi',
  cashMovement: 'Ödeme/tahsilat',
  importApply: 'Import yapma',
  reportsView: 'Rapor görüntüleme',
  terminalSyncView: 'Terminal sync görüntüleme',
  userManage: 'Kullanıcı yönetimi',
};

const frontendRolePermissions: Record<UserRole, PermissionCode[]> = {
  ADMIN: Object.keys(permissionLabels) as PermissionCode[],
  MANAGER: (Object.keys(permissionLabels) as PermissionCode[]).filter((permission) => permission !== 'userManage'),
  SALES: ['salesView', 'salesCreate', 'stockView', 'partyManage', 'reportsView'],
  WAREHOUSE: ['purchaseView', 'stockView', 'stockAdjust', 'importApply', 'terminalSyncView'],
  ACCOUNTING: ['salesView', 'purchaseView', 'partyManage', 'cashMovement', 'reportsView'],
  VIEWER: ['salesView', 'purchaseView', 'stockView', 'reportsView', 'terminalSyncView'],
  STAFF: ['salesView', 'purchaseView', 'stockView', 'reportsView'],
};

const tabPermissions: Partial<Record<Tab, PermissionCode[]>> = {
  dashboard: ['reportsView'],
  salesReceipts: ['salesView'],
  newSalesReceipt: ['salesCreate'],
  pendingSyncReceipts: ['terminalSyncView'],
  purchaseReceipts: ['purchaseView'],
  newPurchaseReceipt: ['purchaseCreate'],
  supplierPayables: ['purchaseView'],
  stockCards: ['stockView'],
  barcodeList: ['stockView'],
  stockMovements: ['stockView'],
  stockValuation: ['reportsView'],
  lowStockReport: ['stockView'],
  customerCards: ['partyManage'],
  customerMovements: ['partyManage'],
  collectionEntry: ['cashMovement'],
  paymentEntry: ['cashMovement'],
  accountStatement: ['partyManage'],
  accountSummary: ['partyManage'],
  supplierCards: ['partyManage'],
  supplierMovements: ['partyManage'],
  customerSalesSummary: ['reportsView'],
  dailySalesReport: ['reportsView'],
  productSalesReport: ['reportsView'],
  productProfitReport: ['reportsView'],
  salesProfitReport: ['reportsView'],
  lowProfitProducts: ['reportsView'],
  customerSalesReport: ['reportsView'],
  terminalPerformanceReport: ['reportsView'],
  terminalDevices: ['terminalSyncView'],
  terminalSync: ['terminalSyncView'],
  offlineQueue: ['terminalSyncView'],
  failedSync: ['terminalSyncView'],
  productImport: ['importApply'],
  customerImport: ['importApply'],
  supplierImport: ['importApply'],
  priceImport: ['priceUpdate'],
  stockImport: ['stockAdjust'],
  importHistory: ['importApply'],
  salesAnalytics: ['reportsView'],
  products: ['stockView'],
  customers: ['partyManage'],
  suppliers: ['partyManage'],
  purchase: ['purchaseView'],
  sales: ['salesView'],
  rates: ['priceUpdate'],
  history: ['stockView'],
  system: ['userManage'],
  users: ['userManage'],
  permissions: ['reportsView'],
  companySettings: ['userManage'],
};

function hasPermission(role: UserRole, permission: PermissionCode) {
  return frontendRolePermissions[role]?.includes(permission) ?? false;
}

function canOpenTab(role: UserRole, tab: Tab) {
  const required = tabPermissions[tab];
  return !required || required.every((permission) => hasPermission(role, permission));
}

function importApplyPermission(kind: ImportKind): PermissionCode {
  if (kind === 'prices') return 'priceUpdate';
  if (kind === 'stock') return 'stockAdjust';
  return 'importApply';
}

function permissionDeniedMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return message.includes('yetkiniz yok') ? 'Bu işlem için yetkiniz yok.' : message;
}

function App() {
  const [token, setToken] = useState(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salesReceipts, setSalesReceipts] = useState<SalesReceipt[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(emptyDashboardSummary);
  const [recentSalesReport, setRecentSalesReport] = useState<RecentSaleReport[]>([]);
  const [topProductsReport, setTopProductsReport] = useState<TopProductReport[]>([]);
  const [customerSummaryReport, setCustomerSummaryReport] = useState<CustomerSummaryReport[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [customerCards, setCustomerCards] = useState<CustomerCard[]>([]);
  const [currentAccountMovements, setCurrentAccountMovements] = useState<CurrentAccountMovement[]>([]);
  const [terminalSyncLogs, setTerminalSyncLogs] = useState<TerminalSyncLog[]>([]);
  const [terminalSyncSummary, setTerminalSyncSummary] = useState<TerminalSyncSummary>(emptyTerminalSyncSummary);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockMovementReport, setStockMovementReport] = useState<StockMovementReport[]>([]);
  const [stockValuationRows, setStockValuationRows] = useState<StockValuationRow[]>([]);
  const [stockValuationSummary, setStockValuationSummary] = useState<StockValuationSummary>(emptyStockValuationSummary);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>(emptySalesAnalytics);
  const [productProfitRows, setProductProfitRows] = useState<ProductProfitReport[]>([]);
  const [salesProfitRows, setSalesProfitRows] = useState<SalesProfitReport[]>([]);
  const [lowProfitRows, setLowProfitRows] = useState<ProductProfitReport[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [devRole, setDevRoleState] = useState<UserRole>(() => getDevRole());
  const currentRole: UserRole = devRole;
  const [status, setStatus] = useState('Veri yukleniyor');
  const [openMenuGroup, setOpenMenuGroup] = useState<string>('Ana Sayfa');
  const visibleMenuGroups = useMemo(() => menuGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpenTab(currentRole, item.id)) }))
    .filter((group) => group.items.length > 0), [currentRole]);
  const activeMenuGroup = useMemo(() => visibleMenuGroups.find((group) => group.items.some((item) => item.id === activeTab))?.title, [activeTab, visibleMenuGroups]);

  useEffect(() => {
    if (!canOpenTab(currentRole, activeTab)) {
      setActiveTab(visibleMenuGroups[0]?.items[0]?.id ?? 'dashboard');
    }
  }, [activeTab, currentRole, visibleMenuGroups]);

  useEffect(() => {
    if (activeMenuGroup) {
      setOpenMenuGroup(activeMenuGroup);
    }
  }, [activeMenuGroup]);

  const refresh = async () => {
    if (!getAuthToken()) return;
    try {
      const canViewReports = hasPermission(currentRole, 'reportsView');
      const canViewTerminalSync = hasPermission(currentRole, 'terminalSyncView');
      const canViewStock = hasPermission(currentRole, 'stockView');
      const canViewSales = hasPermission(currentRole, 'salesView');
      const canViewPurchases = hasPermission(currentRole, 'purchaseView');
      const canViewParty = hasPermission(currentRole, 'partyManage') || hasPermission(currentRole, 'cashMovement');
      const canViewImports = hasPermission(currentRole, 'importApply') || hasPermission(currentRole, 'priceUpdate') || hasPermission(currentRole, 'stockAdjust');
      const canViewSystem = hasPermission(currentRole, 'reportsView');
      const canManageUsers = hasPermission(currentRole, 'userManage');
      const [nextProducts, nextCustomers, nextSuppliers, nextStats, nextDashboardSummary, nextRecentSalesReport, nextTopProductsReport, nextCustomerSummaryReport, nextStockCards, nextCustomerCards, nextCurrentAccountMovements, nextTerminalSyncLogs, nextTerminalSyncSummary, nextStockMovements, nextStockMovementReport, nextStockValuationRows, nextStockValuationSummary, nextSalesAnalytics, nextProductProfitRows, nextSalesProfitRows, nextLowProfitRows, nextImportJobs, nextSalesReceipts, nextPurchaseReceipts, nextRate, nextRates, nextSystemStatus, nextUsers, nextPermissionMatrix] = await Promise.all([
        canViewStock ? api.products() : Promise.resolve([]),
        canViewParty ? api.customers() : Promise.resolve([]),
        canViewParty ? api.suppliers() : Promise.resolve([]),
        canViewReports ? api.dashboardStats() : Promise.resolve(emptyStats),
        canViewReports ? api.dashboardSummary() : Promise.resolve(emptyDashboardSummary),
        canViewReports ? api.recentSalesReport() : Promise.resolve([]),
        canViewReports ? api.topProductsReport() : Promise.resolve([]),
        canViewReports ? api.customerSummaryReport() : Promise.resolve([]),
        canViewStock ? api.stockCards() : Promise.resolve([]),
        canViewParty ? api.customerCards() : Promise.resolve([]),
        canViewParty ? api.currentAccountMovements() : Promise.resolve([]),
        canViewTerminalSync ? api.terminalSyncLogs() : Promise.resolve({ ok: true, logs: [] }),
        canViewTerminalSync ? api.terminalSyncSummary() : Promise.resolve(emptyTerminalSyncSummary),
        canViewStock ? api.stockMovements() : Promise.resolve([]),
        canViewReports ? api.stockMovementReport() : Promise.resolve([]),
        canViewReports ? api.stockValuation() : Promise.resolve([]),
        canViewReports ? api.stockValuationSummary() : Promise.resolve(emptyStockValuationSummary),
        canViewReports ? api.salesAnalytics() : Promise.resolve(emptySalesAnalytics),
        canViewReports ? api.productProfit() : Promise.resolve([]),
        canViewReports ? api.salesProfit() : Promise.resolve([]),
        canViewReports ? api.lowProfitProducts() : Promise.resolve([]),
        canViewImports ? api.importJobs() : Promise.resolve([]),
        canViewSales ? api.salesReceipts() : Promise.resolve([]),
        canViewPurchases ? api.purchaseReceipts() : Promise.resolve([]),
        api.activeExchangeRate(),
        canViewReports ? api.exchangeRates() : Promise.resolve([]),
        canViewSystem ? api.systemStatus() : Promise.resolve(null),
        canManageUsers ? api.users() : Promise.resolve([]),
        canViewReports ? api.permissionMatrix() : Promise.resolve(null),
      ]);
      setProducts(nextProducts);
      setCustomers(nextCustomers);
      setSuppliers(nextSuppliers);
      setSalesReceipts(nextSalesReceipts);
      setPurchaseReceipts(nextPurchaseReceipts);
      setStats(nextStats);
      setDashboardSummary(nextDashboardSummary);
      setRecentSalesReport(nextRecentSalesReport);
      setTopProductsReport(nextTopProductsReport);
      setCustomerSummaryReport(nextCustomerSummaryReport);
      setStockCards(nextStockCards);
      setCustomerCards(nextCustomerCards);
      setCurrentAccountMovements(nextCurrentAccountMovements);
      setTerminalSyncLogs(nextTerminalSyncLogs.logs);
      setTerminalSyncSummary(nextTerminalSyncSummary);
      setStockMovements(nextStockMovements);
      setStockMovementReport(nextStockMovementReport);
      setStockValuationRows(nextStockValuationRows);
      setStockValuationSummary(nextStockValuationSummary);
      setSalesAnalytics(nextSalesAnalytics);
      setProductProfitRows(nextProductProfitRows);
      setSalesProfitRows(nextSalesProfitRows);
      setLowProfitRows(nextLowProfitRows);
      setImportJobs(nextImportJobs);
      setExchangeRate(nextRate);
      setExchangeRates(nextRates);
      setSystemStatus(nextSystemStatus);
      setUsers(nextUsers);
      setPermissionMatrix(nextPermissionMatrix);
      setStatus(`API bağlantısi hazir / ${currentRole}`);
    } catch (error) {
      setProducts(demoProducts);
      setCustomers(demoCustomers);
      setSuppliers(demoSuppliers);
      setStats({
        productCount: demoProducts.length,
        customerCount: demoCustomers.length,
        supplierCount: demoSuppliers.length,
        todaySales: 0,
        totalSales: 0,
        lastSale: null,
        pendingTerminalReceipts: 0,
      });
      setDashboardSummary(emptyDashboardSummary);
      setRecentSalesReport([]);
      setTopProductsReport([]);
      setCustomerSummaryReport([]);
      setStockCards([]);
      setCustomerCards([]);
      setCurrentAccountMovements([]);
      setTerminalSyncLogs([]);
      setTerminalSyncSummary(emptyTerminalSyncSummary);
      setStockMovements([]);
      setStockMovementReport([]);
      setStockValuationRows([]);
      setStockValuationSummary(emptyStockValuationSummary);
      setSalesAnalytics(emptySalesAnalytics);
      setProductProfitRows([]);
      setSalesProfitRows([]);
      setLowProfitRows([]);
      setImportJobs([]);
      const message = error instanceof Error ? error.message : 'Demo veri gosteriliyor';
      if (message.includes('401')) {
        clearAuthToken();
        setToken('');
        setCurrentUser(null);
      }
      setStatus(error instanceof Error ? `Demo veri: ${error.message}` : 'Demo veri gosteriliyor');
    }
  };

  useEffect(() => {
    void refresh();
  }, [token, currentRole]);

  const login = async (username: string, password: string) => {
    const result = await api.login({ username, password });
    setAuthToken(result.token);
    setStoredUser(result.user);
    setToken(result.token);
    setCurrentUser(result.user);
    setStatus('API bağlantısi hazir');
  };

  const logout = () => {
    clearAuthToken();
    setToken(getAuthToken());
    setCurrentUser(getStoredUser());
      setSystemStatus(null);
      setPermissionMatrix(null);
  };

  const changeDevRole = (role: UserRole) => {
    setDevRole(role);
    setDevRoleState(role);
    const devUser: AppUser = { id: role === 'ADMIN' ? 0 : roleOptions.indexOf(role) + 1, name: `Dev ${role}`, username: `dev-${role.toLowerCase()}`, role, active: true };
    setStoredUser(devUser);
    setCurrentUser(devUser);
    setStatus(`Dev rol degisti: ${role}`);
  };

  return (
    <main className="app">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Melisa Bebe</p>
          <h1>Mini ERP</h1>
        </div>
        <div className="user-box">
          <strong>{currentUser?.name ?? systemStatus?.activeUser.name ?? 'Kullanıcı'}</strong>
          <span>{currentRole}</span>
          <label className="dev-role-select">
            <span>Dev rol</span>
            <select value={currentRole} onChange={(event) => changeDevRole(event.target.value as UserRole)}>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <button type="button" className="ghost" onClick={logout}>Çıkış Yap</button>
        </div>
        <nav className="erp-menu">
          {visibleMenuGroups.map((group) => {
            const isOpen = openMenuGroup === group.title;
            const hasActiveItem = group.items.some((item) => item.id === activeTab);
            return (
            <div className={`menu-group ${isOpen ? 'open' : ''}`} key={group.title}>
              <button
                type="button"
                className={`menu-group-toggle ${hasActiveItem ? 'has-active' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setOpenMenuGroup(isOpen ? '' : group.title)}
              >
                <span>{group.title}</span>
                <b>{group.items.length}</b>
              </button>
              {isOpen ? <div className="menu-group-items">
              {group.items.map((item) => (
                <button key={item.id} className={activeTab === item.id ? 'active' : ''} onClick={() => setActiveTab(item.id)}>
                  <span>{item.label}</span>
                  {item.ready === false ? <small>Hazırlanıyor</small> : null}
                </button>
              ))}
              </div> : null}
            </div>
            );
          })}
        </nav>
        <p className="status">{status}</p>
      </aside>
      <section className="content">
        {activeTab === 'dashboard' && <Dashboard summary={dashboardSummary} recentSales={recentSalesReport} topProducts={topProductsReport} customerSummary={customerSummaryReport} stats={stats} onNavigate={(tab) => canOpenTab(currentRole, tab) ? setActiveTab(tab) : setStatus('Bu ekran için yetkiniz yok.')} />}
        {activeTab === 'salesReceipts' && <SalesReceiptView products={products} customers={customers} receipts={salesReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} />}
        {activeTab === 'newSalesReceipt' && <SalesReceiptView products={products} customers={customers} receipts={salesReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} startOpen />}
        {activeTab === 'pendingSyncReceipts' && <PendingSyncReceiptsPanel receipts={salesReceipts} logs={terminalSyncLogs} />}
        {activeTab === 'purchaseReceipts' && <PurchaseReceiptView products={products} suppliers={suppliers} receipts={purchaseReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} />}
        {activeTab === 'newPurchaseReceipt' && <PurchaseReceiptView products={products} suppliers={suppliers} receipts={purchaseReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} startOpen />}
        {activeTab === 'supplierPayables' && <SupplierPayablesPanel suppliers={suppliers} />}
        {activeTab === 'stockCards' && <StockCardsPanel cards={stockCards} products={products} movements={stockMovements} role={currentRole} onSaved={refresh} />}
        {activeTab === 'barcodeList' && <BarcodeListPanel cards={stockCards} />}
        {activeTab === 'customerCards' && <CustomerCardsPanel cards={customerCards} customers={customers} movements={currentAccountMovements} role={currentRole} onSaved={refresh} />}
        {activeTab === 'supplierCards' && <SuppliersView suppliers={suppliers} purchaseReceipts={purchaseReceipts} role={currentRole} onSaved={refresh} />}
        {activeTab === 'lowStockReport' && <LowStockReportPanel cards={stockCards} />}
        {activeTab === 'supplierMovements' && <SupplierMovementsPanel suppliers={suppliers} />}
        {activeTab === 'customerMovements' && <CurrentAccountMovementsPanel movements={currentAccountMovements} customers={customers} suppliers={suppliers} onLoad={async (query) => setCurrentAccountMovements(await api.currentAccountMovements(query))} />}
        {activeTab === 'collectionEntry' && <CashMovementEntryPanel mode="collection" role={currentRole} customers={customers} suppliers={suppliers} onSaved={refresh} />}
        {activeTab === 'paymentEntry' && <CashMovementEntryPanel mode="payment" role={currentRole} customers={customers} suppliers={suppliers} onSaved={refresh} />}
        {activeTab === 'accountStatement' && <CurrentAccountMovementsPanel movements={currentAccountMovements} customers={customers} suppliers={suppliers} onLoad={async (query) => setCurrentAccountMovements(await api.currentAccountMovements(query))} />}
        {activeTab === 'accountSummary' && <AccountSummaryPanel movements={currentAccountMovements} customers={customers} suppliers={suppliers} />}
        {activeTab === 'customerSalesSummary' && <CustomerSalesSummaryPanel customerSummary={customerSummaryReport} />}
        {activeTab === 'dailySalesReport' && <DailySalesReportPanel analytics={salesAnalytics} recentSales={recentSalesReport} />}
        {activeTab === 'productSalesReport' && <ProductSalesReportPanel topProducts={topProductsReport} />}
        {activeTab === 'productProfitReport' && <ProductProfitPanel rows={productProfitRows} onLoad={async (query) => setProductProfitRows(await api.productProfit(query))} />}
        {activeTab === 'salesProfitReport' && <SalesProfitPanel rows={salesProfitRows} onLoad={async (query) => setSalesProfitRows(await api.salesProfit(query))} />}
        {activeTab === 'lowProfitProducts' && <LowProfitProductsPanel rows={lowProfitRows} onLoad={async (query) => setLowProfitRows(await api.lowProfitProducts(query))} />}
        {activeTab === 'customerSalesReport' && <CustomerSalesSummaryPanel customerSummary={customerSummaryReport} />}
        {activeTab === 'terminalPerformanceReport' && <PlaceholderPanel title="Terminal Performans Raporu" group="Raporlar" description="Terminal bazlı fiş, sync başarı oranı ve son bağlantı raporu hazırlanıyor." />}
        {activeTab === 'terminalDevices' && <PlaceholderPanel title="Terminal Cihazları" group="Terminal" description="Cihaz kartları, son bağlantı zamanı ve aktif/pasif cihaz takibi hazırlanıyor." />}
        {activeTab === 'terminalSync' && <TerminalSyncPanel logs={terminalSyncLogs} summary={terminalSyncSummary} />}
        {activeTab === 'offlineQueue' && <PlaceholderPanel title="Offline Kuyruk" group="Terminal" description="Android terminallerden bekleyen offline fişlerin merkezi izleme ekranı hazırlanıyor." />}
        {activeTab === 'failedSync' && <FailedSyncPanel logs={terminalSyncLogs} />}
        {activeTab === 'permissions' && <PermissionsPanel matrix={permissionMatrix} />}
        {activeTab === 'companySettings' && <PlaceholderPanel title="Firma Ayarları" group="Ayarlar" description="Firma adı, varsayılan para birimi ve terminal çalışma ayarları hazırlanıyor." />}
        {activeTab === 'productImport' && <CsvImportPanel kind="products" title="Ürün Import" role={currentRole} onApplied={refresh} />}
        {activeTab === 'customerImport' && <CsvImportPanel kind="customers" title="Müşteri Import" role={currentRole} onApplied={refresh} />}
        {activeTab === 'supplierImport' && <CsvImportPanel kind="suppliers" title="Tedarikçi Import" role={currentRole} onApplied={refresh} />}
        {activeTab === 'priceImport' && <CsvImportPanel kind="prices" title="Fiyat Güncelle" role={currentRole} onApplied={refresh} />}
        {activeTab === 'stockImport' && <CsvImportPanel kind="stock" title="Stok Güncelle / Stok Sayım" role={currentRole} onApplied={refresh} />}
        {activeTab === 'importHistory' && <ImportHistoryPanel jobs={importJobs} onRefresh={async () => setImportJobs(await api.importJobs())} />}
        {activeTab === 'stockMovements' && <StockMovementReportPanel movements={stockMovementReport} products={stockCards} onLoad={async (query) => setStockMovementReport(await api.stockMovementReport(query))} />}
        {activeTab === 'stockValuation' && <StockValuationPanel rows={stockValuationRows} summary={stockValuationSummary} />}
        {activeTab === 'salesAnalytics' && <SalesAnalyticsPanel analytics={salesAnalytics} topProducts={topProductsReport} customerSummary={customerSummaryReport} />}
        {activeTab === 'products' && <ProductsView products={products} role={currentRole} onSaved={refresh} />}
        {activeTab === 'customers' && <CustomersView customers={customers} salesReceipts={salesReceipts} role={currentRole} onSaved={refresh} />}
        {activeTab === 'suppliers' && <SuppliersView suppliers={suppliers} purchaseReceipts={purchaseReceipts} role={currentRole} onSaved={refresh} />}
        {activeTab === 'purchase' && <PurchaseReceiptView products={products} suppliers={suppliers} receipts={purchaseReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} />}
        {activeTab === 'sales' && <SalesReceiptView products={products} customers={customers} receipts={salesReceipts} exchangeRate={exchangeRate} role={currentRole} onSaved={refresh} />}
        {activeTab === 'rates' && <ExchangeRateView rate={exchangeRate} rates={exchangeRates} role={currentRole} onSaved={refresh} />}
        {activeTab === 'history' && <HistoryView products={products} />}
        {activeTab === 'system' && <SystemStatusView status={systemStatus} />}
        {activeTab === 'users' && currentRole === 'ADMIN' && <UsersView users={users} onSaved={refresh} />}
      </section>
    </main>
  );
}

function LoginView({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await onLogin(username, password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Giriş başarısız.');
    }
  };

  return (
    <main className="login-page">
      <form className="panel login-panel" onSubmit={submit}>
        <p className="eyebrow">Melisa Bebe</p>
        <h1>Mini ERP Giriş</h1>
        <Field label="Kullanıcı adi" value={username} onChange={setUsername} />
        <label>
          <span>Sifre</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="primary">Giriş Yap</button>
        {message ? <p className="message">{message}</p> : null}
      </form>
    </main>
  );
}

function Dashboard({ summary, recentSales, topProducts, customerSummary, stats, onNavigate }: { summary: DashboardSummary; recentSales: RecentSaleReport[]; topProducts: TopProductReport[]; customerSummary: CustomerSummaryReport[]; stats: DashboardStats; onNavigate: (tab: Tab) => void }) {
  const lastSyncLabel = summary.lastSyncAt ? dateLabel(summary.lastSyncAt) : 'Henüz yok';
  const salesTrend = buildDailySalesTrend(recentSales);
  const topProductBars = topProducts.slice(0, 6).map((product) => ({
    label: product.productName,
    meta: product.productCode,
    value: product.quantity,
    displayValue: `${product.quantity} adet`,
  }));
  const customerBars = customerSummary.slice(0, 6).map((customer) => ({
    label: customer.customerName,
    meta: `${customer.receiptCount} fis`,
    value: customer.totalAmount,
    displayValue: money(customer.totalAmount, 'TRY'),
  }));
  const receivableTry = Number(stats.receivables?.try ?? 0);
  const payableTry = Number(stats.supplierPayables?.try ?? 0);
  const netCashPosition = receivableTry - payableTry;
  return (
    <section className="dashboard-pro stack">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Melisa Bebe Mini ERP</p>
          <h2>Rapor ve İstatistik Dashboard</h2>
          <p>Terminal satislari, stok riski ve sync durumunu tek ekranda izle.</p>
        </div>
        <div className="hero-status">
          <span>Son sync</span>
          <strong>{lastSyncLabel}</strong>
        </div>
      </div>
      <div className="kpi-grid">
        <KpiCard label="Bugünkü satış" value={summary.todaySalesCount} onClick={() => onNavigate('dailySalesReport')} />
        <KpiCard label="Bugünkü ciro" value={money(summary.todaySalesTotal, 'TRY')} strong onClick={() => onNavigate('dailySalesReport')} />
        <KpiCard label="Satılan adet" value={summary.todayItemQuantity} onClick={() => onNavigate('salesReceipts')} />
        <KpiCard label="Aktif müşteri" value={summary.activeCustomerCount} onClick={() => onNavigate('customerCards')} />
        <KpiCard label="Ürün sayısı" value={summary.productCount} onClick={() => onNavigate('stockCards')} />
        <KpiCard label="Düşük stok" value={summary.lowStockCount} alert={summary.lowStockCount > 0} onClick={() => onNavigate('lowStockReport')} />
        <KpiCard label="Bekleyen sync" value={summary.pendingSyncCount} alert={summary.pendingSyncCount > 0} onClick={() => onNavigate('terminalSync')} />
        <KpiCard label="Hatalı sync" value={summary.failedSyncCount} danger={summary.failedSyncCount > 0} onClick={() => onNavigate('failedSync')} />
      </div>
      <div className="summary-grid">
        <CurrencySummary title="Para birimi bazlı alacak" labels={['TL alacak', 'USD alacak', 'EUR alacak']} totals={stats.receivables} onClick={() => onNavigate('accountSummary')} />
        <CurrencySummary title="Para birimi bazlı tedarikçi borcu" labels={['TL borç', 'USD borç', 'EUR borç']} totals={stats.supplierPayables} onClick={() => onNavigate('supplierPayables')} />
      </div>
      <div className="dashboard-chart-grid">
        <section className="panel chart-panel chart-panel-wide dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('dailySalesReport')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('dailySalesReport'))}>
          <div className="panel-title-row">
            <h2>Son Gün Satış Trendi</h2>
            <span>{recentSales.length} fis</span>
          </div>
          <ColumnChart rows={salesTrend} empty="Trend için satis verisi yok." />
        </section>
        <section className="panel chart-panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('failedSync')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('failedSync'))}>
          <div className="panel-title-row">
            <h2>Sync Dagilimi</h2>
            <span>{summary.failedSyncCount > 0 ? 'Kontrol' : 'Normal'}</span>
          </div>
          <StatusStack
            rows={[
              { label: 'Bekleyen', value: summary.pendingSyncCount, tone: 'warning' },
              { label: 'Hatali', value: summary.failedSyncCount, tone: 'danger' },
              { label: 'Bugün satış', value: summary.todaySalesCount, tone: 'success' },
            ]}
          />
        </section>
        <section className="panel chart-panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('accountSummary')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('accountSummary'))}>
          <div className="panel-title-row">
            <h2>Nakit Pozisyonu</h2>
            <span>{netCashPosition >= 0 ? 'Pozitif' : 'Negatif'}</span>
          </div>
          <HorizontalBars
            rows={[
              { label: 'TL alacak', meta: 'Müşteri', value: receivableTry, displayValue: money(receivableTry, 'TRY') },
              { label: 'TL borc', meta: 'Tedarikçi', value: payableTry, displayValue: money(payableTry, 'TRY') },
              { label: 'Net', meta: 'Alacak - borc', value: Math.abs(netCashPosition), displayValue: money(netCashPosition, 'TRY') },
            ]}
            empty="Cari bakiye verisi yok."
          />
        </section>
        <section className="panel chart-panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('productSalesReport')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('productSalesReport'))}>
          <div className="panel-title-row">
            <h2>Ürün Performansi</h2>
            <span>Top 6</span>
          </div>
          <HorizontalBars rows={topProductBars} empty="Ürün satis verisi yok." />
        </section>
        <section className="panel chart-panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('customerSalesReport')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('customerSalesReport'))}>
          <div className="panel-title-row">
            <h2>Müşteri Hacmi</h2>
            <span>Top 6</span>
          </div>
          <HorizontalBars rows={customerBars} empty="Müşteri satis verisi yok." />
        </section>
      </div>
      <div className="report-layout">
        <section className="panel report-main dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('salesReceipts')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('salesReceipts'))}>
          <div className="panel-title-row">
            <h2>Son Fişler</h2>
            <span>Son 20</span>
          </div>
          <div className="table-wrap report-table">
            <table>
              <thead>
                <tr>
                  <th>Fiş No</th>
                  <th>Müşteri</th>
                  <th>Adet</th>
                  <th>Tutar</th>
                  <th>Terminal</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((row) => (
                  <tr key={`${row.receiptNo}-${row.createdAt}`}>
                    <td>{row.receiptNo}</td>
                    <td>{row.customerName}</td>
                    <td>{row.itemCount}</td>
                    <td>{money(row.totalAmount, row.currency)}</td>
                    <td>{row.sourceTerminal}</td>
                    <td>{dateLabel(row.createdAt)}</td>
                  </tr>
                ))}
                {recentSales.length === 0 ? <tr><td colSpan={6}>Satış fişi yok.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="right-rail">
          <section className="panel terminal-panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('terminalSync')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('terminalSync'))}>
            <h2>Terminal Durumu</h2>
            <div className="terminal-status-grid">
              <Info label="Son sync" value={lastSyncLabel} />
              <Info label="Bekleyen sync" value={summary.pendingSyncCount} />
              <Info label="Hatalı gönderim" value={summary.failedSyncCount} />
              <Info label="Düşük stok" value={summary.lowStockCount} />
            </div>
          </section>
          <section className="panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate(summary.failedSyncCount > 0 ? 'failedSync' : 'terminalSync')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate(summary.failedSyncCount > 0 ? 'failedSync' : 'terminalSync'))}>
            <div className="panel-title-row">
              <h2>Sync Uyarısı</h2>
              <span>{summary.failedSyncCount > 0 ? 'Kontrol' : 'OK'}</span>
            </div>
            <p className={summary.failedSyncCount > 0 ? 'notice' : 'empty-text'}>
              {summary.failedSyncCount > 0 ? `${summary.failedSyncCount} hatalı terminal gönderimi var.` : 'Hatalı terminal gönderimi yok.'}
            </p>
          </section>
        </aside>
      </div>
      <div className="report-bottom-grid">
        <section className="panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('productSalesReport')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('productSalesReport'))}>
          <div className="panel-title-row">
            <h2>En Çok Satan Ürünler</h2>
            <span>Top 10</span>
          </div>
          <MiniList
            empty="Satış ürünü yok."
            rows={topProducts.map((product) => ({
              title: product.productName,
              meta: product.productCode,
              value: `${product.quantity} adet / ${money(product.totalAmount, 'TRY')}`,
            }))}
          />
        </section>
        <section className="panel dashboard-clickable" role="button" tabIndex={0} onClick={() => onNavigate('customerSalesReport')} onKeyDown={(event) => activateOnEnter(event, () => onNavigate('customerSalesReport'))}>
          <div className="panel-title-row">
            <h2>En Aktif Müşteriler</h2>
            <span>Top 10</span>
          </div>
          <MiniList
            empty="Müşteri satışı yok."
            rows={customerSummary.map((customer) => ({
              title: customer.customerName,
              meta: `${customer.receiptCount} fiş / Son: ${customer.lastSaleAt ? dateLabel(customer.lastSaleAt) : '-'}`,
              value: money(customer.totalAmount, 'TRY'),
            }))}
          />
        </section>
      </div>
    </section>
  );
}

function KpiCard({ label, value, strong = false, alert = false, danger = false, onClick }: { label: string; value: string | number; strong?: boolean; alert?: boolean; danger?: boolean; onClick?: () => void }) {
  const className = `kpi-card ${strong ? 'strong' : ''} ${alert ? 'alert' : ''} ${danger ? 'danger-kpi' : ''} ${onClick ? 'dashboard-clickable' : ''}`;
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className}>
      {content}
    </div>
  );
}

function activateOnEnter(event: React.KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

type ChartRow = {
  label: string;
  meta?: string;
  value: number;
  displayValue?: string;
};

type StatusRow = {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger';
};

function buildDailySalesTrend(recentSales: RecentSaleReport[]): ChartRow[] {
  const dayMap = new Map<string, { label: string; value: number }>();
  for (const sale of recentSales) {
    const date = new Date(sale.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    const current = dayMap.get(key) ?? { label, value: 0 };
    current.value += Number(sale.totalTry ?? sale.totalAmount ?? 0);
    dayMap.set(key, current);
  }

  return Array.from(dayMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([, row]) => ({
      label: row.label,
      value: row.value,
      displayValue: money(row.value, 'TRY'),
    }));
}

function ColumnChart({ rows, empty }: { rows: ChartRow[]; empty: string }) {
  if (rows.length === 0) return <p className="empty-text">{empty}</p>;
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="column-chart">
      {rows.map((row) => {
        const height = Math.max(8, Math.round((row.value / maxValue) * 100));
        return (
          <div className="column-chart-item" key={row.label}>
            <div className="column-chart-track">
              <span style={{ height: `${height}%` }} title={row.displayValue ?? String(row.value)} />
            </div>
            <strong>{row.label}</strong>
            <em>{row.displayValue ?? compactNumber(row.value)}</em>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({ rows, empty }: { rows: ChartRow[]; empty: string }) {
  const visibleRows = rows.filter((row) => Number.isFinite(row.value) && row.value > 0);
  if (visibleRows.length === 0) return <p className="empty-text">{empty}</p>;
  const maxValue = Math.max(...visibleRows.map((row) => row.value), 1);

  return (
    <div className="horizontal-bars">
      {visibleRows.map((row) => {
        const width = Math.max(5, Math.round((row.value / maxValue) * 100));
        return (
          <div className="bar-row" key={`${row.label}-${row.meta ?? ''}`}>
            <div className="bar-row-label">
              <strong>{row.label}</strong>
              <span>{row.meta}</span>
            </div>
            <div className="bar-track" aria-hidden="true">
              <span style={{ width: `${width}%` }} />
            </div>
            <b>{row.displayValue ?? compactNumber(row.value)}</b>
          </div>
        );
      })}
    </div>
  );
}

function StatusStack({ rows }: { rows: StatusRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return <p className="empty-text">Aktif uyari yok.</p>;

  return (
    <div className="status-stack">
      <div className="status-stack-bar">
        {rows.filter((row) => row.value > 0).map((row) => (
          <span key={row.label} className={`status-${row.tone}`} style={{ width: `${Math.max(4, (row.value / total) * 100)}%` }} />
        ))}
      </div>
      <div className="status-stack-legend">
        {rows.map((row) => (
          <div key={row.label}>
            <span className={`legend-dot status-${row.tone}`} />
            <strong>{row.value}</strong>
            <em>{row.label}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, group, description }: { title: string; group: string; description: string }) {
  return (
    <section className="stack">
      <ModuleHeader title={title} subtitle={description} count="Yakında" />
      <section className="panel placeholder-panel">
        <span className="soon-badge">Hazırlanıyor</span>
        <h2>{title}</h2>
        <p>{group} menüsü altında açılacak bu ekran mevcut API yapısı bozulmadan sonraki fazda tamamlanacak.</p>
      </section>
    </section>
  );
}

function CsvImportPanel({ kind, title, role, onApplied }: { kind: ImportKind; title: string; role: UserRole; onApplied: () => Promise<void> }) {
  const [csv, setCsv] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>(() => kind === 'stock' ? 'stockAdjustment' : 'upsert');
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const sampleColumns = kind === 'products'
    ? ['stockCode', 'barcode', 'brand', 'typeName', 'currency']
    : kind === 'prices'
      ? ['stockCode', 'barcode', 'currency', 'purchasePrice', 'salePrice']
      : kind === 'stock'
        ? ['stockCode', 'barcode', 'quantity', 'mode', 'note']
    : ['name', 'phone', 'defaultCurrency', 'balanceTry', 'active'];

  const loadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage('');
    setPreview(null);
    if (/\.xlsx$/i.test(file.name)) {
      setCsv('');
      setFileBase64(await fileToBase64(file));
    } else {
      setFileBase64('');
      setCsv(await file.text());
    }
  };

  const downloadCsvTemplate = async () => {
    setMessage('');
    const template = await api.importTemplate(kind);
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${kind}-import-template.csv`);
  };

  const downloadXlsxTemplate = async () => {
    setMessage('');
    const blob = await api.importTemplateXlsx(kind);
    downloadBlob(blob, `${kind}-import-template.xlsx`);
  };

  const downloadErrorCsv = () => {
    if (!preview) return;
    const rows = preview.rows.filter((row) => row.error.length > 0 || row.warning.length > 0 || row.duplicate);
    const header = ['rowNumber', 'status', 'action', 'duplicate', 'messages', 'data'];
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push([
        row.rowNumber,
        row.status,
        row.action,
        row.duplicate ? 'true' : 'false',
        csvEscape([...row.error, ...row.warning, ...(row.duplicate ? ['duplicate'] : [])].join(' | ')),
        csvEscape(JSON.stringify(row.data)),
      ].join(','));
    }
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${kind}-import-errors.csv`);
  };

  const payload = () => ({ csv, fileBase64, fileName, mode, importJobId: preview?.importJobId });

  const hasFile = Boolean(csv || fileBase64);
  const canApply = hasPermission(role, importApplyPermission(kind));

  const downloadBlob = (blob: Blob, downloadName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runPreview = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await api.importPreview(kind, payload());
      setPreview(result);
      setMessage(`Preview hazir: ${result.summary.valid}/${result.summary.total} gecerli satir. Job #${result.importJobId ?? '-'}`);
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Preview başarısız.'));
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!preview || preview.summary.valid === 0) return;
    if (!canApply) {
      setMessage('Bu işlem için yetkiniz yok.');
      return;
    }
    if (!window.confirm(`${preview.summary.valid} gecerli satir islenecek. Devam edilsin mi?`)) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api.importApply(kind, payload());
      setPreview(result);
      await onApplied();
      setMessage(`Import tamamlandi: ${result.summary.created} oluşturuldu, ${result.summary.updated} guncellendi, ${result.summary.skipped} atlandi.`);
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Import başarısız.'));
    } finally {
      setLoading(false);
    }
  };

  const problemRows = preview?.rows.filter((row) => row.error.length > 0 || row.warning.length > 0 || row.duplicate) ?? [];
  const previewColumns: Array<{ label: string; render: (row: ImportPreviewRow) => React.ReactNode }> = [
    { label: 'Satir', render: (row) => row.rowNumber },
    { label: 'Durum', render: (row) => <ImportStatusBadge status={row.status} /> },
    { label: 'Islem', render: (row) => row.action },
    { label: 'Ana bilgi', render: (row) => importRowTitle(kind, row.data) },
    ...(kind === 'stock' ? [
      { label: 'Onceki stok', render: (row: ImportPreviewRow) => String(row.data.previousStock ?? '-') },
      { label: 'Yeni stok', render: (row: ImportPreviewRow) => String(row.data.newStock ?? '-') },
      { label: 'Fark', render: (row: ImportPreviewRow) => String(row.data.difference ?? '-') },
    ] : []),
    { label: 'Uyari', render: (row) => row.warning.join(' | ') || '-' },
    { label: 'Hata', render: (row) => row.error.join(' | ') || '-' },
  ];

  return (
    <section className="stack">
      <ModuleHeader title={title} subtitle="CSV veya Excel dosyasini once kontrol et, sonra gecerli satırları isle" count={preview?.summary.total ?? 0} />
      <div className="panel form-grid compact">
        <label>
          <span>Import modu</span>
          <select value={mode} onChange={(event) => { setMode(event.target.value as ImportMode); setPreview(null); }} disabled={kind === 'stock'}>
            {kind === 'stock' ? <option value="stockAdjustment">Stok sayim / duzeltme</option> : null}
            {kind !== 'stock' ? <option value="upsert">Upsert - varsa guncelle, yoksa oluştur</option> : null}
            {kind !== 'stock' ? <option value="createOnly">Sadece yeni kayit</option> : null}
            {kind !== 'stock' ? <option value="updateOnly">Sadece guncelle</option> : null}
          </select>
        </label>
        <label>
          <span>CSV / Excel dosyasi</span>
          <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={loadFile} />
        </label>
        <button type="button" className="ghost" onClick={downloadCsvTemplate}>CSV indir</button>
        <button type="button" className="ghost" onClick={downloadXlsxTemplate}>Excel indir</button>
        <button type="button" className="primary" onClick={runPreview} disabled={!hasFile || loading}>{loading ? 'Kontrol ediliyor' : 'Preview'}</button>
        {canApply ? <button type="button" className="primary" onClick={apply} disabled={!preview || preview.summary.valid === 0 || loading}>Gecerli satırları isle</button> : null}
        <button type="button" className="ghost" onClick={downloadErrorCsv} disabled={!preview || problemRows.length === 0}>Hata CSV indir</button>
      </div>
      <section className="panel">
        <div className="panel-title-row">
          <h2>Dosya</h2>
          <span>{fileName || 'Dosya secilmedi'}</span>
        </div>
        <p className="muted-text">Beklenen kolonlar: {sampleColumns.join(', ')}. Barkod ve stok kodu metin olarak islenir; Excel sayi/bilimsel gosterim uyarilari preview'da görünur.</p>
        {!canApply ? <p className="message">Bu işlem için yetkiniz yok.</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </section>
      {preview ? (
        <>
          <div className="kpi-grid analytics-kpis">
            <KpiCard label="Toplam" value={preview.summary.total} />
            <KpiCard label="Gecerli" value={preview.summary.valid} strong />
            <KpiCard label="Olusturulacak" value={preview.summary.created} />
            <KpiCard label="Güncellenecek" value={preview.summary.updated} />
            <KpiCard label="Duplicate" value={preview.summary.duplicate} alert={preview.summary.duplicate > 0} />
            <KpiCard label="Hatali" value={preview.summary.error} danger={preview.summary.error > 0} />
            <KpiCard label="Atlanan" value={preview.summary.skipped} />
          </div>
          <DataTable
            title="Preview Tablosu"
            rows={preview.rows}
            columns={previewColumns}
          />
          <DataTable
            title="Hata / Uyari Listesi"
            rows={problemRows}
            columns={[
              { label: 'Satir', render: (row) => row.rowNumber },
              { label: 'Durum', render: (row) => <ImportStatusBadge status={row.status} /> },
              { label: 'Mesaj', render: (row) => [...row.error, ...row.warning, ...(row.duplicate ? ['duplicate'] : [])].join(' | ') || '-' },
            ]}
          />
        </>
      ) : null}
    </section>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const className = status === 'error' ? 'badge-cancel' : status === 'duplicate' || status === 'warning' ? 'badge-sale' : 'badge-purchase';
  return <span className={`badge ${className}`}>{status}</span>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function ImportHistoryPanel({ jobs, onRefresh }: { jobs: ImportJob[]; onRefresh: () => Promise<void> }) {
  const [selected, setSelected] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const openDetail = async (id: number) => {
    setLoading(true);
    setMessage('');
    try {
      setSelected(await api.importJob(id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import detayı alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const downloadErrors = async (id: number) => {
    setMessage('');
    try {
      const csv = await api.importJobErrorsCsv(id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `import-job-${id}-errors.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Hata CSV indirilemedi.');
    }
  };

  return (
    <section className="stack">
      <ModuleHeader title="Import Geçmişi" subtitle="Toplu import preview, apply ve hata satırı denetim kayitlari" count={jobs.length} />
      <section className="panel">
        <div className="panel-title-row">
          <h2>Import Kayıtlari</h2>
          <button type="button" className="ghost" onClick={onRefresh}>Yenile</button>
        </div>
        {message ? <p className="message">{message}</p> : null}
      </section>
      <DataTable
        title="Import Listesi"
        rows={jobs}
        columns={[
          { label: 'Tarih', render: (job) => dateLabel(job.createdAt) },
          { label: 'Tip', render: (job) => job.kind },
          { label: 'Dosya', render: (job) => job.fileName || '-' },
          { label: 'Durum', render: (job) => <span className={`badge ${job.status === 'FAILED' ? 'badge-cancel' : job.status === 'APPLIED' ? 'badge-purchase' : 'badge-sale'}`}>{job.status}</span> },
          { label: 'Toplam', render: (job) => job.totalRows },
          { label: 'Basarili', render: (job) => job.createdCount + job.updatedCount || job.validRows },
          { label: 'Hatali', render: (job) => job.errorRows },
          { label: 'Duplicate', render: (job) => job.duplicateRows },
          { label: 'Uygulayan', render: (job) => job.appliedUser?.name ?? job.appliedBy ?? '-' },
          {
            label: 'Islem',
            render: (job) => (
              <div className="row-actions">
                <button type="button" className="ghost" onClick={() => void openDetail(job.id)}>{loading ? 'Aciliyor' : 'Detay'}</button>
                <button type="button" className="ghost" onClick={() => void downloadErrors(job.id)} disabled={job.errorRows + job.warningRows + job.duplicateRows === 0}>Hata CSV</button>
              </div>
            ),
          },
        ]}
      />
      {selected ? (
        <>
          <div className="kpi-grid analytics-kpis">
            <KpiCard label="Toplam" value={selected.totalRows} />
            <KpiCard label="Gecerli" value={selected.validRows} strong />
            <KpiCard label="Olusturulan" value={selected.createdCount} />
            <KpiCard label="Güncellenen" value={selected.updatedCount} />
            <KpiCard label="Duplicate" value={selected.duplicateRows} alert={selected.duplicateRows > 0} />
            <KpiCard label="Hatali" value={selected.errorRows} danger={selected.errorRows > 0} />
          </div>
          <DataTable
            title={`Import #${selected.id} Satir Detayı`}
            rows={selected.rows ?? []}
            columns={[
              { label: 'Satir', render: (row) => row.rowNumber },
              { label: 'Durum', render: (row) => <ImportStatusBadge status={row.status} /> },
              { label: 'Islem', render: (row) => row.action },
              { label: 'Entity', render: (row) => row.entityId ?? '-' },
              { label: 'Hata', render: (row) => Array.isArray(row.errorJson) ? row.errorJson.join(' | ') || '-' : '-' },
              { label: 'Uyari', render: (row) => Array.isArray(row.warningJson) ? row.warningJson.join(' | ') || '-' : '-' },
              { label: 'Ham satir', render: (row) => JSON.stringify(row.rawJson ?? {}) },
            ]}
          />
        </>
      ) : null}
    </section>
  );
}

function importRowTitle(kind: ImportKind, data: Record<string, unknown>) {
  if (kind === 'products') return `${data.stockCode ?? '-'} / ${data.barcode ?? '-'} / ${data.brand ?? '-'} ${data.typeName ?? ''}`;
  if (kind === 'prices') return `${data.stockCode ?? '-'} / ${data.barcode ?? '-'} / ${data.currency ?? '-'} / Alış: ${data.purchasePrice ?? data.buyPriceTry ?? '-'} / Satış: ${data.salePrice ?? data.sellPriceTry ?? '-'}`;
  if (kind === 'stock') return `${data.stockCode ?? '-'} / ${data.barcode ?? '-'} / ${data.mode ?? '-'} / Miktar: ${data.quantity ?? '-'}`;
  return `${data.name ?? '-'} / ${data.phone ?? '-'} / ${data.defaultCurrency ?? 'TRY'}`;
}

function PendingSyncReceiptsPanel({ receipts, logs }: { receipts: SalesReceipt[]; logs: TerminalSyncLog[] }) {
  const pendingReceipts = receipts.filter((receipt) => !receipt.synced || receipt.cancelled || receipt.status === 'CANCELLED');
  const failedLogs = logs.filter((log) => String(log.status).toUpperCase() === 'FAILED');
  return (
    <section className="stack">
      <ModuleHeader title="Bekleyen/Hatalı Sync Fişleri" subtitle="Terminalden gelen bekleyen veya hatalı satış fişleri" count={pendingReceipts.length + failedLogs.length} />
      <div className="receipt-summary-strip">
        <Info label="Bekleyen fiş" value={pendingReceipts.filter((receipt) => !receipt.synced).length} />
        <Info label="Hatalı log" value={failedLogs.length} />
        <Info label="İptal fiş" value={pendingReceipts.filter((receipt) => receipt.cancelled || receipt.status === 'CANCELLED').length} />
        <Info label="Toplam kayıt" value={pendingReceipts.length + failedLogs.length} />
      </div>
      <DataTable
        title="Bekleyen Fişler"
        rows={pendingReceipts}
        columns={[
          { label: 'Fiş No', render: (row) => row.documentNo },
          { label: 'Müşteri', render: (row) => row.customer?.name ?? '-' },
          { label: 'Terminal', render: (row) => row.terminalId ?? '-' },
          { label: 'Local UUID', render: (row) => row.localUuid ?? '-' },
          { label: 'Toplam', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Durum', render: (row) => row.synced ? receiptStatusLabel(row) : 'Sync bekliyor' },
        ]}
      />
    </section>
  );
}

function BarcodeListPanel({ cards }: { cards: StockCard[] }) {
  return (
    <section className="stack">
      <ModuleHeader title="Barkod Listesi" subtitle="Stok kartlarından barkod, stok kodu ve ürün eşleştirme listesi" count={cards.length} />
      <DataTable
        title="Barkod Listesi"
        rows={cards}
        columns={[
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Stok kodu', render: (row) => row.stockCode },
          { label: 'Ürün', render: (row) => row.productName },
          { label: 'Marka', render: (row) => row.brand },
          { label: 'Stok', render: (row) => row.quantity },
        ]}
      />
    </section>
  );
}

function LowStockReportPanel({ cards }: { cards: StockCard[] }) {
  const lowCards = cards.filter((card) => card.lowStock);
  return (
    <section className="stack">
      <ModuleHeader title="Düşük Stok Raporu" subtitle="Düşük stok uyarısı veren ürünler" count={lowCards.length} />
      <DataTable
        title="Düşük Stok"
        rows={lowCards}
        columns={[
          { label: 'Stok kodu', render: (row) => row.stockCode },
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Ürün', render: (row) => row.productName },
          { label: 'Stok', render: (row) => <span className="badge badge-cancel">{row.quantity}</span> },
          { label: 'Fiyat', render: (row) => money(row.sellPriceTry, 'TRY') },
        ]}
      />
    </section>
  );
}

function DailySalesReportPanel({ analytics, recentSales }: { analytics: SalesAnalytics; recentSales: RecentSaleReport[] }) {
  return (
    <section className="stack">
      <ModuleHeader title="Günlük Satış Raporu" subtitle="Bugünkü satış özeti ve son fişler" count={analytics.dailySales.receiptCount} />
      <div className="analytics-kpis">
        <KpiCard label="Bugünkü fiş" value={analytics.dailySales.receiptCount} />
        <KpiCard label="Bugünkü ciro" value={money(analytics.dailySales.totalAmount, 'TRY')} strong />
        <KpiCard label="Haftalık fiş" value={analytics.weeklySales.receiptCount} />
        <KpiCard label="Haftalık ciro" value={money(analytics.weeklySales.totalAmount, 'TRY')} />
      </div>
      <DataTable
        title="Son Fişler"
        rows={recentSales}
        columns={[
          { label: 'Fiş No', render: (row) => row.receiptNo },
          { label: 'Müşteri', render: (row) => row.customerName },
          { label: 'Adet', render: (row) => row.itemCount },
          { label: 'Tutar', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Terminal', render: (row) => row.sourceTerminal },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
        ]}
      />
    </section>
  );
}

function ProductSalesReportPanel({ topProducts }: { topProducts: TopProductReport[] }) {
  return (
    <section className="stack">
      <ModuleHeader title="Ürün Satış Raporu" subtitle="En çok satılan ürünler" count={topProducts.length} />
      <DataTable
        title="Ürün Satışları"
        rows={topProducts}
        columns={[
          { label: 'Stok kodu', render: (row) => row.productCode },
          { label: 'Ürün', render: (row) => row.productName },
          { label: 'Adet', render: (row) => row.quantity },
          { label: 'Toplam', render: (row) => money(row.totalAmount, 'TRY') },
        ]}
      />
    </section>
  );
}

function CustomerSalesSummaryPanel({ customerSummary }: { customerSummary: CustomerSummaryReport[] }) {
  return (
    <section className="stack">
      <ModuleHeader title="Müşteri Satış Özeti" subtitle="En aktif müşteriler ve satış toplamları" count={customerSummary.length} />
      <DataTable
        title="Müşteri Satışları"
        rows={customerSummary}
        columns={[
          { label: 'Müşteri', render: (row) => row.customerName },
          { label: 'Fiş sayısı', render: (row) => row.receiptCount },
          { label: 'Toplam', render: (row) => money(row.totalAmount, 'TRY') },
          { label: 'Son satış', render: (row) => row.lastSaleAt ? dateLabel(row.lastSaleAt) : '-' },
        ]}
      />
    </section>
  );
}

function FailedSyncPanel({ logs }: { logs: TerminalSyncLog[] }) {
  const failedLogs = logs.filter((log) => String(log.status).toUpperCase() === 'FAILED');
  return (
    <section className="stack">
      <ModuleHeader title="Hatalı Gönderimler" subtitle="Terminal sync sırasında hata alan kayıtlar" count={failedLogs.length} />
      <DataTable
        title="Hatalı Sync Logları"
        rows={failedLogs}
        columns={[
          { label: 'Terminal', render: (row) => row.terminalId ?? '-' },
          { label: 'Local UUID', render: (row) => row.localUuid ?? '-' },
          { label: 'Durum', render: (row) => row.status },
          { label: 'Hata', render: (row) => row.lastError ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
        ]}
      />
    </section>
  );
}

function SalesReceiptsPanel({ receipts }: { receipts: SalesReceipt[] }) {
  const [selected, setSelected] = useState<SalesReceipt | null>(null);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState<'ALL' | Currency>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED' | 'SYNCED' | 'UNSYNCED'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const normalizedSearch = normalize(search);
  const filtered = receipts.filter((receipt) => {
    const receiptDate = new Date(receipt.createdAt);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const isCancelled = receipt.cancelled || receipt.status === 'CANCELLED';
    const matchesSearch = !normalizedSearch || [
      receipt.documentNo,
      receipt.customer?.name,
      receipt.customer?.phone,
      receipt.terminalId,
      receipt.localUuid,
    ].some((value) => normalize(value).includes(normalizedSearch));
    const matchesCurrency = currency === 'ALL' || documentCurrencyOf(receipt) === currency;
    const matchesStatus =
      statusFilter === 'ALL'
      || (statusFilter === 'ACTIVE' && !isCancelled)
      || (statusFilter === 'CANCELLED' && isCancelled)
      || (statusFilter === 'SYNCED' && receipt.synced)
      || (statusFilter === 'UNSYNCED' && !receipt.synced);
    const matchesDate = (!fromDate || receiptDate >= fromDate) && (!toDate || receiptDate <= toDate);
    return matchesSearch && matchesCurrency && matchesStatus && matchesDate;
  });
  const visible = filtered.slice(0, 300);
  const filteredTotal = visible.reduce((sum, receipt) => sum + Number(totalTryOf(receipt)), 0);
  const syncedCount = visible.filter((receipt) => receipt.synced).length;
  const cancelledCount = visible.filter((receipt) => receipt.cancelled || receipt.status === 'CANCELLED').length;
  return (
    <section className="stack sales-receipts-screen">
      <ModuleHeader title="Satış Fişleri" subtitle="Fiş listesi, müşteri bilgisi ve ürün satırları" count={visible.length} />
      <section className="panel receipt-filter-panel">
        <div className="panel-title-row">
          <div>
            <h2>Fiş Arama</h2>
            <p>Wolvox tarzı hızlı fiş listesi: filtrele, fişi seç, detayı aç.</p>
          </div>
          <span>{visible.length} / {receipts.length} fiş</span>
        </div>
        <div className="receipt-filter-grid">
          <Field label="Fiş / müşteri / terminal ara" value={search} onChange={setSearch} required={false} />
          <label>
            <span>Başlangıç</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            <span>Para birimi</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as 'ALL' | Currency)}>
              <option value="ALL">Tümü</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            <span>Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="ALL">Tümü</option>
              <option value="ACTIVE">Aktif</option>
              <option value="CANCELLED">İptal</option>
              <option value="SYNCED">Sync edildi</option>
              <option value="UNSYNCED">Sync bekliyor</option>
            </select>
          </label>
          <button type="button" className="ghost" onClick={() => { setSearch(''); setCurrency('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}>
            Filtre Temizle
          </button>
        </div>
      </section>
      <div className="receipt-summary-strip">
        <Info label="Listelenen fiş" value={visible.length} />
        <Info label="Listelenen toplam" value={money(filteredTotal, 'TRY')} />
        <Info label="Sync edilen" value={syncedCount} />
        <Info label="İptal fiş" value={cancelledCount} />
      </div>
      <section className="panel receipt-list-panel">
        <div className="panel-title-row">
          <div>
            <h2>Fiş Listesi</h2>
            <p>Detay butonu fiş üst bilgisi, ürün satırları, toplamlar ve sync bilgisini açar.</p>
          </div>
          <span>Son {visible.length} kayıt</span>
        </div>
        <DataTable
          title="Satış Fişleri"
          rows={visible}
          columns={[
            { label: 'Fiş No', render: (row) => row.documentNo },
            { label: 'Müşteri', render: (row) => row.customer?.name ?? '-' },
            { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
            { label: 'Belge Para Birimi', render: (row) => <CurrencyBadge value={documentCurrencyOf(row)} /> },
            { label: 'Belge Toplam', render: (row) => money(originalTotalOf(row), documentCurrencyOf(row)) },
            { label: 'TRY Karşılığı', render: (row) => money(totalTryOf(row), 'TRY') },
            { label: 'Sync', render: (row) => <span className={`badge ${row.synced ? 'badge-purchase' : 'badge-cancel'}`}>{row.synced ? 'Gönderildi' : 'Bekliyor'}</span> },
            { label: 'Terminal', render: (row) => row.terminalId ?? 'Web Admin' },
            { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => setSelected(row)}>Detay</button> },
          ]}
        />
      </section>
      {selected ? <SalesReceiptDetail receipt={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function SalesReceiptDetail({ receipt, onClose }: { receipt: SalesReceipt; onClose: () => void }) {
  const totalQuantity = (receipt.items ?? []).reduce((sum, item) => sum + Number(item.quantity), 0);
  const documentCurrency = documentCurrencyOf(receipt);
  const total = Number(originalTotalOf(receipt));
  const subtotal = total / 1.2;
  const vat = total - subtotal;
  const isCancelled = receipt.cancelled || receipt.status === 'CANCELLED';
  return (
    <section className="panel detail-panel erp-detail receipt-detail-panel">
      <div className="panel-title-row receipt-detail-head">
        <div>
          <h2>{receipt.documentNo}</h2>
          <p>{receipt.customer?.name ?? '-'} / {dateLabel(receipt.createdAt)}</p>
        </div>
        <button type="button" className="ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="receipt-detail-section">
        <div className="section-caption">Fiş Bilgileri</div>
        <div className="detail-grid receipt-info-grid">
          <Info label="Müşteri" value={receipt.customer?.name ?? '-'} />
          <Info label="Fiş No" value={receipt.documentNo} />
          <Info label="Tarih" value={dateLabel(receipt.createdAt)} />
          <Info label="Belge Para Birimi" value={<CurrencyBadge value={documentCurrency} />} />
          <Info label="Belge Toplam" value={money(originalTotalOf(receipt), documentCurrency)} />
          <Info label="TRY Karşılığı" value={money(totalTryOf(receipt), 'TRY')} />
          <Info label="Durum" value={isCancelled ? 'İptal' : 'Aktif'} />
          <Info label="Terminal" value={receipt.terminalId ?? 'Web Admin'} />
        </div>
      </div>
      <div className="receipt-detail-section">
        <div className="section-caption">Ürün Satırları</div>
        <DataTable
          title="Ürün Satırları"
          rows={receipt.items ?? []}
          columns={[
            { label: 'Barkod', render: (row) => row.product?.barcode ?? '-' },
            { label: 'Stok kodu', render: (row) => row.product?.stockCode ?? '-' },
            { label: 'Ürün', render: (row) => row.product ? `${row.product.brand} ${row.product.typeName}` : '-' },
            { label: 'Adet', render: (row) => row.quantity },
            { label: 'Satır para', render: (row) => <CurrencyBadge value={row.lineCurrency ?? documentCurrency} /> },
            { label: 'Birim fiyat', render: (row) => money(row.unitPriceOriginal ?? row.unitPrice, row.lineCurrency ?? documentCurrency) },
            { label: 'Satır toplam', render: (row) => money(row.lineTotalOriginal ?? row.lineTotal, row.lineCurrency ?? documentCurrency) },
            { label: 'TRY karşılığı', render: (row) => money(row.lineTotalTry ?? row.lineTotal, 'TRY') },
          ]}
        />
      </div>
      <div className="receipt-detail-bottom">
        <section>
          <div className="section-caption">Toplamlar</div>
          <div className="detail-grid receipt-total-grid">
            <Info label="Toplam adet" value={totalQuantity} />
            <Info label="Ara toplam" value={money(subtotal, documentCurrency)} />
            <Info label="KDV" value={money(vat, documentCurrency)} />
            <Info label="Genel toplam" value={money(total, documentCurrency)} />
            <Info label="TRY Karşılığı" value={money(totalTryOf(receipt), 'TRY')} />
          </div>
        </section>
        <section>
          <div className="section-caption">Sync Bilgisi</div>
          <div className="detail-grid receipt-sync-grid">
            <Info label="Sync durumu" value={receipt.synced ? 'Gönderildi' : 'Bekliyor'} />
            <Info label="Terminal ID" value={receipt.terminalId ?? '-'} />
            <Info label="Local UUID" value={receipt.localUuid ?? '-'} />
            <Info label="İptal nedeni" value={receipt.cancelReason ?? '-'} />
          </div>
        </section>
      </div>
    </section>
  );
}

function LegacySalesReceiptsPanel({ receipts }: { receipts: SalesReceipt[] }) {
  const [selected, setSelected] = useState<SalesReceipt | null>(null);
  const visible = receipts.slice(0, 200);
  return (
    <section className="stack">
      <ModuleHeader title="Satış Fişleri" subtitle="Fiş listesi, müşteri bilgisi ve ürün satırları" count={visible.length} />
      <DataTable
        title="Satış Fişleri"
        rows={visible}
        columns={[
          { label: 'Fiş No', render: (row) => row.documentNo },
          { label: 'Müşteri', render: (row) => row.customer?.name ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Para Birimi', render: (row) => row.currency ?? 'TRY' },
          { label: 'Toplam', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Terminal', render: (row) => row.terminalId ?? 'Web Admin' },
          { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => setSelected(row)}>Aç</button> },
        ]}
      />
      {selected ? <SalesReceiptDetail receipt={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function LegacySalesReceiptDetail({ receipt, onClose }: { receipt: SalesReceipt; onClose: () => void }) {
  const totalQuantity = (receipt.items ?? []).reduce((sum, item) => sum + Number(item.quantity), 0);
  const total = Number(receipt.totalAmount);
  const subtotal = total / 1.2;
  const vat = total - subtotal;
  return (
    <section className="panel detail-panel erp-detail">
      <div className="panel-title-row">
        <div>
          <h2>{receipt.documentNo}</h2>
          <p>{receipt.customer?.name ?? '-'} / {dateLabel(receipt.createdAt)}</p>
        </div>
        <button type="button" className="ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="detail-grid">
        <Info label="Müşteri" value={receipt.customer?.name ?? '-'} />
        <Info label="Para birimi" value={receipt.currency ?? 'TRY'} />
        <Info label="Toplam adet" value={totalQuantity} />
        <Info label="Genel toplam" value={money(total, receipt.currency)} />
        <Info label="Ara toplam" value={money(subtotal, receipt.currency)} />
        <Info label="KDV" value={money(vat, receipt.currency)} />
      </div>
      <DataTable
        title="Ürün Satırları"
        rows={receipt.items ?? []}
        columns={[
          { label: 'Stok kodu', render: (row) => row.product?.stockCode ?? row.product?.barcode ?? '-' },
          { label: 'Ürün', render: (row) => row.product ? `${row.product.brand} ${row.product.typeName}` : '-' },
          { label: 'Adet', render: (row) => row.quantity },
          { label: 'Birim fiyat', render: (row) => money(row.unitPrice, receipt.currency) },
          { label: 'Satır toplam', render: (row) => money(row.lineTotal, receipt.currency) },
        ]}
      />
    </section>
  );
}


function StockCardsPanel({ cards, products, movements, role, onSaved }: { cards: StockCard[]; products: Product[]; movements: StockMovement[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [selected, setSelected] = useState<StockCard | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const canEdit = hasPermission(role, 'priceUpdate') || hasPermission(role, 'stockAdjust') || role === 'ADMIN';
  const normalized = normalize(search);
  const filtered = cards.filter((card) => {
    const matchesSearch = !normalized || [card.stockCode, card.barcode, card.productName, card.brand].some((value) => normalize(value).includes(normalized));
    return matchesSearch && (!lowOnly || card.lowStock);
  });
  const productForCard = (card: StockCard) => products.find((product) => product.id === card.id || product.stockCode === card.stockCode || product.barcode === card.barcode) ?? null;
  const selectedMovements = selected ? movements.filter((movement) => movement.productId === selected.id).slice(0, 20) : [];
  const editCard = (card: StockCard) => {
    const product = productForCard(card);
    if (product) setEditingProduct(product);
  };

  return (
    <section className="stack">
      <ModuleHeader title="Stok Kartları" subtitle="Barkod, stok kodu, ürün adı, stok ve fiyat takibi" count={filtered.length} />
      <div className="panel filter-panel erp-filter">
        <Field label="Ürün ara" value={search} onChange={setSearch} required={false} />
        <label className="check-field"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /> Düşük stok</label>
      </div>
      <DataTable
        title="Stok Kartları"
        rows={filtered}
        columns={[
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Stok kodu', render: (row) => row.stockCode },
          { label: 'Ürün adı', render: (row) => row.productName },
          { label: 'Marka', render: (row) => row.brand },
          { label: 'Stok', render: (row) => <span className={row.lowStock ? 'badge badge-cancel' : 'badge'}>{row.quantity}</span> },
          { label: 'Fiyat', render: (row) => money(row.sellPriceTry ?? row.sellPrice, 'TRY') },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'İşlem', render: (row) => <ActionButtons onDetail={() => setSelected(row)} onEdit={canEdit && productForCard(row) ? () => editCard(row) : undefined} /> },
        ]}
      />
      {selected ? <StockCardDetail card={selected} movements={selectedMovements} product={productForCard(selected)} canEdit={canEdit} onEdit={() => editCard(selected)} onClose={() => setSelected(null)} /> : null}
      {editingProduct ? <ProductModal product={editingProduct} onSaved={onSaved} onDone={() => setEditingProduct(null)} /> : null}
    </section>
  );
}

function StockCardDetail({ card, movements, product, canEdit, onEdit, onClose }: { card: StockCard; movements: StockMovement[]; product: Product | null; canEdit: boolean; onEdit: () => void; onClose: () => void }) {
  return (
    <section className="panel detail-panel card-detail-panel">
      <div className="panel-title-row">
        <div>
          <h2>{card.productName}</h2>
          <p>{card.stockCode} / {card.barcode}</p>
        </div>
        <div className="action-buttons">
          {canEdit && product ? <button type="button" className="primary" onClick={onEdit}>Düzenle</button> : null}
          <button type="button" className="ghost" onClick={onClose}>Kapat</button>
        </div>
      </div>
      <div className="detail-grid">
        <Info label="Stok kodu" value={card.stockCode} />
        <Info label="Barkod" value={card.barcode} />
        <Info label="Marka" value={card.brand} />
        <Info label="Çeşit" value={card.typeName} />
        <Info label="Mevcut stok" value={card.quantity} />
        <Info label="Satış fiyatı" value={money(card.sellPriceTry ?? card.sellPrice, 'TRY')} />
        <Info label="Durum" value={card.active ? 'Aktif' : 'Pasif'} />
        <Info label="Son güncelleme" value={dateLabel(card.updatedAt)} />
      </div>
      <DataTable
        title="İşlem Ayrıntıları"
        rows={movements}
        columns={[
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Hareket', render: (row) => row.movementType },
          { label: 'Miktar', render: (row) => row.quantity },
          { label: 'Kaynak', render: (row) => row.sourceDocumentType },
          { label: 'Belge', render: (row) => row.documentNo ?? '#' + row.sourceDocumentId },
          { label: 'Stok sonrası', render: (row) => row.stockAfter ?? '-' },
          { label: 'Not', render: (row) => row.note ?? '-' },
        ]}
      />
    </section>
  );
}

function CustomerCardsPanel({ cards, customers, movements, role, onSaved }: { cards: CustomerCard[]; customers: Customer[]; movements: CurrentAccountMovement[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerCard | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const canEdit = hasPermission(role, 'partyManage') || role === 'ADMIN';
  const normalized = normalize(search);
  const filtered = cards.filter((card) => !normalized || [card.customerCode, card.name, card.city].some((value) => normalize(value).includes(normalized)));
  const customerForCard = (card: CustomerCard) => customers.find((customer) => customer.id === card.id || customer.name === card.name) ?? null;
  const selectedMovements = selected ? movements.filter((movement) => movement.partyType === 'CUSTOMER' && (movement.customerId === selected.id || movement.partyId === selected.id || movement.partyName === selected.name)).slice(0, 20) : [];
  const editCard = (card: CustomerCard) => {
    const customer = customerForCard(card);
    if (customer) setEditingCustomer(customer);
  };

  return (
    <section className="stack">
      <ModuleHeader title="Müşteri Kartları" subtitle="Müşteri satış özeti ve son hareket bilgisi" count={filtered.length} />
      <div className="panel filter-panel erp-filter">
        <Field label="Müşteri ara" value={search} onChange={setSearch} required={false} />
      </div>
      <DataTable
        title="Müşteri Kartları"
        rows={filtered}
        columns={[
          { label: 'Müşteri kodu', render: (row) => row.customerCode },
          { label: 'Ad', render: (row) => row.name },
          { label: 'Şehir', render: (row) => row.city },
          { label: 'Para birimi', render: (row) => row.currency },
          { label: 'Toplam fiş', render: (row) => row.receiptCount },
          { label: 'Toplam satış', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Son satış', render: (row) => row.lastSaleAt ? dateLabel(row.lastSaleAt) : '-' },
          { label: 'İşlem', render: (row) => <ActionButtons onDetail={() => setSelected(row)} onEdit={canEdit && customerForCard(row) ? () => editCard(row) : undefined} /> },
        ]}
      />
      {selected ? <CustomerCardDetail card={selected} customer={customerForCard(selected)} movements={selectedMovements} canEdit={canEdit} onEdit={() => editCard(selected)} onClose={() => setSelected(null)} /> : null}
      {editingCustomer ? <PartyModal title="Müşteri Düzenle" party={editingCustomer} type="customer" onSaved={onSaved} onDone={() => setEditingCustomer(null)} /> : null}
    </section>
  );
}

function CustomerCardDetail({ card, customer, movements, canEdit, onEdit, onClose }: { card: CustomerCard; customer: Customer | null; movements: CurrentAccountMovement[]; canEdit: boolean; onEdit: () => void; onClose: () => void }) {
  const debitTotal = movements.filter((row) => row.direction === 'DEBIT').reduce((sum, row) => sum + Number(row.amountTry ?? row.amount ?? 0), 0);
  const creditTotal = movements.filter((row) => row.direction === 'CREDIT').reduce((sum, row) => sum + Number(row.amountTry ?? row.amount ?? 0), 0);
  return (
    <section className="panel detail-panel card-detail-panel">
      <div className="panel-title-row">
        <div>
          <h2>{card.name}</h2>
          <p>{card.customerCode} / {card.city || 'Şehir yok'}</p>
        </div>
        <div className="action-buttons">
          {canEdit && customer ? <button type="button" className="primary" onClick={onEdit}>Düzenle</button> : null}
          <button type="button" className="ghost" onClick={onClose}>Kapat</button>
        </div>
      </div>
      <div className="detail-grid">
        <Info label="Müşteri kodu" value={card.customerCode} />
        <Info label="Para birimi" value={card.currency} />
        <Info label="Toplam fiş" value={card.receiptCount} />
        <Info label="Toplam satış" value={money(card.totalAmount, card.currency)} />
        <Info label="Son satış" value={card.lastSaleAt ? dateLabel(card.lastSaleAt) : '-'} />
        <Info label="Durum" value={card.active ? 'Aktif' : 'Pasif'} />
        <Info label="Borç TRY" value={money(debitTotal, 'TRY')} />
        <Info label="Alacak TRY" value={money(creditTotal, 'TRY')} />
      </div>
      <DataTable
        title="İşlem Ayrıntıları"
        rows={movements}
        columns={[
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Belge', render: (row) => row.documentNo },
          { label: 'Tip', render: (row) => row.documentType },
          { label: 'Yön', render: (row) => row.direction },
          { label: 'Tutar', render: (row) => money(row.documentAmount ?? row.amount, row.documentCurrency ?? row.currency) },
          { label: 'Açıklama', render: (row) => row.description ?? '-' },
        ]}
      />
    </section>
  );
}

function TerminalSyncPanel({ logs, summary }: { logs: TerminalSyncLog[]; summary: TerminalSyncSummary }) {
  const [selected, setSelected] = useState<TerminalSyncLog | null>(null);
  return (
    <section className="stack">
      <ModuleHeader title="Terminal Sync" subtitle="Android terminal gönderim kayıtları" count={logs.length} />
      <div className="kpi-grid sync-kpis">
        <KpiCard label="Toplam" value={summary.total} />
        <KpiCard label="Synced" value={summary.synced} />
        <KpiCard label="Pending" value={summary.pending} alert={summary.pending > 0} />
        <KpiCard label="Failed" value={summary.failed} danger={summary.failed > 0} />
      </div>
      <DataTable
        title="Terminal Sync Logları"
        rows={logs}
        columns={[
          { label: 'Terminal', render: (row) => row.terminalId },
          { label: 'Local UUID', render: (row) => row.localUuid },
          { label: 'Durum', render: (row) => <span className={row.status === 'FAILED' ? 'badge badge-cancel' : row.status === 'SYNCED' ? 'badge badge-purchase' : 'badge'}>{row.status}</span> },
          { label: 'Hata', render: (row) => row.lastError ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => setSelected(row)}>Detay</button> },
        ]}
      />
      {selected ? (
        <section className="panel detail-panel">
          <div className="panel-title-row"><h2>Sync Detayı</h2><button className="ghost" onClick={() => setSelected(null)}>Kapat</button></div>
          <pre className="json-preview">{JSON.stringify(selected, null, 2)}</pre>
        </section>
      ) : null}
    </section>
  );
}

function StockMovementReportPanel({ movements, products, onLoad }: { movements: StockMovementReport[]; products: StockCard[]; onLoad: (query: string) => Promise<void> }) {
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const applyFilter = async () => {
    const query = new URLSearchParams();
    if (productId) query.set('productId', productId);
    if (dateFrom) query.set('dateFrom', new Date(dateFrom).toISOString());
    if (dateTo) query.set('dateTo', new Date(dateTo).toISOString());
    await onLoad(query.toString() ? `?${query.toString()}` : '');
  };
  return (
    <section className="stack">
      <ModuleHeader title="Stok Hareketleri" subtitle="Ürün bazlı giriş, çıkış ve satış hareketleri" count={movements.length} />
      <div className="panel form-grid compact">
        <label><span>Ürün</span><select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Tüm ürünler</option>{products.map((product) => <option key={product.id} value={product.id}>{product.stockCode} - {product.productName}</option>)}</select></label>
        <label><span>Başlangıç</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label><span>Bitiş</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <button type="button" className="primary" onClick={applyFilter}>Filtrele</button>
      </div>
      <DataTable
        title="Stok Hareket Raporu"
        rows={movements}
        columns={[
          { label: 'Ürün', render: (row) => `${row.productCode} - ${row.productName}` },
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Hareket', render: (row) => <MovementBadge type={row.movementType} /> },
          { label: 'Adet', render: (row) => row.quantity },
          { label: 'Kaynak', render: (row) => `${row.sourceDocumentType} #${row.sourceDocumentId}` },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
        ]}
      />
    </section>
  );
}

function StockValuationPanel({ rows, summary }: { rows: StockValuationRow[]; summary: StockValuationSummary }) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [valuedOnly, setValuedOnly] = useState(false);
  const brands = useMemo(() => Array.from(new Set(rows.map((row) => row.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr-TR')), [rows]);
  const normalizedSearch = normalize(search);
  const visible = rows.filter((row) => {
    const matchesSearch = !normalizedSearch || [row.productCode, row.barcode, row.name, row.brand].some((value) => normalize(value).includes(normalizedSearch));
    const matchesBrand = !brand || row.brand === brand;
    const matchesLowStock = !lowStockOnly || row.lowStock;
    const matchesValued = !valuedOnly || row.stockValueTry > 0;
    return matchesSearch && matchesBrand && matchesLowStock && matchesValued;
  });

  return (
    <section className="stack">
      <ModuleHeader title="Stok Değer Raporu" subtitle="Ortalama maliyet, stok degeri ve potansiyel brüt kar takibi" count={visible.length} />
      <div className="kpi-grid analytics-kpis">
        <KpiCard label="Toplam stok degeri" value={money(summary.totalStockValueTry, 'TRY')} strong />
        <KpiCard label="Toplam urun" value={summary.totalProductCount} />
        <KpiCard label="Toplam adet" value={summary.totalStockQuantity.toLocaleString('tr-TR')} />
        <KpiCard label="Potansiyel satis degeri" value={money(summary.totalPotentialSaleValueTry, 'TRY')} />
        <KpiCard label="Potansiyel brüt kar" value={money(summary.totalPotentialGrossProfitTry, 'TRY')} strong />
        <KpiCard label="Düşük stok" value={summary.lowStockCount} alert={summary.lowStockCount > 0} />
      </div>
      <div className="panel form-grid compact">
        <label><span>Ürün / kod / barkod</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ara" /></label>
        <label><span>Marka</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">Tum markalar</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="checkbox-line"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} /> Düşük stok</label>
        <label className="checkbox-line"><input type="checkbox" checked={valuedOnly} onChange={(event) => setValuedOnly(event.target.checked)} /> Sadece degeri olan stoklar</label>
      </div>
      <DataTable
        title="Stok Değer Tablosu"
        rows={visible}
        columns={[
          { label: 'Stok kodu', render: (row) => row.productCode },
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Ürün adi', render: (row) => row.name },
          { label: 'Marka', render: (row) => row.brand },
          { label: 'Kart para', render: (row) => <CurrencyBadge value={row.currency} /> },
          { label: 'Stok', render: (row) => row.stockQuantity.toLocaleString('tr-TR') },
          { label: 'Kart alis', render: (row) => money(row.purchasePrice, row.currency) },
          { label: 'Ort. maliyet', render: (row) => money(row.averageCostTry, 'TRY') },
          { label: 'Stok degeri', render: (row) => money(row.stockValueTry, 'TRY') },
          { label: 'Kart satis', render: (row) => money(row.salePrice, row.currency) },
          { label: 'Satış TRY', render: (row) => money(row.salePriceTry, 'TRY') },
          { label: 'Potansiyel kar', render: (row) => money(row.potentialGrossProfitTry, 'TRY') },
          { label: 'Kar oranı', render: (row) => percent(row.profitMargin) },
        ]}
      />
    </section>
  );
}

function ProductProfitPanel({ rows, onLoad }: { rows: ProductProfitReport[]; onLoad: (query: string) => Promise<void> }) {
  const totals = profitTotals(rows);
  return (
    <section className="stack">
      <ModuleHeader title="Ürün Kar Raporu" subtitle="Ürün bazinda satis, maliyet ve brüt kar snapshot raporu" count={rows.length} />
      <ProfitFilters onApply={onLoad} />
      <ProfitKpis totals={totals} />
      <DataTable
        title="Ürün Kar Tablosu"
        rows={rows}
        columns={[
          { label: 'Ürün', render: (row) => `${row.productCode} - ${row.productName}` },
          { label: 'Satilan adet', render: (row) => row.quantity.toLocaleString('tr-TR') },
          { label: 'Satış TRY', render: (row) => money(row.salesAmountTry, 'TRY') },
          { label: 'Maliyet TRY', render: (row) => money(row.costTry, 'TRY') },
          { label: 'Brüt kar TRY', render: (row) => money(row.grossProfitTry, 'TRY') },
          { label: 'Kar oranı', render: (row) => percent(row.profitMargin) },
          { label: 'Maliyet', render: (row) => <ProfitCostBadge status={row.costStatus} /> },
        ]}
      />
    </section>
  );
}

function SalesProfitPanel({ rows, onLoad }: { rows: SalesProfitReport[]; onLoad: (query: string) => Promise<void> }) {
  const [detail, setDetail] = useState<SalesReceiptProfitDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState('');
  const totals = profitTotals(rows);
  const loadDetail = async (receiptId: number) => {
    setDetailStatus('Fiş kar detayı yukleniyor');
    try {
      const nextDetail = await api.salesReceiptProfit(receiptId);
      setDetail(nextDetail);
      setDetailStatus('');
    } catch (error) {
      setDetailStatus(error instanceof Error ? error.message : 'Fiş kar detayı alınamadı');
    }
  };

  return (
    <section className="stack">
      <ModuleHeader title="Fiş Kar Analizi" subtitle="Fiş bazinda satis tutari, maliyet ve kar oranı" count={rows.length} />
      <ProfitFilters onApply={onLoad} />
      <ProfitKpis totals={totals} />
      <DataTable
        title="Fiş Kar Listesi"
        rows={rows}
        columns={[
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Fiş no', render: (row) => row.documentNo },
          { label: 'Müşteri', render: (row) => row.customerName },
          { label: 'Para', render: (row) => <CurrencyBadge value={row.documentCurrency} /> },
          { label: 'Satilan adet', render: (row) => row.quantity.toLocaleString('tr-TR') },
          { label: 'Satış TRY', render: (row) => money(row.salesAmountTry, 'TRY') },
          { label: 'Maliyet TRY', render: (row) => money(row.costTry, 'TRY') },
          { label: 'Brüt kar TRY', render: (row) => money(row.grossProfitTry, 'TRY') },
          { label: 'Kar oranı', render: (row) => percent(row.profitMargin) },
          { label: 'Maliyet', render: (row) => <ProfitCostBadge status={row.costStatus} /> },
          { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => loadDetail(row.receiptId)}>Detay</button> },
        ]}
      />
      {detailStatus ? <p className="inline-status">{detailStatus}</p> : null}
      {detail ? (
        <section className="panel stack">
          <div className="panel-title-row">
            <h2>Fiş Kar Detayı</h2>
            <span>{detail.documentNo}</span>
          </div>
          <div className="kpi-grid analytics-kpis">
            <KpiCard label="Müşteri" value={detail.customerName} />
            <KpiCard label="Belge para birimi" value={detail.documentCurrency} />
            <KpiCard label="Satış TRY" value={money(detail.salesAmountTry, 'TRY')} strong />
            <KpiCard label="Maliyet TRY" value={money(detail.costTry, 'TRY')} />
            <KpiCard label="Brüt kar TRY" value={money(detail.grossProfitTry, 'TRY')} strong />
            <KpiCard label="Kar oranı" value={percent(detail.profitMargin)} />
          </div>
          <DataTable
            title="Fiş Satir Kar Analizi"
            rows={detail.items}
            columns={[
              { label: 'Ürün', render: (row) => `${row.productCode} - ${row.productName}` },
              { label: 'Adet', render: (row) => row.quantity.toLocaleString('tr-TR') },
              { label: 'Satir para', render: (row) => <CurrencyBadge value={row.lineCurrency} /> },
              { label: 'Orijinal tutar', render: (row) => money(row.lineTotalOriginal, row.lineCurrency) },
              { label: 'Satış TRY', render: (row) => money(row.lineTotalTry, 'TRY') },
              { label: 'Birim maliyet TRY', render: (row) => money(row.unitCostTry, 'TRY') },
              { label: 'Toplam maliyet TRY', render: (row) => money(row.totalCostTry, 'TRY') },
              { label: 'Brüt kar TRY', render: (row) => money(row.grossProfitTry, 'TRY') },
              { label: 'Kar oranı', render: (row) => percent(row.profitMargin) },
              { label: 'Maliyet', render: (row) => <ProfitCostBadge status={row.costStatus} /> },
            ]}
          />
        </section>
      ) : null}
    </section>
  );
}

function LowProfitProductsPanel({ rows, onLoad }: { rows: ProductProfitReport[]; onLoad: (query: string) => Promise<void> }) {
  const totals = profitTotals(rows);
  return (
    <section className="stack">
      <ModuleHeader title="Düşük Karlı Ürünler" subtitle="Eşik altinda kalan veya maliyet snapshot'i eksik ürünler" count={rows.length} />
      <ProfitFilters onApply={onLoad} showThreshold />
      <ProfitKpis totals={totals} />
      <DataTable
        title="Düşük Karlı Ürün Listesi"
        rows={rows}
        columns={[
          { label: 'Ürün', render: (row) => `${row.productCode} - ${row.productName}` },
          { label: 'Satilan adet', render: (row) => row.quantity.toLocaleString('tr-TR') },
          { label: 'Satış TRY', render: (row) => money(row.salesAmountTry, 'TRY') },
          { label: 'Maliyet TRY', render: (row) => money(row.costTry, 'TRY') },
          { label: 'Brüt kar TRY', render: (row) => money(row.grossProfitTry, 'TRY') },
          { label: 'Kar oranı', render: (row) => percent(row.profitMargin) },
          { label: 'Eşik', render: (row) => row.threshold != null ? percent(row.threshold) : '-' },
          { label: 'Maliyet', render: (row) => <ProfitCostBadge status={row.costStatus} /> },
        ]}
      />
    </section>
  );
}

function ProfitFilters({ onApply, showThreshold = false }: { onApply: (query: string) => Promise<void>; showThreshold?: boolean }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currency, setCurrency] = useState<'all' | Currency>('all');
  const [threshold, setThreshold] = useState(15);
  const [loading, setLoading] = useState(false);
  const apply = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.set('dateFrom', new Date(`${dateFrom}T00:00:00`).toISOString());
      if (dateTo) query.set('dateTo', new Date(`${dateTo}T23:59:59`).toISOString());
      if (currency !== 'all') query.set('currency', currency);
      if (showThreshold) query.set('threshold', String(threshold));
      await onApply(query.toString() ? `?${query.toString()}` : '');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="panel form-grid compact">
      <label><span>Baslangic</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label><span>Bitis</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
      <label><span>Para birimi</span><select value={currency} onChange={(event) => setCurrency(event.target.value as 'all' | Currency)}><option value="all">Tum para birimleri</option><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
      {showThreshold ? <label><span>Kar esigi %</span><input type="number" min="-100" step="0.1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label> : null}
      <button type="button" className="primary" onClick={apply} disabled={loading}>{loading ? 'Filtreleniyor' : 'Filtrele'}</button>
    </div>
  );
}

function ProfitKpis({ totals }: { totals: { quantity: number; salesAmountTry: number; costTry: number; grossProfitTry: number; profitMargin: number; missingCostCount: number } }) {
  return (
    <div className="kpi-grid analytics-kpis">
      <KpiCard label="Satış TRY" value={money(totals.salesAmountTry, 'TRY')} strong />
      <KpiCard label="Maliyet TRY" value={money(totals.costTry, 'TRY')} />
      <KpiCard label="Brüt kar TRY" value={money(totals.grossProfitTry, 'TRY')} strong />
      <KpiCard label="Kar oranı" value={percent(totals.profitMargin)} />
      <KpiCard label="Satilan adet" value={totals.quantity.toLocaleString('tr-TR')} />
      <KpiCard label="Maliyet eksik" value={totals.missingCostCount} alert={totals.missingCostCount > 0} />
    </div>
  );
}

function ProfitCostBadge({ status }: { status: 'ok' | 'missing' }) {
  return <span className={`badge ${status === 'ok' ? 'badge-purchase' : 'badge-cancel'}`}>{status === 'ok' ? 'maliyet tamam' : 'maliyet eksik/tahmini'}</span>;
}

function profitTotals(rows: Array<ProductProfitReport | SalesProfitReport>) {
  const totals = rows.reduce((acc, row) => ({
    quantity: acc.quantity + Number(row.quantity ?? 0),
    salesAmountTry: acc.salesAmountTry + Number(row.salesAmountTry ?? 0),
    costTry: acc.costTry + Number(row.costTry ?? 0),
    grossProfitTry: acc.grossProfitTry + Number(row.grossProfitTry ?? 0),
    missingCostCount: acc.missingCostCount + (row.costStatus === 'ok' ? 0 : Number(row.missingCostCount ?? 1)),
  }), { quantity: 0, salesAmountTry: 0, costTry: 0, grossProfitTry: 0, missingCostCount: 0 });
  return {
    ...totals,
    profitMargin: totals.salesAmountTry > 0 ? (totals.grossProfitTry / totals.salesAmountTry) * 100 : 0,
  };
}

function SalesAnalyticsPanel({ analytics, topProducts, customerSummary }: { analytics: SalesAnalytics; topProducts: TopProductReport[]; customerSummary: CustomerSummaryReport[] }) {
  return (
    <section className="stack">
      <ModuleHeader title="Satış Analizleri" subtitle="Günlük, haftalık ve ürün/müşteri bazlı satış görünümü" count={analytics.weeklySales.receiptCount} />
      <div className="kpi-grid analytics-kpis">
        <KpiCard label="Günlük satış" value={`${analytics.dailySales.receiptCount} fiş`} />
        <KpiCard label="Günlük ciro" value={money(analytics.dailySales.totalAmount, 'TRY')} strong />
        <KpiCard label="Haftalık satış" value={`${analytics.weeklySales.receiptCount} fiş`} />
        <KpiCard label="Haftalık ciro" value={money(analytics.weeklySales.totalAmount, 'TRY')} strong />
      </div>
      <div className="report-bottom-grid">
        <section className="panel">
          <h2>En Çok Satan Ürün</h2>
          <Info label="Ürün" value={analytics.topProduct?.productName ?? '-'} />
          <Info label="Adet" value={analytics.topProduct?.quantity ?? 0} />
          <Info label="Tutar" value={money(analytics.topProduct?.totalAmount ?? 0, 'TRY')} />
        </section>
        <section className="panel">
          <h2>En Aktif Müşteri</h2>
          <Info label="Müşteri" value={analytics.activeCustomer?.customerName ?? '-'} />
          <Info label="Fiş" value={analytics.activeCustomer?.receiptCount ?? 0} />
          <Info label="Tutar" value={money(analytics.activeCustomer?.totalAmount ?? 0, 'TRY')} />
        </section>
      </div>
      <div className="report-bottom-grid">
        <section className="panel">
          <h2>Para Birimine Göre Toplamlar</h2>
          <MiniList empty="Toplam yok." rows={analytics.currencyTotals.map((row) => ({ title: row.currency, meta: `${row.receiptCount} fiş`, value: money(row.totalAmount, row.currency) }))} />
        </section>
        <section className="panel">
          <h2>Top Ürün / Müşteri Listeleri</h2>
          <MiniList empty="Ürün yok." rows={topProducts.slice(0, 5).map((row) => ({ title: row.productName, meta: row.productCode, value: `${row.quantity} adet` }))} />
          <MiniList empty="Müşteri yok." rows={customerSummary.slice(0, 5).map((row) => ({ title: row.customerName, meta: `${row.receiptCount} fiş`, value: money(row.totalAmount, 'TRY') }))} />
        </section>
      </div>
    </section>
  );
}

function ModuleHeader({ title, subtitle, count }: { title: string; subtitle: string; count: string | number }) {
  return (
    <div className="panel module-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <span>{count} kayıt</span>
    </div>
  );
}

function CurrencySummary({ title, labels, totals, onClick }: { title: string; labels: [string, string, string]; totals?: { try: number; usd: number; eur: number }; onClick?: () => void }) {
  const content = (
    <>
      <h2>{title}</h2>
      <div className="currency-summary">
        <Metric label={labels[0]} value={money(totals?.try ?? 0, 'TRY')} />
        <Metric label={labels[1]} value={money(totals?.usd ?? 0, 'USD')} />
        <Metric label={labels[2]} value={money(totals?.eur ?? 0, 'EUR')} />
      </div>
    </>
  );

  return (
    <section className={`panel compact-panel ${onClick ? 'dashboard-clickable' : ''}`} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={onClick ? (event) => activateOnEnter(event, onClick) : undefined}>
      {content}
    </section>
  );
}

function MiniList({ rows, empty }: { rows: Array<{ title: string; meta: string; value: string }>; empty: string }) {
  if (rows.length === 0) return <p className="empty-text">{empty}</p>;
  return (
    <div className="mini-list">
      {rows.map((row) => (
        <div className="mini-row" key={`${row.title}-${row.meta}`}>
          <div>
            <strong>{row.title}</strong>
            <span>{row.meta}</span>
          </div>
          <b>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProductsView({ products, role, onSaved }: { products: Product[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product: Product | null } | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const canManageProducts = role === 'ADMIN' || role === 'MANAGER';
  const normalizedSearch = normalize(search);
  const filteredProducts = products.filter((product) => {
    const matchesSearch = !normalizedSearch || [product.stockCode, product.barcode, product.brand, product.typeName].some((value) => normalize(value).includes(normalizedSearch));
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? product.active : !product.active);
    const matchesLowStock = !lowStockOnly || Number(product.quantity) <= 5;
    return matchesSearch && matchesActive && matchesLowStock;
  });
  return (
    <div className="stack">
      <div className="panel panel-title-row">
        <div>
          <h2>Stok Kartlari</h2>
          <p>Stok kartlarini ara, filtrele ve detaylarini incele.</p>
        </div>
        {canManageProducts ? <button type="button" className="primary" onClick={() => setProductModal({ mode: 'create', product: null })}>Yeni Stok Karti</button> : null}
      </div>
      <div className="panel filter-panel">
        <Field label="Ara" value={search} onChange={setSearch} required={false} />
        <label>
          <span>Durum</span>
          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
            <option value="all">Tumu</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
        </label>
        <label className="check-field"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} /> Düşük stok</label>
      </div>
      <DataTable
        title="Stok Kartlari"
        rows={filteredProducts}
        columns={[
          { label: 'Stok kodu', render: (row) => row.stockCode },
          { label: 'Barkod', render: (row) => row.barcode },
          { label: 'Marka', render: (row) => row.brand },
          { label: 'Cesit', render: (row) => row.typeName },
          { label: 'Stok', render: (row) => row.quantity },
          { label: 'Alış', render: (row) => row.buyPrice },
          { label: 'Alış USD', render: (row) => row.buyPriceUsd ?? '-' },
          { label: 'Alış EUR', render: (row) => row.buyPriceEur ?? '-' },
          { label: 'Satış', render: (row) => row.sellPrice },
          { label: 'Satış USD', render: (row) => row.sellPriceUsd ?? '-' },
          { label: 'Satış EUR', render: (row) => row.sellPriceEur ?? '-' },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'Islem', render: (row) => <ActionButtons onDetail={() => setSelected(row)} onEdit={canManageProducts ? () => setProductModal({ mode: 'edit', product: row }) : undefined} /> },
        ]}
      />
      {productModal ? <ProductModal product={productModal.product} onSaved={onSaved} onDone={() => setProductModal(null)} /> : null}
      {selected ? <ProductDetail product={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function ProductDetail({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <section className="panel detail-panel">
      <div className="panel-title-row">
        <div>
          <h2>{product.stockCode}</h2>
          <p>{product.brand} / {product.typeName}</p>
        </div>
        <button type="button" className="ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="detail-grid">
        <Info label="Stok kodu" value={product.stockCode} />
        <Info label="Barkod" value={product.barcode} />
        <Info label="Marka" value={product.brand} />
        <Info label="Cesit" value={product.typeName} />
        <Info label="Mevcut adet" value={product.quantity} />
        <Info label="Durum" value={product.active ? 'Aktif' : 'Pasif'} />
        <Info label="TRY alis" value={money(product.buyPriceTry ?? product.buyPrice, 'TRY')} />
        <Info label="USD alis" value={money(product.buyPriceUsd ?? 0, 'USD')} />
        <Info label="EUR alis" value={money(product.buyPriceEur ?? 0, 'EUR')} />
        <Info label="TRY satis" value={money(product.sellPriceTry ?? product.sellPrice, 'TRY')} />
        <Info label="USD satis" value={money(product.sellPriceUsd ?? 0, 'USD')} />
        <Info label="EUR satis" value={money(product.sellPriceEur ?? 0, 'EUR')} />
      </div>
      <h3>Son stok hareketleri</h3>
      <MiniList
        empty="Stok hareketi yok."
        rows={(product.stockMovements ?? []).map((movement) => ({
          title: movement.movementType,
          meta: `${movement.sourceDocumentType} #${movement.sourceDocumentId} / ${dateLabel(movement.createdAt)}`,
          value: String(movement.quantity),
        }))}
      />
    </section>
  );
}

function ProductModal({ product, onSaved, onDone }: { product: Product | null; onSaved: () => Promise<void>; onDone: () => void }) {
  const [form, setForm] = useState({
    stockCode: '',
    barcode: '',
    brand: '',
    typeName: '',
    quantity: 0,
    buyPrice: 0,
    sellPrice: 0,
    buyPriceUsd: 0,
    buyPriceEur: 0,
    sellPriceUsd: 0,
    sellPriceEur: 0,
    active: true,
  });
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(product ? {
      stockCode: product.stockCode,
      barcode: product.barcode,
      brand: product.brand,
      typeName: product.typeName,
      quantity: Number(product.quantity),
      buyPrice: Number(product.buyPrice),
      sellPrice: Number(product.sellPrice),
      buyPriceUsd: Number(product.buyPriceUsd ?? 0),
      buyPriceEur: Number(product.buyPriceEur ?? 0),
      sellPriceUsd: Number(product.sellPriceUsd ?? 0),
      sellPriceEur: Number(product.sellPriceEur ?? 0),
      active: product.active,
    } : { stockCode: '', barcode: '', brand: '', typeName: '', quantity: 0, buyPrice: 0, sellPrice: 0, buyPriceUsd: 0, buyPriceEur: 0, sellPriceUsd: 0, sellPriceEur: 0, active: true });
    setMessage('');
    setDirty(false);
  }, [product]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm('Kaydedilmemis degisiklikler var. Kapatilsin mi?')) return;
    onDone();
  }, [dirty, onDone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (product) await api.updateProduct(product.id, form);
      else await api.createProduct(form);
      await onSaved();
      setDirty(false);
      onDone();
      setMessage('Stok karti kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kayıt başarısız.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <form className="panel form-panel modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Stok karti</p>
            <h2>{product ? 'Stok Karti Duzenle' : 'Yeni Stok Karti'}</h2>
          </div>
          <button type="button" className="ghost" onClick={requestClose}>Vazgec</button>
        </div>
        <div className="form-grid modal-form-grid">
          <Field label="Stok kodu" value={form.stockCode} onChange={(stockCode) => updateForm('stockCode', stockCode)} />
          <Field label="Barkod" value={form.barcode} onChange={(barcode) => updateForm('barcode', barcode)} />
          <Field label="Marka" value={form.brand} onChange={(brand) => updateForm('brand', brand)} />
          <Field label="Cesit" value={form.typeName} onChange={(typeName) => updateForm('typeName', typeName)} />
          <NumberField label="Mevcut adet" value={form.quantity} onChange={(quantity) => updateForm('quantity', quantity)} />
          <label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} /> Aktif</label>
        </div>
        <div className="price-groups">
          <section className="price-group">
            <h3>Alış fiyatlari</h3>
            <div className="form-grid compact">
              <NumberField label="TRY alis fiyatı" value={form.buyPrice} onChange={(buyPrice) => updateForm('buyPrice', buyPrice)} />
              <NumberField label="USD alis fiyatı" value={form.buyPriceUsd} onChange={(buyPriceUsd) => updateForm('buyPriceUsd', buyPriceUsd)} />
              <NumberField label="EUR alis fiyatı" value={form.buyPriceEur} onChange={(buyPriceEur) => updateForm('buyPriceEur', buyPriceEur)} />
            </div>
          </section>
          <section className="price-group">
            <h3>Satış fiyatlari</h3>
            <div className="form-grid compact">
              <NumberField label="TRY satis fiyatı" value={form.sellPrice} onChange={(sellPrice) => updateForm('sellPrice', sellPrice)} />
              <NumberField label="USD satis fiyatı" value={form.sellPriceUsd} onChange={(sellPriceUsd) => updateForm('sellPriceUsd', sellPriceUsd)} />
              <NumberField label="EUR satis fiyatı" value={form.sellPriceEur} onChange={(sellPriceEur) => updateForm('sellPriceEur', sellPriceEur)} />
            </div>
          </section>
        </div>
        {message ? <p className="message">{message}</p> : null}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={requestClose}>Vazgec</button>
          <button className="primary">Kaydet</button>
        </div>
      </form>
    </div>
  );
}

function CustomersView({ customers, salesReceipts, role, onSaved }: { customers: Customer[]; salesReceipts: SalesReceipt[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [partyModal, setPartyModal] = useState<{ party: Customer | null } | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [movementCustomer, setMovementCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>('all');
  const canManageParties = role === 'ADMIN' || role === 'MANAGER';
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = !search || [customer.name, customer.phone ?? ''].some((value) => normalize(value).includes(normalize(search)));
    const matchesCurrency = currencyFilter === 'all' || (customer.defaultCurrency ?? 'TRY') === currencyFilter;
    return matchesSearch && matchesCurrency;
  });
  return (
    <div className="stack">
      <div className="panel panel-title-row">
        <div>
          <h2>Müşteriler</h2>
          <p>Müşteri kartlarini ara, filtrele ve cari bakiyelerini izle.</p>
        </div>
        {canManageParties ? <button type="button" className="primary" onClick={() => setPartyModal({ party: null })}>Yeni Müşteri</button> : null}
      </div>
      <PartyFilters search={search} onSearch={setSearch} currencyFilter={currencyFilter} onCurrencyFilter={setCurrencyFilter} />
      <DataTable
        title="Müşteriler"
        rows={filteredCustomers}
        columns={[
          { label: 'Ad', render: (row) => row.name },
          { label: 'Telefon', render: (row) => row.phone ?? '-' },
          { label: 'Bakiye', render: (row) => row.balance },
          { label: 'Para', render: (row) => row.defaultCurrency ?? 'TRY' },
          { label: 'TL bakiye', render: (row) => row.balanceTry ?? row.balance },
          { label: 'USD bakiye', render: (row) => row.balanceUsd ?? 0 },
          { label: 'EUR bakiye', render: (row) => row.balanceEur ?? 0 },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'Islem', render: (row) => <PartyActions onDetail={() => setSelected(row)} onMovements={() => setMovementCustomer(row)} onEdit={canManageParties ? () => setPartyModal({ party: row }) : undefined} /> },
        ]}
      />
      {partyModal ? <PartyModal title={partyModal.party ? 'Müşteri Duzenle' : 'Yeni Müşteri'} party={partyModal.party} type="customer" onSaved={onSaved} onDone={() => setPartyModal(null)} /> : null}
      {movementCustomer ? <PartyMovementsModal title={`${movementCustomer.name} Hareketleri`} partyType="customer" partyId={movementCustomer.id} onClose={() => setMovementCustomer(null)} /> : null}
      {selected ? <CustomerDetail customer={selected} receipts={salesReceipts.filter((receipt) => receipt.customer?.id === selected.id)} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function SuppliersView({ suppliers, purchaseReceipts, role, onSaved }: { suppliers: Supplier[]; purchaseReceipts: PurchaseReceipt[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [partyModal, setPartyModal] = useState<{ party: Supplier | null } | null>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [movementSupplier, setMovementSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>('all');
  const canManageParties = role === 'ADMIN' || role === 'MANAGER';
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch = !search || [supplier.name, supplier.phone ?? ''].some((value) => normalize(value).includes(normalize(search)));
    const matchesCurrency = currencyFilter === 'all' || (supplier.defaultCurrency ?? 'TRY') === currencyFilter;
    return matchesSearch && matchesCurrency;
  });
  return (
    <div className="stack">
      <div className="panel panel-title-row">
        <div>
          <h2>Tedarikçiler</h2>
          <p>Tedarikçi kartlarini ara, filtrele ve cari borclari izle.</p>
        </div>
        {canManageParties ? <button type="button" className="primary" onClick={() => setPartyModal({ party: null })}>Yeni Tedarikçi</button> : null}
      </div>
      <PartyFilters search={search} onSearch={setSearch} currencyFilter={currencyFilter} onCurrencyFilter={setCurrencyFilter} />
      <DataTable
        title="Tedarikçiler"
        rows={filteredSuppliers}
        columns={[
          { label: 'Ad', render: (row) => row.name },
          { label: 'Telefon', render: (row) => row.phone ?? '-' },
          { label: 'Bakiye', render: (row) => row.balance },
          { label: 'Para', render: (row) => row.defaultCurrency ?? 'TRY' },
          { label: 'TL bakiye', render: (row) => row.balanceTry ?? row.balance },
          { label: 'USD bakiye', render: (row) => row.balanceUsd ?? 0 },
          { label: 'EUR bakiye', render: (row) => row.balanceEur ?? 0 },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'Islem', render: (row) => <PartyActions onDetail={() => setSelected(row)} onMovements={() => setMovementSupplier(row)} onEdit={canManageParties ? () => setPartyModal({ party: row }) : undefined} /> },
        ]}
      />
      {partyModal ? <PartyModal title={partyModal.party ? 'Tedarikçi Duzenle' : 'Yeni Tedarikçi'} party={partyModal.party} type="supplier" onSaved={onSaved} onDone={() => setPartyModal(null)} /> : null}
      {movementSupplier ? <PartyMovementsModal title={`${movementSupplier.name} Hareketleri`} partyType="supplier" partyId={movementSupplier.id} onClose={() => setMovementSupplier(null)} /> : null}
      {selected ? <SupplierDetail supplier={selected} receipts={purchaseReceipts.filter((receipt) => receipt.supplier?.id === selected.id)} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function CurrentAccountMovementsPanel({ movements, customers, suppliers, onLoad }: { movements: CurrentAccountMovement[]; customers: Customer[]; suppliers: Supplier[]; onLoad: (query: string) => Promise<void> }) {
  const [partyType, setPartyType] = useState<'all' | 'CUSTOMER' | 'SUPPLIER'>('all');
  const [partyId, setPartyId] = useState('all');
  const [currency, setCurrency] = useState<'all' | Currency>('all');
  const [documentType, setDocumentType] = useState<'all' | CurrentAccountMovement['documentType']>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [message, setMessage] = useState('');
  const parties = partyType === 'CUSTOMER' ? customers : partyType === 'SUPPLIER' ? suppliers : [];
  const debitTotal = movements.filter((row) => row.direction === 'DEBIT').reduce((sum, row) => sum + Number(row.amountTry ?? row.amount ?? 0), 0);
  const creditTotal = movements.filter((row) => row.direction === 'CREDIT').reduce((sum, row) => sum + Number(row.amountTry ?? row.amount ?? 0), 0);

  const applyFilters = async () => {
    const query = new URLSearchParams();
    if (partyType !== 'all') query.set('partyType', partyType);
    if (partyType !== 'all' && partyId !== 'all') query.set('partyId', partyId);
    if (currency !== 'all') query.set('currency', currency);
    if (documentType !== 'all') query.set('documentType', documentType);
    if (dateFrom) query.set('dateFrom', new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) query.set('dateTo', new Date(`${dateTo}T23:59:59`).toISOString());
    setMessage('Cari hareketler yükleniyor.');
    try {
      await onLoad(query.toString() ? `?${query.toString()}` : '');
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cari hareketler yüklenemedi.');
    }
  };

  return (
    <section className="stack">
      <ModuleHeader title="Cari Hareketler" subtitle="Gerçek cari hareket defteri" count={movements.length} />
      <section className="panel receipt-filter-panel">
        <div className="panel-title-row">
          <div>
            <h2>Ekstre Filtreleri</h2>
            <p>Müşteri/tedarikçi, tarih, para birimi ve belge tipine göre cari hareketleri listele.</p>
          </div>
          <button type="button" className="primary" onClick={() => void applyFilters()}>Listele</button>
        </div>
        <div className="receipt-filter-grid">
          <label>
            <span>Cari türü</span>
            <select value={partyType} onChange={(event) => { setPartyType(event.target.value as typeof partyType); setPartyId('all'); }}>
              <option value="all">Tümü</option>
              <option value="CUSTOMER">Müşteri</option>
              <option value="SUPPLIER">Tedarikçi</option>
            </select>
          </label>
          <label>
            <span>Cari</span>
            <select value={partyId} onChange={(event) => setPartyId(event.target.value)} disabled={partyType === 'all'}>
              <option value="all">Tümü</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </label>
          <label>
            <span>Başlangıç</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            <span>Para</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>
              <option value="all">Tümü</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            <span>Belge tipi</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)}>
              <option value="all">Tümü</option>
              <option value="SALES_RECEIPT">Satış fişi</option>
              <option value="PURCHASE_RECEIPT">Alış fişi</option>
              <option value="PAYMENT">Ödeme</option>
              <option value="COLLECTION">Tahsilat</option>
              <option value="CANCEL">İptal</option>
            </select>
          </label>
        </div>
      </section>
      <div className="receipt-summary-strip">
        <Info label="Hareket" value={movements.length} />
        <Info label="Borç TRY" value={money(debitTotal, 'TRY')} />
        <Info label="Alacak TRY" value={money(creditTotal, 'TRY')} />
        <Info label="Fark TRY" value={money(debitTotal - creditTotal, 'TRY')} />
      </div>
      {message ? <p className="message">{message}</p> : null}
      <DataTable
        title="Cari Hareket Defteri"
        rows={movements}
        columns={[
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Cari türü', render: (row) => row.partyType === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi' },
          { label: 'Cari adı', render: (row) => row.partyName },
          { label: 'Belge no', render: (row) => row.documentNo },
          { label: 'İşlem tipi', render: (row) => row.documentType },
          { label: 'Cari Para Birimi', render: (row) => <CurrencyBadge value={row.accountCurrency ?? row.currency} /> },
          { label: 'Borç', render: (row) => row.direction === 'DEBIT' ? money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) : '-' },
          { label: 'Alacak', render: (row) => row.direction === 'CREDIT' ? money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) : '-' },
          { label: 'Belge Para Birimi', render: (row) => <CurrencyBadge value={row.documentCurrency ?? row.currency} /> },
          { label: 'Belge tutarı', render: (row) => money(row.documentAmount ?? row.amount, row.documentCurrency ?? row.currency) },
          { label: 'TRY Karşılığı', render: (row) => money(row.amountTry ?? row.amount, 'TRY') },
          { label: 'Ödeme', render: (row) => row.paymentMethod ?? '-' },
          { label: 'Açıklama', render: (row) => row.description ?? '-' },
        ]}
      />
    </section>
  );
}

function CashMovementEntryPanel({ mode, role, customers, suppliers, onSaved }: { mode: 'collection' | 'payment'; role: UserRole; customers: Customer[]; suppliers: Supplier[]; onSaved: () => Promise<void> }) {
  const isCollection = mode === 'collection';
  const parties = isCollection ? customers : suppliers;
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [amountTry, setAmountTry] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<CashMovementInput['paymentMethod']>('CASH');
  const [description, setDescription] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [message, setMessage] = useState('');
  const title = isCollection ? 'Tahsilat Girişi' : 'Ödeme Girişi';
  const subtitle = isCollection ? 'Müşteriden alınan tahsilat müşteri borcunu azaltır.' : 'Tedarikçiye yapılan ödeme tedarikçi borcunu azaltır.';
  const partyLabel = isCollection ? 'Müşteri' : 'Tedarikçi';
  const canSave = hasPermission(role, 'cashMovement');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!canSave) {
      setMessage('Bu işlem için yetkiniz yok.');
      return;
    }
    if (!partyId || amount <= 0) {
      setMessage(`${partyLabel} ve tutar gerekli.`);
      return;
    }
    const payload: CashMovementInput = {
      amount,
      currency,
      paymentMethod,
      description: description || null,
      ...(amountTry > 0 ? { amountTry } : {}),
      ...(createdAt ? { createdAt: new Date(`${createdAt}T12:00:00`).toISOString() } : {}),
      ...(isCollection ? { customerId: Number(partyId) } : { supplierId: Number(partyId) }),
    };
    try {
      if (isCollection) await api.createCollection(payload);
      else await api.createPayment(payload);
      setAmount(0);
      setAmountTry(0);
      setDescription('');
      await onSaved();
      setMessage(isCollection ? 'Tahsilat kaydedildi.' : 'Ödeme kaydedildi.');
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Hareket kaydedilemedi.'));
    }
  };

  return (
    <section className="stack">
      <ModuleHeader title={title} subtitle={subtitle} count={parties.length} />
      <form className="panel form-panel cash-entry-panel" onSubmit={submit}>
        <div className="form-grid compact">
          <label>
            <span>{partyLabel}</span>
            <select value={partyId} onChange={(event) => setPartyId(event.target.value)}>
              <option value="">Seçiniz</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </label>
          <NumberField label="Tutar" value={amount} onChange={setAmount} />
          <label>
            <span>Para birimi</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <NumberField label="TL karşılığı" value={amountTry} onChange={setAmountTry} />
          <label>
            <span>Ödeme yöntemi</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CashMovementInput['paymentMethod'])}>
              <option value="CASH">Nakit</option>
              <option value="BANK">Banka</option>
              <option value="CARD">Kart</option>
              <option value="OTHER">Diğer</option>
            </select>
          </label>
          <label>
            <span>Tarih</span>
            <input type="date" value={createdAt} onChange={(event) => setCreatedAt(event.target.value)} />
          </label>
        </div>
        <Field label="Açıklama" value={description} onChange={setDescription} required={false} />
        {canSave ? <button className="primary">{isCollection ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet'}</button> : <p className="message">Bu işlem için yetkiniz yok.</p>}
        {message ? <p className="message">{message}</p> : null}
      </form>
    </section>
  );
}

function AccountSummaryPanel({ movements, customers, suppliers }: { movements: CurrentAccountMovement[]; customers: Customer[]; suppliers: Supplier[] }) {
  const debit = movements.reduce((sum, row) => sum + (row.direction === 'DEBIT' ? Number(row.amountTry ?? row.amount ?? 0) : 0), 0);
  const credit = movements.reduce((sum, row) => sum + (row.direction === 'CREDIT' ? Number(row.amountTry ?? row.amount ?? 0) : 0), 0);
  const customerDebt = customers.reduce((sum, customer) => sum + Number(customer.balanceTry ?? customer.balance ?? 0), 0);
  const supplierDebt = suppliers.reduce((sum, supplier) => sum + Number(supplier.balanceTry ?? supplier.balance ?? 0), 0);
  const customerCurrencySummary = currencyBalanceSummary(customers);
  const supplierCurrencySummary = currencyBalanceSummary(suppliers);
  return (
    <section className="stack">
      <ModuleHeader title="Borç/Alacak Özeti" subtitle="Cari hareket defteri ve kart bakiyelerinden özet görünüm" count={movements.length} />
      <div className="analytics-kpis">
        <KpiCard label="Toplam borç hareketi TRY" value={money(debit, 'TRY')} />
        <KpiCard label="Toplam alacak hareketi TRY" value={money(credit, 'TRY')} />
        <KpiCard label="Müşteri TRY karşılığı" value={money(customerDebt, 'TRY')} strong />
        <KpiCard label="Tedarikçi TRY karşılığı" value={money(supplierDebt, 'TRY')} />
      </div>
      <div className="report-bottom-grid">
        <CurrencySummary title="Müşteri cari para bakiyesi" labels={['TRY', 'USD', 'EUR']} totals={customerCurrencySummary} />
        <CurrencySummary title="Tedarikçi cari para bakiyesi" labels={['TRY', 'USD', 'EUR']} totals={supplierCurrencySummary} />
      </div>
      <DataTable
        title="Son Cari Hareketler"
        rows={movements.slice(0, 50)}
        columns={[
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Cari adı', render: (row) => row.partyName },
          { label: 'Belge', render: (row) => row.documentNo },
          { label: 'Tip', render: (row) => row.documentType },
          { label: 'Cari Para Birimi', render: (row) => <CurrencyBadge value={row.accountCurrency ?? row.currency} /> },
          { label: 'Borç', render: (row) => row.direction === 'DEBIT' ? money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) : '-' },
          { label: 'Alacak', render: (row) => row.direction === 'CREDIT' ? money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) : '-' },
          { label: 'Belge Para Birimi', render: (row) => <CurrencyBadge value={row.documentCurrency ?? row.currency} /> },
          { label: 'Belge tutarı', render: (row) => money(row.documentAmount ?? row.amount, row.documentCurrency ?? row.currency) },
          { label: 'TRY Karşılığı', render: (row) => money(row.amountTry ?? row.amount, 'TRY') },
        ]}
      />
    </section>
  );
}

function SupplierPayablesPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>('all');
  const normalizedSearch = normalize(search);
  const filtered = suppliers.filter((supplier) => {
    const matchesSearch = !normalizedSearch || [supplier.name, supplier.phone].some((value) => normalize(value).includes(normalizedSearch));
    const matchesCurrency = currencyFilter === 'all' || (supplier.defaultCurrency ?? 'TRY') === currencyFilter;
    return matchesSearch && matchesCurrency;
  });
  const totals = filtered.reduce((sum, supplier) => ({
    try: sum.try + Number(supplier.balanceTry ?? supplier.balance ?? 0),
    usd: sum.usd + Number(supplier.balanceUsd ?? 0),
    eur: sum.eur + Number(supplier.balanceEur ?? 0),
  }), { try: 0, usd: 0, eur: 0 });
  return (
    <section className="stack">
      <ModuleHeader title="Tedarikçi Borçları" subtitle="Para birimi bazlı tedarikçi borç takibi" count={filtered.length} />
      <div className="receipt-summary-strip">
        <Info label="TL borç" value={money(totals.try, 'TRY')} />
        <Info label="USD borç" value={money(totals.usd, 'USD')} />
        <Info label="EUR borç" value={money(totals.eur, 'EUR')} />
        <Info label="Tedarikçi" value={filtered.length} />
      </div>
      <PartyFilters search={search} onSearch={setSearch} currencyFilter={currencyFilter} onCurrencyFilter={setCurrencyFilter} />
      <DataTable
        title="Tedarikçi Borçları"
        rows={filtered}
        columns={[
          { label: 'Tedarikçi', render: (row) => row.name },
          { label: 'Telefon', render: (row) => row.phone ?? '-' },
          { label: 'Varsayılan para', render: (row) => row.defaultCurrency ?? 'TRY' },
          { label: 'TL borç', render: (row) => money(row.balanceTry ?? row.balance, 'TRY') },
          { label: 'USD borç', render: (row) => money(row.balanceUsd ?? 0, 'USD') },
          { label: 'EUR borç', render: (row) => money(row.balanceEur ?? 0, 'EUR') },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
        ]}
      />
    </section>
  );
}

function SupplierMovementsPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [supplierId, setSupplierId] = useState('');
  const selectedSupplier = suppliers.find((supplier) => supplier.id === Number(supplierId));
  return (
    <section className="stack">
      <ModuleHeader title="Tedarikçi Hareketleri" subtitle="Tedarikçi bazlı alış ve ödeme hareketleri" count={suppliers.length} />
      <section className="panel filter-panel">
        <label>
          <span>Tedarikçi</span>
          <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Tedarikçi seçiniz</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
      </section>
      {selectedSupplier ? <PartyMovementsInline title={`${selectedSupplier.name} Hareketleri`} partyType="supplier" partyId={selectedSupplier.id} /> : <PlaceholderPanel title="Tedarikçi Hareketleri" group="Cari" description="Hareketleri görmek için üstten bir tedarikçi seçin." />}
    </section>
  );
}

function currentAccountTypeLabel(type: CurrentAccountMovement['documentType']) {
  if (type === 'PAYMENT') return 'Ödeme';
  if (type === 'COLLECTION') return 'Tahsilat';
  if (type === 'PURCHASE_RECEIPT') return 'Alış fişi';
  if (type === 'SALES_RECEIPT') return 'Satış fişi';
  if (type === 'CANCEL') return 'İptal';
  return type;
}

function currentAccountDirectionLabel(direction: CurrentAccountMovement['direction']) {
  return direction === 'DEBIT' ? 'Borç' : 'Alacak';
}

function currentAccountBadgeClass(type: CurrentAccountMovement['documentType']) {
  if (type === 'CANCEL') return 'badge badge-cancel';
  if (type === 'PAYMENT' || type === 'SALES_RECEIPT') return 'badge badge-sale';
  return 'badge badge-purchase';
}

function PartyMovementsInline({ title, partyType, partyId }: { title: string; partyType: 'customer' | 'supplier'; partyId: number }) {
  const [rows, setRows] = useState<CurrentAccountMovement[]>([]);
  const [message, setMessage] = useState('Hareketler yükleniyor.');
  useEffect(() => {
    let active = true;
    setMessage('Hareketler yükleniyor.');
    api.currentAccountPartyMovements(partyType === 'customer' ? 'CUSTOMER' : 'SUPPLIER', partyId).then((items) => {
      if (!active) return;
      setRows(items);
      setMessage(items.length ? '' : 'Hareket bulunamadı.');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : 'Hareketler yüklenemedi.');
    });
    return () => { active = false; };
  }, [partyId, partyType]);
  return (
    <section className="panel">
      {message ? <p className="message">{message}</p> : null}
      <DataTable
        title={title}
        rows={rows}
        columns={[
          { label: 'Belge no', render: (row) => row.documentNo },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Tip', render: (row) => <span className={currentAccountBadgeClass(row.documentType)}>{currentAccountTypeLabel(row.documentType)}</span> },
          { label: 'Yön', render: (row) => currentAccountDirectionLabel(row.direction) },
          { label: 'Belge tutarı', render: (row) => money(row.documentAmount ?? row.amount, row.documentCurrency ?? row.currency) },
          { label: 'Cari tutar', render: (row) => money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) },
          { label: 'Açıklama', render: (row) => row.description ?? '-' },
        ]}
      />
    </section>
  );
}

function PartyFilters({ search, onSearch, currencyFilter, onCurrencyFilter }: { search: string; onSearch: (value: string) => void; currencyFilter: 'all' | Currency; onCurrencyFilter: (value: 'all' | Currency) => void }) {
  return (
    <div className="panel filter-panel">
      <Field label="Ara" value={search} onChange={onSearch} required={false} />
      <label>
        <span>Para birimi</span>
        <select value={currencyFilter} onChange={(event) => onCurrencyFilter(event.target.value as 'all' | Currency)}>
          <option value="all">Tumu</option>
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
    </div>
  );
}

function CustomerDetail({ customer, receipts, onClose }: { customer: Customer; receipts: SalesReceipt[]; onClose: () => void }) {
  return (
    <PartyDetail title={customer.name} party={customer} receipts={receipts} onClose={onClose} receiptLabel="Son satis fisleri" movementType="Satış" />
  );
}

function SupplierDetail({ supplier, receipts, onClose }: { supplier: Supplier; receipts: PurchaseReceipt[]; onClose: () => void }) {
  return (
    <PartyDetail title={supplier.name} party={supplier} receipts={receipts} onClose={onClose} receiptLabel="Son alis fisleri" movementType="Alış" />
  );
}

function PartyMovementsModal({ title, partyType, partyId, onClose }: { title: string; partyType: 'customer' | 'supplier'; partyId: number; onClose: () => void }) {
  const [rows, setRows] = useState<CurrentAccountMovement[]>([]);
  const [message, setMessage] = useState('Hareketler yükleniyor.');

  useEffect(() => {
    let active = true;
    setMessage('Hareketler yükleniyor.');
    api.currentAccountPartyMovements(partyType === 'customer' ? 'CUSTOMER' : 'SUPPLIER', partyId).then((items) => {
      if (!active) return;
      setRows(items);
      setMessage(items.length ? '' : 'Hareket bulunamadı.');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : 'Hareketler yüklenemedi.');
    });
    return () => { active = false; };
  }, [partyId, partyType]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="panel modal-card receipt-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-title-row">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose}>Kapat</button>
        </div>
        {message ? <p className="message">{message}</p> : null}
        <DataTable
          title="Cari Hareketler"
          rows={rows}
          columns={[
            { label: 'Belge no', render: (row) => row.documentNo },
            { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
            { label: 'Tip', render: (row) => <span className={currentAccountBadgeClass(row.documentType)}>{currentAccountTypeLabel(row.documentType)}</span> },
            { label: 'Yön', render: (row) => currentAccountDirectionLabel(row.direction) },
            { label: 'Belge tutarı', render: (row) => money(row.documentAmount ?? row.amount, row.documentCurrency ?? row.currency) },
            { label: 'Cari tutar', render: (row) => money(row.accountAmount ?? row.amount, row.accountCurrency ?? row.currency) },
            { label: 'Açıklama', render: (row) => row.description ?? '-' },
          ]}
        />
      </section>
    </div>
  );
}

function PartyDetail({ title, party, receipts, onClose, receiptLabel, movementType }: { title: string; party: Customer | Supplier; receipts: Array<SalesReceipt | PurchaseReceipt>; onClose: () => void; receiptLabel: string; movementType: string }) {
  const recentReceipts = receipts.slice(0, 5);
  return (
    <section className="panel detail-panel">
      <div className="panel-title-row">
        <div>
          <h2>{title}</h2>
          <p>{party.phone ?? 'Telefon yok'}</p>
        </div>
        <button type="button" className="ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="detail-grid">
        <Info label="Varsayilan para" value={party.defaultCurrency ?? 'TRY'} />
        <Info label="TL bakiye" value={money(party.balanceTry ?? party.balance, 'TRY')} />
        <Info label="USD bakiye" value={money(party.balanceUsd ?? 0, 'USD')} />
        <Info label="EUR bakiye" value={money(party.balanceEur ?? 0, 'EUR')} />
      </div>
      <h3>{receiptLabel}</h3>
      <MiniList
        empty="Fiş yok."
        rows={recentReceipts.map((receipt) => ({
          title: receipt.documentNo,
          meta: `${dateLabel(receipt.createdAt)} / ${movementType}`,
          value: money(receipt.totalAmount, receipt.currency),
        }))}
      />
      <h3>Son hareketler</h3>
      <MiniList
        empty="Hareket yok."
        rows={recentReceipts.map((receipt) => ({
          title: `${movementType} hareketi`,
          meta: receipt.documentNo,
          value: money(receipt.totalAmount, receipt.currency),
        }))}
      />
    </section>
  );
}

function PartyModal({ title, party, type, onSaved, onDone }: { title: string; party: Customer | Supplier | null; type: 'customer' | 'supplier'; onSaved: () => Promise<void>; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', defaultCurrency: 'TRY' as 'TRY' | 'USD' | 'EUR', active: true });
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(party ? { name: party.name, phone: party.phone ?? '', defaultCurrency: party.defaultCurrency ?? 'TRY', active: party.active } : { name: '', phone: '', defaultCurrency: 'TRY', active: true });
    setMessage('');
    setDirty(false);
  }, [party]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm('Kaydedilmemis degisiklikler var. Kapatilsin mi?')) return;
    onDone();
  }, [dirty, onDone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (type === 'customer') {
        if (party) await api.updateCustomer(party.id, form);
        else await api.createCustomer({ name: form.name, phone: form.phone, defaultCurrency: form.defaultCurrency });
      } else if (party) await api.updateSupplier(party.id, form);
      else await api.createSupplier({ name: form.name, phone: form.phone, defaultCurrency: form.defaultCurrency });
      await onSaved();
      setDirty(false);
      onDone();
      setMessage('Kart kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kayıt başarısız.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <form className="panel form-panel modal-card party-modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{type === 'customer' ? 'Müşteri karti' : 'Tedarikçi karti'}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ghost" onClick={requestClose}>Vazgec</button>
        </div>
        <div className="form-grid modal-form-grid">
          <Field label="Ad" value={form.name} onChange={(name) => updateForm('name', name)} />
          <Field label="Telefon" value={form.phone} onChange={(phone) => updateForm('phone', phone)} />
          <label>
            <span>Cari para birimi</span>
            <select value={form.defaultCurrency} onChange={(event) => updateForm('defaultCurrency', event.target.value as 'TRY' | 'USD' | 'EUR')}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} /> Aktif</label>
        </div>
        <div className="balance-preview">
          <Info label="TL bakiye" value={money(party?.balanceTry ?? party?.balance ?? 0, 'TRY')} />
          <Info label="USD bakiye" value={money(party?.balanceUsd ?? 0, 'USD')} />
          <Info label="EUR bakiye" value={money(party?.balanceEur ?? 0, 'EUR')} />
        </div>
        {message ? <p className="message">{message}</p> : null}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={requestClose}>Vazgec</button>
          <button className="primary">Kaydet</button>
        </div>
      </form>
    </div>
  );
}

function PurchaseReceiptView({ products, suppliers, receipts, exchangeRate, role, onSaved, startOpen = false }: { products: Product[]; suppliers: Supplier[]; receipts: PurchaseReceipt[]; exchangeRate: ExchangeRate | null; role: UserRole; onSaved: () => Promise<void>; startOpen?: boolean }) {
  const [selected, setSelected] = useState<PurchaseReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(startOpen);
  const [editingReceipt, setEditingReceipt] = useState<PurchaseReceipt | null>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('all');
  const [currency, setCurrency] = useState<'all' | Currency>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CANCELLED'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [message, setMessage] = useState('');
  const canCreateReceipt = hasPermission(role, 'purchaseCreate');
  const normalizedSearch = normalize(search);
  const filteredReceipts = receipts.filter((receipt) => {
    const receiptDate = new Date(receipt.createdAt);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const matchesSearch = !normalizedSearch || [receipt.documentNo, receipt.supplier?.name, receipt.note].some((value) => normalize(value).includes(normalizedSearch));
    const matchesSupplier = supplierId === 'all' || receipt.supplier?.id === Number(supplierId);
    const matchesCurrency = currency === 'all' || documentCurrencyOf(receipt) === currency;
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter || (statusFilter === 'CANCELLED' && receipt.cancelled);
    const matchesDate = (!fromDate || receiptDate >= fromDate) && (!toDate || receiptDate <= toDate);
    return matchesSearch && matchesSupplier && matchesCurrency && matchesStatus && matchesDate;
  });
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + Number(totalTryOf(receipt)), 0);
  const loadDetail = async (receipt: PurchaseReceipt) => {
    setMessage('Alış fişi detayı yükleniyor.');
    try {
      setSelected(await api.purchaseReceipt(receipt.id));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Alış fişi detayı yüklenemedi.');
      setSelected(receipt);
    }
  };
  return (
    <div className="stack purchase-screen">
      <ModuleHeader title="Alış Fişleri" subtitle="Tedarikçi giriş belgeleri, stok girişi ve borç etkisi" count={filteredReceipts.length} />
      <section className="panel receipt-filter-panel">
        <div className="panel-title-row">
          <div>
            <h2>Alış Fişi Arama</h2>
            <p>Tarih, tedarikçi, para birimi ve fiş durumuna göre listele.</p>
          </div>
          {canCreateReceipt ? <button type="button" className="primary" onClick={() => setReceiptModalOpen(true)}>Yeni Alış Fişi</button> : null}
        </div>
        <div className="receipt-filter-grid">
          <Field label="Fiş / tedarikçi ara" value={search} onChange={setSearch} required={false} />
          <label>
            <span>Başlangıç</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            <span>Tedarikçi</span>
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="all">Tümü</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label>
            <span>Para</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as 'all' | Currency)}>
              <option value="all">Tümü</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            <span>Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Tümü</option>
              <option value="ACTIVE">Aktif</option>
              <option value="CANCELLED">İptal</option>
            </select>
          </label>
        </div>
      </section>
      <div className="receipt-summary-strip">
        <Info label="Listelenen fiş" value={filteredReceipts.length} />
        <Info label="Toplam" value={money(totalAmount, 'TRY')} />
        <Info label="Aktif fiş" value={filteredReceipts.filter((receipt) => !receipt.cancelled && receipt.status !== 'CANCELLED').length} />
        <Info label="İptal fiş" value={filteredReceipts.filter((receipt) => receipt.cancelled || receipt.status === 'CANCELLED').length} />
      </div>
      {message ? <p className="message">{message}</p> : null}
      <DataTable
        title="Alış Fişleri"
        rows={filteredReceipts}
        columns={[
          { label: 'Fiş No', render: (row) => row.documentNo },
          { label: 'Tedarikçi', render: (row) => row.supplier?.name ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Belge Para Birimi', render: (row) => <CurrencyBadge value={documentCurrencyOf(row)} /> },
          { label: 'Belge Toplam', render: (row) => money(originalTotalOf(row), documentCurrencyOf(row)) },
          { label: 'TRY Karşılığı', render: (row) => money(totalTryOf(row), 'TRY') },
          { label: 'Durum', render: (row) => receiptStatusLabel(row) },
          { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => void loadDetail(row)}>Detay</button> },
        ]}
      />
      {receiptModalOpen ? <ReceiptModal mode="purchase" products={products} parties={suppliers} exchangeRate={exchangeRate} onSaved={onSaved} onDone={() => { setReceiptModalOpen(false); setEditingReceipt(null); }} initialReceipt={editingReceipt} /> : null}
      {selected ? <PurchaseReceiptDetail receipt={selected} role={role} onClose={() => setSelected(null)} onCancelled={onSaved} onEdit={() => { setEditingReceipt(selected); setReceiptModalOpen(true); setSelected(null); }} /> : null}
    </div>
  );
}

function PurchaseReceiptDetail({ receipt, role, onClose, onCancelled, onEdit }: { receipt: PurchaseReceipt; role: UserRole; onClose: () => void; onCancelled: () => Promise<void>; onEdit: () => void }) {
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState('');
  const isCancelled = receipt.cancelled || receipt.status === 'CANCELLED';
  const canCancel = hasPermission(role, 'purchaseCancel');
  const canEdit = hasPermission(role, 'purchaseCreate') && !isCancelled;
  const totalQuantity = receipt.totals?.totalQuantity ?? (receipt.items ?? []).reduce((sum, item) => sum + Number(item.quantity), 0);
  const documentCurrency = documentCurrencyOf(receipt);
  const subtotal = Number(receipt.originalTotal ?? receipt.totals?.subtotal ?? receipt.totalAmount ?? 0);
  const vat = Number(receipt.totals?.vat ?? 0);
  const grandTotal = Number(receipt.originalTotal ?? receipt.totals?.grandTotal ?? receipt.totalAmount ?? 0);
  const supplier = receipt.supplier;

  const cancelReceipt = async () => {
    setMessage('');
    const reason = cancelReason.trim();
    if (!reason) {
      setMessage('İptal nedeni gerekli.');
      return;
    }
    try {
      await api.cancelPurchaseReceipt(receipt.id, reason);
      await onCancelled();
      setMessage('Alış fişi iptal edildi. Stok ve tedarikçi borcu ters işlendi.');
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Alış fişi iptal edilemedi.'));
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="panel detail-panel modal-card receipt-detail-modal purchase-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-title-row receipt-detail-head">
          <div>
            <h2>Alış Fişi Detayı</h2>
            <p>{receipt.documentNo} / {supplier?.name ?? '-'} / {dateLabel(receipt.createdAt)}</p>
          </div>
          <div className="action-buttons">
            {canEdit ? <button type="button" className="primary" onClick={onEdit}>Düzenle</button> : null}
            <button type="button" className="ghost" onClick={onClose}>Kapat</button>
          </div>
        </div>
        <div className="purchase-detail-layout">
          <div className="purchase-detail-main">
            <div className="receipt-detail-section">
              <div className="section-caption">Fiş Bilgileri</div>
              <div className="detail-grid receipt-info-grid">
                <Info label="Fiş No" value={receipt.documentNo} />
                <Info label="Tedarikçi" value={supplier?.name ?? '-'} />
                <Info label="Tarih" value={dateLabel(receipt.createdAt)} />
                <Info label="Belge Para Birimi" value={<CurrencyBadge value={documentCurrency} />} />
                <Info label="Belge Toplam" value={money(originalTotalOf(receipt), documentCurrency)} />
                <Info label="TRY Karşılığı" value={money(totalTryOf(receipt), 'TRY')} />
                <Info label="Durum" value={receiptStatusLabel(receipt)} />
                <Info label="Not" value={receipt.note ?? '-'} />
              </div>
            </div>
            <div className="receipt-detail-section">
              <div className="section-caption">Ürün Satırları</div>
              <DataTable
                title="Alış Satırları"
                rows={receipt.items ?? []}
                columns={[
                  { label: 'Barkod', render: (row) => row.product?.barcode ?? '-' },
                  { label: 'Stok kodu', render: (row) => row.product?.stockCode ?? '-' },
                  { label: 'Ürün', render: (row) => row.product ? `${row.product.brand} ${row.product.typeName}` : '-' },
                  { label: 'Adet', render: (row) => row.quantity },
                  { label: 'Satır para', render: (row) => <CurrencyBadge value={row.lineCurrency ?? documentCurrency} /> },
                  { label: 'Alış fiyatı', render: (row) => money(row.unitPriceOriginal ?? row.unitPrice, row.lineCurrency ?? documentCurrency) },
                  { label: 'Satır toplamı', render: (row) => money(row.lineTotalOriginal ?? row.lineTotal, row.lineCurrency ?? documentCurrency) },
                  { label: 'TRY karşılığı', render: (row) => money(row.lineTotalTry ?? row.lineTotal, 'TRY') },
                ]}
              />
            </div>
            <div className="receipt-detail-section">
              <div className="section-caption">Toplamlar</div>
              <div className="detail-grid receipt-total-grid">
                <Info label="Toplam adet" value={totalQuantity} />
                <Info label="Ara toplam" value={money(subtotal, documentCurrency)} />
                <Info label="KDV" value={money(vat, documentCurrency)} />
                <Info label="Genel toplam" value={money(grandTotal, documentCurrency)} />
                <Info label="TRY Karşılığı" value={money(totalTryOf(receipt), 'TRY')} />
              </div>
            </div>
          </div>
        </div>
        <div className="cancel-box">
          <div>
            <h3>Fiş İptali</h3>
            <p>Fiş silinmez. İptal işlemi stok ve tedarikçi borcu için ters hareket oluşturur.</p>
          </div>
          {isCancelled ? (
            <span className="cancelled-badge">Bu fiş iptal edilmiş</span>
          ) : !canCancel ? (
            <span className="cancelled-badge">Bu rol fiş iptal edemez</span>
          ) : (
            <div className="cancel-actions">
              <Field label="İptal nedeni" value={cancelReason} onChange={setCancelReason} />
              <button type="button" className="danger" onClick={cancelReceipt}>Fişi İptal Et</button>
            </div>
          )}
          {message ? <p className="message">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}

function SalesReceiptView({ products, customers, receipts, exchangeRate, role, onSaved, startOpen = false }: { products: Product[]; customers: Customer[]; receipts: SalesReceipt[]; exchangeRate: ExchangeRate | null; role: UserRole; onSaved: () => Promise<void>; startOpen?: boolean }) {
  const [selected, setSelected] = useState<SalesReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(startOpen);
  const [editingReceipt, setEditingReceipt] = useState<SalesReceipt | null>(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('all');
  const [currency, setCurrency] = useState<'all' | Currency>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CANCELLED'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [message, setMessage] = useState('');
  const canCreateReceipt = hasPermission(role, 'salesCreate');
  const normalizedSearch = normalize(search);
  const filteredReceipts = receipts.filter((receipt) => {
    const receiptDate = new Date(receipt.createdAt);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const matchesSearch = !normalizedSearch || [receipt.documentNo, receipt.customer?.name, receipt.terminalId, receipt.localUuid].some((value) => normalize(value).includes(normalizedSearch));
    const matchesCustomer = customerId === 'all' || receipt.customer?.id === Number(customerId);
    const matchesCurrency = currency === 'all' || documentCurrencyOf(receipt) === currency;
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter || (statusFilter === 'CANCELLED' && receipt.cancelled);
    const matchesDate = (!fromDate || receiptDate >= fromDate) && (!toDate || receiptDate <= toDate);
    return matchesSearch && matchesCustomer && matchesCurrency && matchesStatus && matchesDate;
  });
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + Number(totalTryOf(receipt)), 0);

  const loadDetail = async (receipt: SalesReceipt) => {
    setMessage('Satış fişi detayı yükleniyor.');
    try {
      setSelected(await api.salesReceipt(receipt.id));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Satış fişi detayı yüklenemedi.');
      setSelected(receipt);
    }
  };

  return (
    <div className="stack sales-screen">
      <ModuleHeader title="Satış Fişleri" subtitle="Müşteri satış belgeleri, stok çıkışı ve cari hareket" count={filteredReceipts.length} />
      <section className="panel receipt-filter-panel">
        <div className="panel-title-row">
          <div>
            <h2>Satış Fişi Arama</h2>
            <p>Tarih, müşteri, para birimi ve fiş durumuna göre listele.</p>
          </div>
          {canCreateReceipt ? <button type="button" className="primary" onClick={() => setReceiptModalOpen(true)}>Yeni Satış Fişi</button> : null}
        </div>
        <div className="receipt-filter-grid">
          <Field label="Fiş / müşteri ara" value={search} onChange={setSearch} required={false} />
          <label>
            <span>Başlangıç</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            <span>Müşteri</span>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="all">Tümü</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <label>
            <span>Para</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as 'all' | Currency)}>
              <option value="all">Tümü</option>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            <span>Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Tümü</option>
              <option value="ACTIVE">Aktif</option>
              <option value="CANCELLED">İptal</option>
            </select>
          </label>
        </div>
      </section>
      <div className="receipt-summary-strip">
        <Info label="Listelenen fiş" value={filteredReceipts.length} />
        <Info label="Toplam" value={money(totalAmount, 'TRY')} />
        <Info label="Aktif fiş" value={filteredReceipts.filter((receipt) => !receipt.cancelled && receipt.status !== 'CANCELLED').length} />
        <Info label="İptal fiş" value={filteredReceipts.filter((receipt) => receipt.cancelled || receipt.status === 'CANCELLED').length} />
      </div>
      {message ? <p className="message">{message}</p> : null}
      <DataTable
        title="Satış Fişleri"
        rows={filteredReceipts}
        columns={[
          { label: 'Fiş No', render: (row) => row.documentNo },
          { label: 'Müşteri', render: (row) => row.customer?.name ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Belge Para Birimi', render: (row) => <CurrencyBadge value={documentCurrencyOf(row)} /> },
          { label: 'Belge Toplam', render: (row) => money(originalTotalOf(row), documentCurrencyOf(row)) },
          { label: 'TRY Karşılığı', render: (row) => money(totalTryOf(row), 'TRY') },
          { label: 'Durum', render: (row) => receiptStatusLabel(row) },
          { label: 'Detay', render: (row) => <button type="button" className="table-action" onClick={() => void loadDetail(row)}>Detay</button> },
        ]}
      />
      {receiptModalOpen ? <ReceiptModal mode="sales" products={products} parties={customers} exchangeRate={exchangeRate} onSaved={onSaved} onDone={() => { setReceiptModalOpen(false); setEditingReceipt(null); }} initialReceipt={editingReceipt} /> : null}
      {selected ? <ReceiptDetail title="Satış Fişi Detayı" mode="sales" receipt={selected} role={role} onClose={() => setSelected(null)} onCancelled={onSaved} onEdit={() => { setEditingReceipt(selected); setReceiptModalOpen(true); setSelected(null); }} /> : null}
    </div>
  );
}

function ReceiptDetail({ title, mode, receipt, role, onClose, onCancelled, onEdit }: { title: string; mode: 'purchase' | 'sales'; receipt: SalesReceipt | PurchaseReceipt; role: UserRole; onClose: () => void; onCancelled: () => Promise<void>; onEdit?: () => void }) {
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState('');
  const isCancelled = receipt.cancelled || receipt.status === 'CANCELLED';
  const canCancel = mode === 'sales' ? hasPermission(role, 'salesCancel') : hasPermission(role, 'purchaseCancel');
  const canEdit = !isCancelled && (mode === 'sales' ? hasPermission(role, 'salesCreate') : hasPermission(role, 'purchaseCreate'));

  const cancelReceipt = async () => {
    setMessage('');
    const reason = cancelReason.trim();
    if (!reason) {
      setMessage('İptal nedeni gerekli.');
      return;
    }
    try {
      if (mode === 'sales') await api.cancelSalesReceipt(receipt.id, reason);
      else await api.cancelPurchaseReceipt(receipt.id, reason);
      await onCancelled();
      setMessage('Fiş iptal edildi. Stok ve cari ters hareketleri olustu.');
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Fiş iptal edilemedi.'));
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="panel detail-panel modal-card receipt-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
      <div className="panel-title-row">
        <div>
          <h2>{title}</h2>
          <p>{receipt.documentNo} / {money(receipt.totalAmount, receipt.currency)} / {dateLabel(receipt.createdAt)}</p>
        </div>
        <div className="action-buttons">
          {canEdit && onEdit ? <button type="button" className="primary" onClick={onEdit}>Düzenle</button> : null}
          <button type="button" className="ghost" onClick={onClose}>Kapat</button>
        </div>
      </div>
      <div className="detail-grid">
        <Info label="Durum" value={receiptStatusLabel(receipt)} />
        <Info label={mode === 'sales' ? 'Müşteri' : 'Tedarikçi'} value={mode === 'sales' ? (receipt as SalesReceipt).customer?.name ?? '-' : (receipt as PurchaseReceipt).supplier?.name ?? '-'} />
        <Info label="Belge no" value={receipt.documentNo} />
        <Info label="Olusturma" value={dateLabel(receipt.createdAt)} />
        <Info label="İptal tarihi" value={receipt.cancelledAt ? dateLabel(receipt.cancelledAt) : '-'} />
        <Info label="İptal nedeni" value={receipt.cancelReason ?? '-'} />
        <Info label="Fiş para birimi" value={receipt.currency ?? 'TRY'} />
        <Info label="Toplam" value={money(receipt.totalAmount, receipt.currency)} />
        {mode === 'sales' ? <Info label="Terminal ID" value={(receipt as SalesReceipt).terminalId ?? '-'} /> : null}
        {mode === 'sales' ? <Info label="Local UUID" value={(receipt as SalesReceipt).localUuid ?? '-'} /> : null}
        <Info label="USD/TL snapshot" value={receipt.usdToTry ?? '-'} />
        <Info label="EUR/TL snapshot" value={receipt.eurToTry ?? '-'} />
        <Info label="EUR/USD snapshot" value={receipt.eurToUsd ?? '-'} />
      </div>
      <DataTable
        title="Fiş Satırları"
        rows={receipt.items ?? []}
        columns={[
          { label: 'Ürün', render: (row) => row.product ? `${row.product.stockCode} - ${row.product.typeName}` : '-' },
          { label: 'Adet', render: (row) => row.quantity },
          { label: mode === 'purchase' ? 'Orijinal alis fiyatı' : 'Orijinal fiyat', render: (row) => money(row.originalUnitPrice ?? row.unitPrice, row.originalCurrency ?? row.currency ?? receipt.currency) },
          { label: 'Orijinal para', render: (row) => row.originalCurrency ?? row.currency ?? receipt.currency ?? 'TRY' },
          { label: 'Kullanilan kur', render: (row) => exchangeRateUsedLabel(row) },
          { label: 'Donusmus fiyat', render: (row) => money(row.convertedUnitPrice ?? row.unitPrice, row.receiptCurrency ?? row.currency ?? receipt.currency) },
          { label: 'Satir toplami', render: (row) => money(row.lineTotal, row.receiptCurrency ?? row.currency ?? receipt.currency) },
        ]}
      />
      <div className="cancel-box">
        <div>
          <h3>Fiş İptali</h3>
          <p>Fiş silinmez. İptal işlemi stok ve cari için ters hareket oluşturur.</p>
        </div>
        {isCancelled ? (
          <span className="cancelled-badge">Bu fis iptal edilmis</span>
        ) : !canCancel ? (
          <span className="cancelled-badge">Bu rol fis iptal edemez</span>
        ) : (
          <div className="cancel-actions">
            <Field label="İptal nedeni" value={cancelReason} onChange={setCancelReason} />
            <button type="button" className="danger" onClick={cancelReceipt}>Fişi İptal Et</button>
          </div>
        )}
        {message ? <p className="message">{message}</p> : null}
      </div>
    </section>
    </div>
  );
}

function ReceiptModal({ mode, products, parties, exchangeRate, onSaved, onDone, initialReceipt = null }: { mode: 'purchase' | 'sales'; products: Product[]; parties: Array<Customer | Supplier>; exchangeRate: ExchangeRate | null; onSaved: () => Promise<void>; onDone: () => void; initialReceipt?: SalesReceipt | PurchaseReceipt | null }) {
  const [partyId, setPartyId] = useState('');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [items, setItems] = useState<ReceiptItemInput[]>([]);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const isEditing = Boolean(initialReceipt);

  const title = isEditing ? (mode === 'purchase' ? 'Alış Fişi Düzenle' : 'Satış Fişi Düzenle') : (mode === 'purchase' ? 'Yeni Alış Fişi' : 'Yeni Satış Fişi');
  const partyLabel = mode === 'purchase' ? 'Tedarikçi' : 'Müşteri';
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  const normalizedProductQuery = normalize(productQuery);
  const filteredProducts = products.filter((product) => {
    if (!normalizedProductQuery) return true;
    return [product.stockCode, product.barcode, product.brand, product.typeName].some((value) => normalize(value).includes(normalizedProductQuery));
  });

  const selectedProduct = products.find((product) => product.id === Number(productId));
  const selectedPrice = selectedProduct ? priceForReceipt(selectedProduct, mode, currency, exchangeRate) : null;

  useEffect(() => {
    if (!initialReceipt) {
      setPartyId('');
      setCurrency('TRY');
      setItems([]);
      setNote('');
      setDirty(false);
      return;
    }
    const nextPartyId = mode === 'purchase'
      ? String((initialReceipt as PurchaseReceipt).supplier?.id ?? (initialReceipt as PurchaseReceipt).header?.supplierId ?? '')
      : String((initialReceipt as SalesReceipt).customer?.id ?? '');
    setPartyId(nextPartyId);
    setCurrency(documentCurrencyOf(initialReceipt));
    setItems((initialReceipt.items ?? []).map((item) => ({
      productId: item.productId ?? item.product?.id ?? 0,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPriceOriginal ?? item.originalUnitPrice ?? item.unitPrice),
    })).filter((item) => item.productId > 0));
    setNote((initialReceipt as PurchaseReceipt).note ?? '');
    setProductId('');
    setProductQuery('');
    setQuantity(1);
    setDirty(false);
  }, [initialReceipt, mode]);

  useEffect(() => {
    if (!selectedProduct) return;
    setUnitPrice(priceForReceipt(selectedProduct, mode, currency, exchangeRate).amount);
  }, [currency, exchangeRate, mode, selectedProduct]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm('Kaydedilmemi? fi? bilgileri var. Kapat?ls?n m??')) return;
    onDone();
  }, [dirty, onDone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const selectParty = (nextPartyId: string) => {
    setPartyId(nextPartyId);
    const party = parties.find((candidate) => candidate.id === Number(nextPartyId));
    setCurrency(party?.defaultCurrency ?? 'TRY');
    setDirty(true);
  };

  const addItem = () => {
    if (!productId || quantity <= 0) return;
    const nextItem = { productId: Number(productId), quantity, unitPrice };
    setItems((current) => {
      const existing = current.find((item) => item.productId === nextItem.productId);
      if (!existing) return [...current, nextItem];
      return current.map((item) => item === existing ? { ...item, quantity: item.quantity + nextItem.quantity, unitPrice: nextItem.unitPrice } : item);
    });
    setProductId('');
    setProductQuery('');
    setQuantity(1);
    setDirty(true);
  };

  const updateItemQuantity = (item: ReceiptItemInput, nextQuantity: number) => {
    if (nextQuantity <= 0) return;
    setItems((current) => current.map((candidate) => candidate === item ? { ...candidate, quantity: nextQuantity } : candidate));
    setDirty(true);
  };

  const updateItemPrice = (item: ReceiptItemInput, nextUnitPrice: number) => {
    if (nextUnitPrice < 0) return;
    setItems((current) => current.map((candidate) => candidate === item ? { ...candidate, unitPrice: nextUnitPrice } : candidate));
    setDirty(true);
  };

  const removeItem = (item: ReceiptItemInput) => {
    setItems((current) => current.filter((candidate) => candidate !== item));
    setDirty(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!partyId || items.length === 0) {
      setMessage('Cari ve en az bir ürün satırı gerekli.');
      return;
    }
    try {
      if (mode === 'purchase') {
        const payload: PurchaseReceiptInput = { supplierId: Number(partyId), currency, items, note };
        if (initialReceipt) await api.updatePurchaseReceipt(initialReceipt.id, payload);
        else await api.createPurchaseReceipt(payload);
      } else {
        const payload: SalesReceiptInput = { customerId: Number(partyId), currency, items, note };
        if (initialReceipt) await api.updateSalesReceipt(initialReceipt.id, payload);
        else await api.createSalesReceipt(payload);
      }
      setItems([]);
      setNote('');
      await onSaved();
      setDirty(false);
      onDone();
    } catch (error) {
      setMessage(permissionDeniedMessage(error, 'Fiş kaydedilemedi.'));
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <form className="panel form-panel modal-card receipt-modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header receipt-modal-header">
          <div>
            <p className="eyebrow">{mode === 'purchase' ? 'Alış belgesi' : 'Satış belgesi'}</p>
            <h2>{title}</h2>
            <p>{isEditing ? 'Satır ekle, çıkar veya fiyat/adet değiştir.' : 'Stok ve bakiye hareketleri fiş kaydında oluşur.'}</p>
          </div>
          <strong className="total">Toplam {money(total, currency)}</strong>
        </div>
        <div className="form-grid compact">
          <label>
            <span>{partyLabel}</span>
            <select value={partyId} onChange={(event) => selectParty(event.target.value)}>
              <option value="">Se?iniz</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </label>
          <label>
            <span>Fiş para birimi</span>
            <select value={currency} onChange={(event) => { setCurrency(event.target.value as Currency); setDirty(true); }}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <Field label="Not" value={note} onChange={(value) => { setNote(value); setDirty(true); }} required={false} />
        </div>
        <div className="receipt-line">
          <Field label="Ürün / barkod ara" value={productQuery} onChange={(value) => { setProductQuery(value); setDirty(true); }} required={false} />
          <label>
            <span>Ürün</span>
            <select value={productId} onChange={(event) => { setProductId(event.target.value); setDirty(true); }}>
              <option value="">Ürün seç</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>{product.stockCode} - {product.barcode} - Stok {product.quantity}</option>
              ))}
            </select>
          </label>
          <NumberField label="Adet" value={quantity} onChange={(value) => { setQuantity(value); setDirty(true); }} />
          <NumberField label={mode === 'purchase' ? 'Alış fiyatı' : 'Satış fiyatı'} value={unitPrice} onChange={(value) => { setUnitPrice(value); setDirty(true); }} />
          <button type="button" className="dark" onClick={addItem} disabled={!productId || quantity <= 0}>Yeni Satır Ekle</button>
        </div>
        {selectedPrice?.converted ? <p className="notice">Ürünün {currency} fiyatı yok; TRY fiyatı aktif manuel kur ile çevrildi. Kullanılan kur: {selectedPrice.rateUsed.toFixed(6)}</p> : null}
        <div className="receipt-cart">
          <div className="panel-title-row">
            <h3>Fiş Satırları</h3>
            <span>{items.length} satır</span>
          </div>
          {items.length > 0 ? (
            <div className="table-wrap receipt-line-table">
              <table>
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Birim fiyat</th>
                    <th>Satır toplamı</th>
                    <th>Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    return (
                      <tr key={item.productId}>
                        <td>{product ? `${product.stockCode} - ${product.typeName}` : item.productId}</td>
                        <td><NumberField label="Adet" value={item.quantity} onChange={(value) => updateItemQuantity(item, value)} /></td>
                        <td><NumberField label="Birim fiyat" value={item.unitPrice} onChange={(value) => updateItemPrice(item, value)} /></td>
                        <td><strong>{money(item.quantity * item.unitPrice, currency)}</strong></td>
                        <td><button type="button" className="ghost" onClick={() => removeItem(item)}>Satırı Sil</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-text">Henüz fiş satırı yok. Ürün seçip Yeni Satır Ekle ile başlayın.</p>}
        </div>
        {message ? <p className="message">{message}</p> : null}
        <div className="modal-actions receipt-modal-actions">
          <strong className="total">Toplam {money(total, currency)}</strong>
          <button type="button" className="ghost" onClick={requestClose}>Vazge?</button>
          <button className="primary">{isEditing ? 'Değişiklikleri Kaydet' : 'Fişi Kaydet'}</button>
        </div>
      </form>
    </div>
  );
}

function HistoryView({ products }: { products: Product[] }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [message, setMessage] = useState('Hareketler yukleniyor.');
  const normalizedProductSearch = normalize(productSearch);
  const filteredProducts = products.filter((product) => !normalizedProductSearch || [product.stockCode, product.barcode, product.brand, product.typeName].some((value) => normalize(value).includes(normalizedProductSearch))).slice(0, 40);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (productId) query.set('productId', productId);
    if (movementType) query.set('movementType', movementType);
    if (dateFrom) query.set('dateFrom', new Date(dateFrom).toISOString());
    if (dateTo) query.set('dateTo', new Date(dateTo).toISOString());
    setMessage('Hareketler yukleniyor.');
    api.stockMovements(query.toString() ? `?${query.toString()}` : '').then((items) => {
      if (!active) return;
      setMovements(items);
      setMessage(items.length ? '' : 'Hareket bulunamadi.');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : 'Stok hareketleri yuklenemedi.');
    });
    return () => { active = false; };
  }, [dateFrom, dateTo, movementType, productId]);

  return (
    <section className="stack">
      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Stok Hareketleri</h2>
            <p>Backend stok hareketleri endpointinden gelen kayitlar.</p>
          </div>
          <span>{movements.length} hareket</span>
        </div>
        <div className="form-grid compact">
          <Field label="Ürün ara" value={productSearch} onChange={setProductSearch} required={false} />
          <label>
            <span>Ürün</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Tum ürünler</option>
              {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.stockCode} - {product.typeName}</option>)}
            </select>
          </label>
          <label>
            <span>Hareket tipi</span>
            <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
              <option value="">Tumu</option>
              <option value="PURCHASE_IN">PURCHASE_IN</option>
              <option value="SALE_OUT">SALE_OUT</option>
              <option value="CANCEL">CANCEL</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
          </label>
          <label>
            <span>Baslangic</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitis</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
      </div>
      <section className="panel">
      {message ? <p className="message">{message}</p> : null}
      <DataTable
        title="Hareket Geçmişi"
        rows={movements}
        columns={[
          { label: 'Ürün', render: (row) => `${row.productStockCode ?? row.productId} - ${row.productName ?? '-'}` },
          { label: 'Hareket tipi', render: (row) => <MovementBadge type={row.movementType} /> },
          { label: 'Adet', render: (row) => row.quantity },
          { label: 'Kaynak belge', render: (row) => row.documentNo ?? `${row.sourceDocumentType} #${row.sourceDocumentId}` },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
        ]}
      />
    </section>
    </section>
  );
}

function MovementBadge({ type }: { type: string }) {
  const className = type === 'SALE_OUT' ? 'badge badge-sale' : type === 'PURCHASE_IN' ? 'badge badge-purchase' : type === 'CANCEL' ? 'badge badge-cancel' : 'badge';
  return <span className={className}>{type}</span>;
}

function SystemStatusView({ status }: { status: SystemStatus | null }) {
  if (!status) {
    return (
      <section className="panel">
        <h2>Sistem Durumu</h2>
        <p>Veri yukleniyor.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="page-heading">
        <h2>Sistem Durumu</h2>
        <p>Canli kullanim hazirlik bilgileri</p>
      </div>
      <div className="detail-grid">
        <Info label="DB bağlantısi" value={status.databaseConnected ? 'OK' : 'DEGRADED'} />
        <Info label="App version" value={status.appVersion} />
        <Info label="Ortam" value={status.environment} />
        <Info label="Aktif kullanici" value={`${status.activeUser.name} / ${status.activeUser.role}`} />
      </div>
      <section className="panel">
        <div className="panel-title-row">
          <h2>Rol Hazirligi</h2>
          <span>Basit yetki matrisi</span>
        </div>
        <div className="role-grid">
          {Object.entries(status.roleRules).map(([role, rules]) => (
            <div className="info-card" key={role}>
              <span>{role}</span>
              <strong>{rules.join(' / ')}</strong>
            </div>
          ))}
        </div>
      </section>
      <DataTable
        title="Son Audit Kayıtlari"
        rows={status.recentAuditLogs}
        columns={[
          { label: 'Aksiyon', render: (row) => row.action },
          { label: 'Varlik', render: (row) => `${row.entityType} #${row.entityId}` },
          { label: 'Kullanıcı', render: (row) => row.user?.username ?? 'system' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
        ]}
      />
    </section>
  );
}

function UsersView({ users, onSaved }: { users: AppUser[]; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  return (
    <div className="stack">
      <UserForm user={editing} onSaved={onSaved} onDone={() => setEditing(null)} />
      {resetUser ? <PasswordResetForm user={resetUser} onSaved={onSaved} onDone={() => setResetUser(null)} /> : null}
      <DataTable
        title="Kullanıcılar"
        rows={users}
        columns={[
          { label: 'Ad', render: (row) => row.name },
          { label: 'Username', render: (row) => row.username },
          { label: 'Role', render: (row) => <RoleBadge role={row.role} /> },
          { label: 'Active', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'Created', render: (row) => row.createdAt ? dateLabel(row.createdAt) : '-' },
          { label: 'Islem', render: (row) => (
            <div className="action-buttons">
              <button type="button" className="table-action" onClick={() => setEditing(row)}>Duzenle</button>
              <button type="button" className="table-action" onClick={() => setResetUser(row)}>Sifre Reset</button>
              <button type="button" className="danger" disabled={!row.active} onClick={async () => { await api.deactivateUser(Number(row.id)); await onSaved(); }}>Pasif Yap</button>
            </div>
          ) },
        ]}
      />
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const className = role === 'ADMIN' ? 'badge-cancel' : role === 'MANAGER' ? 'badge-sale' : role === 'VIEWER' || role === 'STAFF' ? '' : 'badge-purchase';
  return <span className={`badge ${className}`}>{role}</span>;
}

function PermissionsPanel({ matrix }: { matrix: PermissionMatrix | null }) {
  const roles = roleOptions;
  const groups = matrix?.permissionGroups ?? permissionLabels;
  const matrixRules = matrix?.rolePermissions ?? frontendRolePermissions;
  const permissions = Object.entries(groups).filter(([code]) => code in permissionLabels) as Array<[PermissionCode, string]>;
  return (
    <section className="stack">
      <ModuleHeader title="Yetkiler" subtitle="Rol bazli temel işlem yetkileri" count={permissions.length} />
      <section className="panel">
        <div className="panel-title-row">
          <h2>Rol Matrisi</h2>
          <span>{matrix ? 'Backend matrisi' : 'Frontend matrisi'}</span>
        </div>
        <div className="role-chip-row">
          {roles.map((role) => <RoleBadge key={role} role={role} />)}
        </div>
      </section>
      <DataTable
        title="Yetki Tablosu"
        rows={permissions}
        columns={[
          { label: 'Yetki grubu', render: ([code, label]) => <div><strong>{permissionLabels[code] ?? label}</strong><span className="muted-cell">{code}</span></div> },
          ...roles.map((role) => ({
            label: role,
            render: ([code]: [PermissionCode, string]) => matrixRules[role]?.includes(code) ? <span className="permission-yes">Var</span> : <span className="permission-no">Yok</span>,
          })),
        ]}
      />
    </section>
  );
}

function UserForm({ user, onSaved, onDone }: { user: AppUser | null; onSaved: () => Promise<void>; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', username: '', role: 'VIEWER' as UserRole, password: '', active: true });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(user ? { name: user.name, username: user.username, role: user.role, password: '', active: user.active } : { name: '', username: '', role: 'VIEWER', password: '', active: true });
  }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (user) await api.updateUser(Number(user.id), { name: form.name, username: form.username, role: form.role, active: form.active });
      else await api.createUser(form);
      await onSaved();
      onDone();
      setMessage('Kullanıcı kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kullanıcı kaydedilemedi.');
    }
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title-row">
        <h2>{user ? 'Kullanıcı Duzenle' : 'Yeni Kullanıcı'}</h2>
        {user ? <button type="button" className="ghost" onClick={onDone}>Vazgec</button> : null}
      </div>
      <div className="form-grid compact">
        <Field label="Ad" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
        <label>
          <span>Role</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            {form.role === 'STAFF' ? <option value="STAFF">STAFF</option> : null}
          </select>
        </label>
        {!user ? <Field label="Gecici sifre" value={form.password} onChange={(password) => setForm({ ...form, password })} /> : null}
        <label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Aktif</label>
      </div>
      <button className="primary">Kaydet</button>
      {message ? <p className="message">{message}</p> : null}
    </form>
  );
}

function PasswordResetForm({ user, onSaved, onDone }: { user: AppUser; onSaved: () => Promise<void>; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.resetUserPassword(Number(user.id), password);
      await onSaved();
      onDone();
      setMessage('Sifre sifirlandi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sifre sifirlanamadi.');
    }
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title-row">
        <h2>Sifre Sifirla</h2>
        <button type="button" className="ghost" onClick={onDone}>Vazgec</button>
      </div>
      <p>{user.username} için yeni sifre girin.</p>
      <Field label="Yeni sifre" value={password} onChange={setPassword} />
      <button className="primary">Sifreyi Kaydet</button>
      {message ? <p className="message">{message}</p> : null}
    </form>
  );
}

function ExchangeRateView({ rate, rates, role, onSaved }: { rate: ExchangeRate | null; rates: ExchangeRate[]; role: UserRole; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(rateFormFrom(rate));
  const [message, setMessage] = useState('');
  const canUpdateRate = role === 'ADMIN' || role === 'MANAGER';

  useEffect(() => {
    setForm(rateFormFrom(rate));
  }, [rate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canUpdateRate) {
      setMessage('Bu rol kur degistiremez.');
      return;
    }
    await api.createExchangeRate(form);
    await onSaved();
    setMessage('Aktif kur guncellendi.');
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-title-row">
          <h2>Aktif Kur</h2>
          <span>{rate?.updatedAt ? dateLabel(rate.updatedAt) : 'Kayıt yok'}</span>
        </div>
        <div className="metric-grid narrow">
          <Metric label="USD/TL" value={Number(rate?.usdToTry ?? 0).toFixed(4)} />
          <Metric label="EUR/TL" value={Number(rate?.eurToTry ?? 0).toFixed(4)} />
          <Metric label="TRY/USD" value={Number(rate?.tryToUsd ?? (rate?.usdToTry ? 1 / Number(rate.usdToTry) : 0)).toFixed(6)} />
          <Metric label="TRY/EUR" value={Number(rate?.tryToEur ?? (rate?.eurToTry ? 1 / Number(rate.eurToTry) : 0)).toFixed(6)} />
          <Metric label="EUR/USD" value={Number(rate?.eurToUsd ?? 0).toFixed(4)} />
          <Metric label="USD/EUR" value={Number(rate?.usdToEur ?? 0).toFixed(4)} />
        </div>
        <p className="notice">Aktif kur degistiginde eski fisler degismez; fislerdeki kur snapshot sabit kalir.</p>
      </section>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="panel-title-row">
          <h2>Yeni Kur Gir</h2>
          <span>Manuel kur</span>
        </div>
        <div className="form-grid compact">
          <NumberField label="USD kuru" value={form.usdToTry} onChange={(usdToTry) => setForm({ ...form, usdToTry })} />
          <NumberField label="EUR kuru" value={form.eurToTry} onChange={(eurToTry) => setForm({ ...form, eurToTry })} />
          <NumberField label="TRY -> USD" value={form.tryToUsd} onChange={(tryToUsd) => setForm({ ...form, tryToUsd })} />
          <NumberField label="TRY -> EUR" value={form.tryToEur} onChange={(tryToEur) => setForm({ ...form, tryToEur })} />
          <NumberField label="EUR/USD" value={form.eurToUsd} onChange={(eurToUsd) => setForm({ ...form, eurToUsd })} />
          <NumberField label="USD/EUR" value={form.usdToEur} onChange={(usdToEur) => setForm({ ...form, usdToEur })} />
        </div>
        <button className="primary" disabled={!canUpdateRate}>Güncelle</button>
        {!canUpdateRate ? <p className="message">STAFF rolu kur degistiremez.</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </form>
      <DataTable
        title="Kur Geçmişi"
        rows={rates}
        columns={[
          { label: 'USD/TL', render: (row) => row.usdToTry },
          { label: 'EUR/TL', render: (row) => row.eurToTry },
          { label: 'TRY/USD', render: (row) => row.tryToUsd ?? '-' },
          { label: 'TRY/EUR', render: (row) => row.tryToEur ?? '-' },
          { label: 'EUR/USD', render: (row) => row.eurToUsd ?? '-' },
          { label: 'USD/EUR', render: (row) => row.usdToEur ?? '-' },
          { label: 'Durum', render: (row) => row.active ? 'Aktif' : 'Pasif' },
          { label: 'Gecerlilik', render: (row) => row.effectiveDate ? dateLabel(row.effectiveDate) : '-' },
        ]}
      />
    </div>
  );
}

function Field({ label, value, onChange, required = true }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} required />
    </label>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionButtons({ onDetail, onEdit }: { onDetail: () => void; onEdit?: () => void }) {
  return (
    <div className="action-buttons">
      <button type="button" className="table-action" onClick={onDetail}>Detay</button>
      {onEdit ? <button type="button" className="table-action" onClick={onEdit}>Duzenle</button> : null}
    </div>
  );
}

function PartyActions({ onDetail, onMovements, onEdit }: { onDetail: () => void; onMovements: () => void; onEdit?: () => void }) {
  return (
    <div className="action-buttons">
      <button type="button" className="table-action" onClick={onDetail}>Detay</button>
      <button type="button" className="table-action" onClick={onMovements}>Hareketler</button>
      {onEdit ? <button type="button" className="table-action" onClick={onEdit}>Duzenle</button> : null}
    </div>
  );
}

function money(value: string | number | null | undefined, currency: Currency = 'TRY') {
  const amount = Number(value ?? 0);
  return `${currency} ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactNumber(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 1, notation: 'compact' });
}

function percent(value: string | number | null | undefined) {
  return `%${Number(value ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CurrencyBadge({ value }: { value?: Currency | null }) {
  return <span className="badge">{value ?? 'TRY'}</span>;
}

function currencyBalanceSummary(parties: Array<Customer | Supplier>) {
  return parties.reduce((totals, party) => ({
    try: totals.try + Number(party.balanceTry ?? party.balance ?? 0),
    usd: totals.usd + Number(party.balanceUsd ?? 0),
    eur: totals.eur + Number(party.balanceEur ?? 0),
  }), { try: 0, usd: 0, eur: 0 });
}

function documentCurrencyOf(receipt: { documentCurrency?: Currency; currency?: Currency }) {
  return receipt.documentCurrency ?? receipt.currency ?? 'TRY';
}

function originalTotalOf(receipt: { originalTotal?: string | number; totalAmount?: string | number }) {
  return receipt.originalTotal ?? receipt.totalAmount ?? 0;
}

function totalTryOf(receipt: { totalTry?: string | number; totalAmountTry?: string | number | null; totalAmount?: string | number }) {
  return receipt.totalTry ?? receipt.totalAmountTry ?? receipt.totalAmount ?? 0;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString('tr-TR');
}

function normalize(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR');
}

function rateLabel(row: { usdToTry?: string | number; eurToTry?: string | number; eurToUsd?: string | number | null }) {
  return `USD/TL ${Number(row.usdToTry ?? 0).toFixed(2)} - EUR/TL ${Number(row.eurToTry ?? 0).toFixed(2)}${row.eurToUsd ? ` - EUR/USD ${Number(row.eurToUsd).toFixed(3)}` : ''}`;
}

function exchangeRateUsedLabel(row: { exchangeRateUsed?: string | number | null; originalCurrency?: Currency | null; receiptCurrency?: Currency | null; currency?: Currency }) {
  const rate = Number(row.exchangeRateUsed ?? 1);
  const fromCurrency = row.originalCurrency ?? row.currency;
  const toCurrency = row.receiptCurrency ?? row.currency;
  if (!Number.isFinite(rate) || rate === 1 || fromCurrency === toCurrency) return 'Ayni para birimi';
  return `${fromCurrency ?? '-'} -> ${toCurrency ?? '-'} / ${rate.toFixed(6)}`;
}

function rateFormFrom(rate: ExchangeRate | null) {
  const usdToTry = Number(rate?.usdToTry ?? 30);
  const eurToTry = Number(rate?.eurToTry ?? 33);
  return {
    usdToTry,
    eurToTry,
    tryToUsd: Number(rate?.tryToUsd ?? 1 / usdToTry),
    tryToEur: Number(rate?.tryToEur ?? 1 / eurToTry),
    eurToUsd: Number(rate?.eurToUsd ?? eurToTry / usdToTry),
    usdToEur: Number(rate?.usdToEur ?? usdToTry / eurToTry),
  };
}

function receiptStatusLabel(receipt: { status?: 'ACTIVE' | 'CANCELLED'; cancelled?: boolean }) {
  return receipt.cancelled || receipt.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE';
}

function priceForReceipt(product: Product, mode: 'purchase' | 'sales', currency: Currency, rate: ExchangeRate | null) {
  const tryPrice = Number(mode === 'purchase' ? product.buyPriceTry ?? product.buyPrice : product.sellPriceTry ?? product.sellPrice);
  if (currency === 'TRY') return { amount: tryPrice, converted: false, rateUsed: 1 };
  const directPrice = mode === 'purchase'
    ? (currency === 'USD' ? product.buyPriceUsd : product.buyPriceEur)
    : (currency === 'USD' ? product.sellPriceUsd : product.sellPriceEur);
  if (directPrice != null) return { amount: Number(directPrice), converted: false, rateUsed: 1 };
  const fallbackRate = currency === 'USD'
    ? Number(rate?.tryToUsd ?? (rate?.usdToTry ? 1 / Number(rate.usdToTry) : 0))
    : Number(rate?.tryToEur ?? (rate?.eurToTry ? 1 / Number(rate.eurToTry) : 0));
  return { amount: fallbackRate > 0 ? tryPrice * fallbackRate : tryPrice, converted: fallbackRate > 0, rateUsed: fallbackRate || 1 };
}

const demoProducts: Product[] = [
  { id: 1, stockCode: 'MB-1001', barcode: '8690000001001', brand: 'Melisa Bebe', typeName: 'Bebek Takim', quantity: 24, buyPrice: 120, sellPrice: 199, buyPriceUsd: 4, buyPriceEur: 3.6, sellPriceUsd: 6.7, sellPriceEur: 6.1, active: true },
  { id: 2, stockCode: 'MB-1002', barcode: '8690000001002', brand: 'Melisa Bebe', typeName: 'Hastane Çıkışi', quantity: 18, buyPrice: 180, sellPrice: 289, buyPriceUsd: 6, buyPriceEur: 5.5, sellPriceUsd: 9.7, sellPriceEur: 8.8, active: true },
];

const demoCustomers: Customer[] = [
  { id: 1, name: 'ABC Baby Store', phone: '02120000001', balance: 0, active: true },
  { id: 2, name: 'Mini Kids', phone: '02120000002', balance: 0, active: true },
];

const demoSuppliers: Supplier[] = [
  { id: 1, name: 'Melisa Merkez Depo', phone: '02120000010', balance: 0, active: true },
];

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
