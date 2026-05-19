import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataTable } from './components/DataTable';
import { api, clearAuthToken, getAuthToken, getStoredUser, setAuthToken, setStoredUser } from './services/api';
import type { AppUser, Currency, Customer, DashboardStats, ExchangeRate, PartyMovement, Product, PurchaseReceipt, ReceiptItemInput, SalesReceipt, StockMovement, Supplier, SystemStatus, UserRole } from './types';
import './styles.css';

type Tab = 'dashboard' | 'products' | 'customers' | 'suppliers' | 'purchase' | 'sales' | 'rates' | 'history' | 'system' | 'users';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Stok Kartlari' },
  { id: 'customers', label: 'Musteriler' },
  { id: 'suppliers', label: 'Tedarikciler' },
  { id: 'purchase', label: 'Urun Giris Fisi' },
  { id: 'sales', label: 'Satis Fisi' },
  { id: 'rates', label: 'Kur Yonetimi' },
  { id: 'history', label: 'Hareket Gecmisi' },
  { id: 'system', label: 'Sistem Durumu' },
  { id: 'users', label: 'Kullanicilar' },
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

function App() {
  const [token, setToken] = useState(() => getAuthToken() ?? '');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salesReceipts, setSalesReceipts] = useState<SalesReceipt[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const currentRole: UserRole = currentUser?.role ?? systemStatus?.activeUser.role ?? 'ADMIN';
  const [status, setStatus] = useState('Veri yukleniyor');

  const refresh = async () => {
    if (!getAuthToken()) return;
    try {
      const canViewSystem = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
      const canManageUsers = currentUser?.role === 'ADMIN';
      const [nextProducts, nextCustomers, nextSuppliers, nextStats, nextSalesReceipts, nextPurchaseReceipts, nextRate, nextRates, nextSystemStatus, nextUsers] = await Promise.all([
        api.products(),
        api.customers(),
        api.suppliers(),
        api.dashboardStats(),
        api.salesReceipts(),
        api.purchaseReceipts(),
        api.activeExchangeRate(),
        api.exchangeRates(),
        canViewSystem ? api.systemStatus() : Promise.resolve(null),
        canManageUsers ? api.users() : Promise.resolve([]),
      ]);
      setProducts(nextProducts);
      setCustomers(nextCustomers);
      setSuppliers(nextSuppliers);
      setSalesReceipts(nextSalesReceipts);
      setPurchaseReceipts(nextPurchaseReceipts);
      setStats(nextStats);
      setExchangeRate(nextRate);
      setExchangeRates(nextRates);
      setSystemStatus(nextSystemStatus);
      setUsers(nextUsers);
      if (nextSystemStatus) setCurrentUser(nextSystemStatus.activeUser);
      setStatus('API baglantisi hazir');
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
  }, [token]);

  const login = async (username: string, password: string) => {
    const result = await api.login({ username, password });
    setAuthToken(result.token);
    setStoredUser(result.user);
    setToken(result.token);
    setCurrentUser(result.user);
    setStatus('API baglantisi hazir');
  };

  const logout = () => {
    clearAuthToken();
    setToken('');
    setCurrentUser(null);
    setSystemStatus(null);
  };

  if (!token) return <LoginView onLogin={login} />;

  return (
    <main className="app">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Melisa Bebe</p>
          <h1>Mini ERP</h1>
        </div>
        <div className="user-box">
          <strong>{currentUser?.name ?? systemStatus?.activeUser.name ?? 'Kullanici'}</strong>
          <span>{currentRole}</span>
          <button type="button" className="ghost" onClick={logout}>Cikis Yap</button>
        </div>
        <nav>
          {tabs.filter((tab) => tab.id !== 'users' || currentRole === 'ADMIN').map((tab) => (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <p className="status">{status}</p>
      </aside>
      <section className="content">
        {activeTab === 'dashboard' && <Dashboard stats={stats} products={products} salesReceipts={salesReceipts} purchaseReceipts={purchaseReceipts} />}
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
      setMessage(error instanceof Error ? error.message : 'Giris basarisiz.');
    }
  };

  return (
    <main className="login-page">
      <form className="panel login-panel" onSubmit={submit}>
        <p className="eyebrow">Melisa Bebe</p>
        <h1>Mini ERP Giriş</h1>
        <Field label="Kullanici adi" value={username} onChange={setUsername} />
        <label>
          <span>Sifre</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="primary">Giris Yap</button>
        {message ? <p className="message">{message}</p> : null}
      </form>
    </main>
  );
}

function Dashboard({ stats, products, salesReceipts, purchaseReceipts }: { stats: DashboardStats; products: Product[]; salesReceipts: SalesReceipt[]; purchaseReceipts: PurchaseReceipt[] }) {
  const lowStockProducts = products.filter((product) => Number(product.quantity) <= 5).slice(0, 8);
  const recentSales = salesReceipts.slice(0, 5);
  const recentPurchases = purchaseReceipts.slice(0, 5);
  return (
    <section className="stack">
      <div className="page-heading">
        <h2>Dashboard</h2>
        <p>Gunluk operasyon ozeti</p>
      </div>
      <div className="metric-grid">
        <Metric label="Toplam urun" value={stats.productCount} />
        <Metric label="Toplam musteri" value={stats.customerCount} />
        <Metric label="Toplam tedarikci" value={stats.supplierCount} />
        <Metric label="Bugunku satis" value={stats.todaySales} />
        <Metric label="Toplam satis" value={stats.totalSales} />
        <Metric label="Son satis" value={stats.lastSale ? `${stats.lastSale.documentNo} / ${money(stats.lastSale.totalAmount, stats.lastSale.currency)}` : '-'} />
        <Metric label="Bekleyen terminal fisi" value={stats.pendingTerminalReceipts} />
      </div>
      <div className="summary-grid">
        <CurrencySummary title="Para birimi bazli alacak" labels={['TL alacak', 'USD alacak', 'EUR alacak']} totals={stats.receivables} />
        <CurrencySummary title="Para birimi bazli tedarikci borcu" labels={['TL borc', 'USD borc', 'EUR borc']} totals={stats.supplierPayables} />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title-row">
            <h2>Dusuk Stoklu Urunler</h2>
            <span>{lowStockProducts.length} kayit</span>
          </div>
          <MiniList
            empty="Dusuk stoklu urun yok."
            rows={lowStockProducts.map((product) => ({
              title: product.stockCode,
              meta: `${product.brand} / ${product.typeName}`,
              value: `Stok ${product.quantity}`,
            }))}
          />
        </section>
        <section className="panel">
          <div className="panel-title-row">
            <h2>Son 5 Satis Fisi</h2>
            <span>{recentSales.length} kayit</span>
          </div>
          <MiniList
            empty="Satis fisi yok."
            rows={recentSales.map((receipt) => ({
              title: receipt.documentNo,
              meta: `${receipt.customer?.name ?? '-'} / ${dateLabel(receipt.createdAt)}`,
              value: money(receipt.totalAmount, receipt.currency),
            }))}
          />
        </section>
        <section className="panel">
          <div className="panel-title-row">
            <h2>Son 5 Alis Fisi</h2>
            <span>{recentPurchases.length} kayit</span>
          </div>
          <MiniList
            empty="Alis fisi yok."
            rows={recentPurchases.map((receipt) => ({
              title: receipt.documentNo,
              meta: `${receipt.supplier?.name ?? '-'} / ${dateLabel(receipt.createdAt)}`,
              value: money(receipt.totalAmount, receipt.currency),
            }))}
          />
        </section>
      </div>
    </section>
  );
}

function CurrencySummary({ title, labels, totals }: { title: string; labels: [string, string, string]; totals?: { try: number; usd: number; eur: number } }) {
  return (
    <section className="panel compact-panel">
      <h2>{title}</h2>
      <div className="currency-summary">
        <Metric label={labels[0]} value={money(totals?.try ?? 0, 'TRY')} />
        <Metric label={labels[1]} value={money(totals?.usd ?? 0, 'USD')} />
        <Metric label={labels[2]} value={money(totals?.eur ?? 0, 'EUR')} />
      </div>
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
        <label className="check-field"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} /> Dusuk stok</label>
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
          { label: 'Alis', render: (row) => row.buyPrice },
          { label: 'Alis USD', render: (row) => row.buyPriceUsd ?? '-' },
          { label: 'Alis EUR', render: (row) => row.buyPriceEur ?? '-' },
          { label: 'Satis', render: (row) => row.sellPrice },
          { label: 'Satis USD', render: (row) => row.sellPriceUsd ?? '-' },
          { label: 'Satis EUR', render: (row) => row.sellPriceEur ?? '-' },
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
      setMessage(error instanceof Error ? error.message : 'Kayit basarisiz.');
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
            <h3>Alis fiyatlari</h3>
            <div className="form-grid compact">
              <NumberField label="TRY alis fiyati" value={form.buyPrice} onChange={(buyPrice) => updateForm('buyPrice', buyPrice)} />
              <NumberField label="USD alis fiyati" value={form.buyPriceUsd} onChange={(buyPriceUsd) => updateForm('buyPriceUsd', buyPriceUsd)} />
              <NumberField label="EUR alis fiyati" value={form.buyPriceEur} onChange={(buyPriceEur) => updateForm('buyPriceEur', buyPriceEur)} />
            </div>
          </section>
          <section className="price-group">
            <h3>Satis fiyatlari</h3>
            <div className="form-grid compact">
              <NumberField label="TRY satis fiyati" value={form.sellPrice} onChange={(sellPrice) => updateForm('sellPrice', sellPrice)} />
              <NumberField label="USD satis fiyati" value={form.sellPriceUsd} onChange={(sellPriceUsd) => updateForm('sellPriceUsd', sellPriceUsd)} />
              <NumberField label="EUR satis fiyati" value={form.sellPriceEur} onChange={(sellPriceEur) => updateForm('sellPriceEur', sellPriceEur)} />
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
          <h2>Musteriler</h2>
          <p>Musteri kartlarini ara, filtrele ve cari bakiyelerini izle.</p>
        </div>
        {canManageParties ? <button type="button" className="primary" onClick={() => setPartyModal({ party: null })}>Yeni Musteri</button> : null}
      </div>
      <PartyFilters search={search} onSearch={setSearch} currencyFilter={currencyFilter} onCurrencyFilter={setCurrencyFilter} />
      <DataTable
        title="Musteriler"
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
      {partyModal ? <PartyModal title={partyModal.party ? 'Musteri Duzenle' : 'Yeni Musteri'} party={partyModal.party} type="customer" onSaved={onSaved} onDone={() => setPartyModal(null)} /> : null}
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
          <h2>Tedarikciler</h2>
          <p>Tedarikci kartlarini ara, filtrele ve cari borclari izle.</p>
        </div>
        {canManageParties ? <button type="button" className="primary" onClick={() => setPartyModal({ party: null })}>Yeni Tedarikci</button> : null}
      </div>
      <PartyFilters search={search} onSearch={setSearch} currencyFilter={currencyFilter} onCurrencyFilter={setCurrencyFilter} />
      <DataTable
        title="Tedarikciler"
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
      {partyModal ? <PartyModal title={partyModal.party ? 'Tedarikci Duzenle' : 'Yeni Tedarikci'} party={partyModal.party} type="supplier" onSaved={onSaved} onDone={() => setPartyModal(null)} /> : null}
      {movementSupplier ? <PartyMovementsModal title={`${movementSupplier.name} Hareketleri`} partyType="supplier" partyId={movementSupplier.id} onClose={() => setMovementSupplier(null)} /> : null}
      {selected ? <SupplierDetail supplier={selected} receipts={purchaseReceipts.filter((receipt) => receipt.supplier?.id === selected.id)} onClose={() => setSelected(null)} /> : null}
    </div>
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
    <PartyDetail title={customer.name} party={customer} receipts={receipts} onClose={onClose} receiptLabel="Son satis fisleri" movementType="Satis" />
  );
}

function SupplierDetail({ supplier, receipts, onClose }: { supplier: Supplier; receipts: PurchaseReceipt[]; onClose: () => void }) {
  return (
    <PartyDetail title={supplier.name} party={supplier} receipts={receipts} onClose={onClose} receiptLabel="Son alis fisleri" movementType="Alis" />
  );
}

function PartyMovementsModal({ title, partyType, partyId, onClose }: { title: string; partyType: 'customer' | 'supplier'; partyId: number; onClose: () => void }) {
  const [rows, setRows] = useState<PartyMovement[]>([]);
  const [message, setMessage] = useState('Hareketler yukleniyor.');

  useEffect(() => {
    let active = true;
    setMessage('Hareketler yukleniyor.');
    const load = partyType === 'customer' ? api.customerMovements(partyId) : api.supplierMovements(partyId);
    load.then((items) => {
      if (!active) return;
      setRows(items);
      setMessage(items.length ? '' : 'Hareket bulunamadi.');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : 'Hareketler yuklenemedi.');
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
            { label: 'Tutar', render: (row) => money(row.amount, row.currency) },
            { label: 'Para', render: (row) => row.currency },
            { label: 'Tip', render: (row) => <span className={row.type === 'SALE' ? 'badge badge-sale' : 'badge badge-purchase'}>{row.type}</span> },
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
        empty="Fis yok."
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
      setMessage(error instanceof Error ? error.message : 'Kayit basarisiz.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <form className="panel form-panel modal-card party-modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{type === 'customer' ? 'Musteri karti' : 'Tedarikci karti'}</p>
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

function PurchaseReceiptView({ products, suppliers, receipts, exchangeRate, role, onSaved }: { products: Product[]; suppliers: Supplier[]; receipts: PurchaseReceipt[]; exchangeRate: ExchangeRate | null; role: UserRole; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState<PurchaseReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const canCreateReceipt = role === 'ADMIN' || role === 'MANAGER';
  return (
    <div className="stack">
      <div className="panel panel-title-row">
        <div>
          <h2>Alis Fisleri</h2>
          <p>Tedarikci giris belgelerini goruntule ve yeni alis fisi olustur.</p>
        </div>
        {canCreateReceipt ? <button type="button" className="primary" onClick={() => setReceiptModalOpen(true)}>Yeni Alis Fisi</button> : null}
      </div>
      <DataTable
        title="Alis Fisleri"
        rows={receipts}
        columns={[
          { label: 'Belge', render: (row) => row.documentNo },
          { label: 'Tedarikci', render: (row) => row.supplier?.name ?? '-' },
          { label: 'Tutar', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Para', render: (row) => row.currency ?? 'TRY' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Durum', render: (row) => receiptStatusLabel(row) },
          { label: 'Islem', render: (row) => <button type="button" className="table-action" onClick={() => setSelected(row)}>Detay</button> },
        ]}
      />
      {receiptModalOpen ? <ReceiptModal mode="purchase" products={products} parties={suppliers} exchangeRate={exchangeRate} onSaved={onSaved} onDone={() => setReceiptModalOpen(false)} /> : null}
      {selected ? <ReceiptDetail title="Alis Fisi Detayi" mode="purchase" receipt={selected} role={role} onClose={() => setSelected(null)} onCancelled={onSaved} /> : null}
    </div>
  );
}

function SalesReceiptView({ products, customers, receipts, exchangeRate, role, onSaved }: { products: Product[]; customers: Customer[]; receipts: SalesReceipt[]; exchangeRate: ExchangeRate | null; role: UserRole; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState<SalesReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const canCreateReceipt = role === 'ADMIN' || role === 'MANAGER';
  return (
    <div className="stack">
      <div className="panel panel-title-row">
        <div>
          <h2>Satis Fisleri</h2>
          <p>Musteri satis belgelerini goruntule ve yeni satis fisi olustur.</p>
        </div>
        {canCreateReceipt ? <button type="button" className="primary" onClick={() => setReceiptModalOpen(true)}>Yeni Satis Fisi</button> : null}
      </div>
      <DataTable
        title="Satis Fisleri"
        rows={receipts}
        columns={[
          { label: 'Belge', render: (row) => row.documentNo },
          { label: 'Musteri', render: (row) => row.customer?.name ?? '-' },
          { label: 'Tutar', render: (row) => money(row.totalAmount, row.currency) },
          { label: 'Para', render: (row) => row.currency ?? 'TRY' },
          { label: 'Terminal', render: (row) => row.terminalId ?? '-' },
          { label: 'Local UUID', render: (row) => row.localUuid ?? '-' },
          { label: 'Tarih', render: (row) => dateLabel(row.createdAt) },
          { label: 'Durum', render: (row) => receiptStatusLabel(row) },
          { label: 'Islem', render: (row) => <button type="button" className="table-action" onClick={() => setSelected(row)}>Detay</button> },
        ]}
      />
      {receiptModalOpen ? <ReceiptModal mode="sales" products={products} parties={customers} exchangeRate={exchangeRate} onSaved={onSaved} onDone={() => setReceiptModalOpen(false)} /> : null}
      {selected ? <ReceiptDetail title="Satis Fisi Detayi" mode="sales" receipt={selected} role={role} onClose={() => setSelected(null)} onCancelled={onSaved} /> : null}
    </div>
  );
}

function ReceiptDetail({ title, mode, receipt, role, onClose, onCancelled }: { title: string; mode: 'purchase' | 'sales'; receipt: SalesReceipt | PurchaseReceipt; role: UserRole; onClose: () => void; onCancelled: () => Promise<void> }) {
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState('');
  const isCancelled = receipt.cancelled || receipt.status === 'CANCELLED';
  const canCancel = role === 'ADMIN' || role === 'MANAGER';

  const cancelReceipt = async () => {
    setMessage('');
    const reason = cancelReason.trim();
    if (!reason) {
      setMessage('Iptal nedeni gerekli.');
      return;
    }
    try {
      if (mode === 'sales') await api.cancelSalesReceipt(receipt.id, reason);
      else await api.cancelPurchaseReceipt(receipt.id, reason);
      await onCancelled();
      setMessage('Fis iptal edildi. Stok ve cari ters hareketleri olustu.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fis iptal edilemedi.');
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
        <button type="button" className="ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="detail-grid">
        <Info label="Durum" value={receiptStatusLabel(receipt)} />
        <Info label={mode === 'sales' ? 'Musteri' : 'Tedarikci'} value={mode === 'sales' ? (receipt as SalesReceipt).customer?.name ?? '-' : (receipt as PurchaseReceipt).supplier?.name ?? '-'} />
        <Info label="Belge no" value={receipt.documentNo} />
        <Info label="Olusturma" value={dateLabel(receipt.createdAt)} />
        <Info label="Iptal tarihi" value={receipt.cancelledAt ? dateLabel(receipt.cancelledAt) : '-'} />
        <Info label="Iptal nedeni" value={receipt.cancelReason ?? '-'} />
        <Info label="Fis para birimi" value={receipt.currency ?? 'TRY'} />
        <Info label="Toplam" value={money(receipt.totalAmount, receipt.currency)} />
        {mode === 'sales' ? <Info label="Terminal ID" value={(receipt as SalesReceipt).terminalId ?? '-'} /> : null}
        {mode === 'sales' ? <Info label="Local UUID" value={(receipt as SalesReceipt).localUuid ?? '-'} /> : null}
        <Info label="USD/TL snapshot" value={receipt.usdToTry ?? '-'} />
        <Info label="EUR/TL snapshot" value={receipt.eurToTry ?? '-'} />
        <Info label="EUR/USD snapshot" value={receipt.eurToUsd ?? '-'} />
      </div>
      <DataTable
        title="Fis Satirlari"
        rows={receipt.items ?? []}
        columns={[
          { label: 'Urun', render: (row) => row.product ? `${row.product.stockCode} - ${row.product.typeName}` : '-' },
          { label: 'Adet', render: (row) => row.quantity },
          { label: mode === 'purchase' ? 'Orijinal alis fiyati' : 'Orijinal fiyat', render: (row) => money(row.originalUnitPrice ?? row.unitPrice, row.originalCurrency ?? row.currency ?? receipt.currency) },
          { label: 'Orijinal para', render: (row) => row.originalCurrency ?? row.currency ?? receipt.currency ?? 'TRY' },
          { label: 'Kullanilan kur', render: (row) => exchangeRateUsedLabel(row) },
          { label: 'Donusmus fiyat', render: (row) => money(row.convertedUnitPrice ?? row.unitPrice, row.receiptCurrency ?? row.currency ?? receipt.currency) },
          { label: 'Satir toplami', render: (row) => money(row.lineTotal, row.receiptCurrency ?? row.currency ?? receipt.currency) },
        ]}
      />
      <div className="cancel-box">
        <div>
          <h3>Fis Iptali</h3>
          <p>Fis silinmez. Iptal islemi stok ve cari icin ters hareket olusturur.</p>
        </div>
        {isCancelled ? (
          <span className="cancelled-badge">Bu fis iptal edilmis</span>
        ) : !canCancel ? (
          <span className="cancelled-badge">Bu rol fis iptal edemez</span>
        ) : (
          <div className="cancel-actions">
            <Field label="Iptal nedeni" value={cancelReason} onChange={setCancelReason} />
            <button type="button" className="danger" onClick={cancelReceipt}>Fisi Iptal Et</button>
          </div>
        )}
        {message ? <p className="message">{message}</p> : null}
      </div>
    </section>
    </div>
  );
}

function ReceiptModal({ mode, products, parties, exchangeRate, onSaved, onDone }: { mode: 'purchase' | 'sales'; products: Product[]; parties: Array<Customer | Supplier>; exchangeRate: ExchangeRate | null; onSaved: () => Promise<void>; onDone: () => void }) {
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

  const title = mode === 'purchase' ? 'Yeni Alis Fisi' : 'Yeni Satis Fisi';
  const partyLabel = mode === 'purchase' ? 'Tedarikci' : 'Musteri';
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  const normalizedProductQuery = normalize(productQuery);
  const filteredProducts = products.filter((product) => {
    if (!normalizedProductQuery) return true;
    return [product.stockCode, product.barcode, product.brand, product.typeName].some((value) => normalize(value).includes(normalizedProductQuery));
  });

  const selectedProduct = products.find((product) => product.id === Number(productId));
  const selectedParty = parties.find((party) => party.id === Number(partyId));
  const selectedPrice = selectedProduct ? priceForReceipt(selectedProduct, mode, currency, exchangeRate) : null;

  useEffect(() => {
    if (!selectedProduct) return;
    setUnitPrice(priceForReceipt(selectedProduct, mode, currency, exchangeRate).amount);
  }, [currency, exchangeRate, mode, selectedProduct]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm('Kaydedilmemis fis bilgileri var. Kapatilsin mi?')) return;
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

  const removeItem = (item: ReceiptItemInput) => {
    setItems((current) => current.filter((candidate) => candidate !== item));
    setDirty(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!partyId || items.length === 0) {
      setMessage('Cari ve en az bir urun satiri gerekli.');
      return;
    }
    try {
      if (mode === 'purchase') await api.createPurchaseReceipt({ supplierId: Number(partyId), currency, items, note });
      else await api.createSalesReceipt({ customerId: Number(partyId), currency, items, note });
      setItems([]);
      setNote('');
      await onSaved();
      setDirty(false);
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fis kaydedilemedi.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <form className="panel form-panel modal-card receipt-modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header receipt-modal-header">
          <div>
            <p className="eyebrow">{mode === 'purchase' ? 'Alis belgesi' : 'Satis belgesi'}</p>
            <h2>{title}</h2>
            <p>Stok ve bakiye hareketleri fis kaydinda olusur.</p>
          </div>
          <strong className="total">Toplam {money(total, currency)}</strong>
        </div>
        <div className="form-grid compact">
          <label>
            <span>{partyLabel}</span>
            <select value={partyId} onChange={(event) => selectParty(event.target.value)}>
              <option value="">Seciniz</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </label>
          <label>
            <span>Fis para birimi</span>
            <select value={currency} onChange={(event) => { setCurrency(event.target.value as Currency); setDirty(true); }}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <Field label="Not" value={note} onChange={(value) => { setNote(value); setDirty(true); }} required={false} />
        </div>
        <div className="receipt-line">
          <Field label="Urun / barkod ara" value={productQuery} onChange={(value) => { setProductQuery(value); setDirty(true); }} required={false} />
          <label>
            <span>Urun</span>
            <select value={productId} onChange={(event) => { setProductId(event.target.value); setDirty(true); }}>
              <option value="">Urun sec</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>{product.stockCode} - {product.barcode} - Stok {product.quantity}</option>
              ))}
            </select>
          </label>
          <NumberField label="Adet" value={quantity} onChange={(value) => { setQuantity(value); setDirty(true); }} />
          <NumberField label={mode === 'purchase' ? 'Alis fiyati' : 'Satis fiyati'} value={unitPrice} onChange={(value) => { setUnitPrice(value); setDirty(true); }} />
          <button type="button" className="dark" onClick={addItem}>Sepete Ekle</button>
        </div>
        {selectedPrice?.converted ? <p className="notice">Urunun {currency} fiyati yok; TRY fiyati aktif manuel kur ile cevrildi. Kullanilan kur: {selectedPrice.rateUsed.toFixed(6)}</p> : null}
        <div className="receipt-cart">
          <div className="panel-title-row">
            <h3>Sepet</h3>
            <span>{items.length} satir</span>
          </div>
          {items.length > 0 ? (
            <div className="line-list">
              {items.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                return (
                  <div key={item.productId} className="line-item receipt-line-item">
                    <span>{product ? `${product.stockCode} - ${product.typeName}` : item.productId}</span>
                    <NumberField label="Adet" value={item.quantity} onChange={(value) => updateItemQuantity(item, value)} />
                    <strong>{money(item.quantity * item.unitPrice, currency)}</strong>
                    <button type="button" className="ghost" onClick={() => removeItem(item)}>Sil</button>
                  </div>
                );
              })}
            </div>
          ) : <p className="empty-text">Sepette urun yok.</p>}
        </div>
        {message ? <p className="message">{message}</p> : null}
        <div className="modal-actions receipt-modal-actions">
          <strong className="total">Toplam {money(total, currency)}</strong>
          <button type="button" className="ghost" onClick={requestClose}>Vazgec</button>
          <button className="primary">Fisi Kaydet</button>
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
          <Field label="Urun ara" value={productSearch} onChange={setProductSearch} required={false} />
          <label>
            <span>Urun</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Tum urunler</option>
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
        title="Hareket Gecmisi"
        rows={movements}
        columns={[
          { label: 'Urun', render: (row) => `${row.productStockCode ?? row.productId} - ${row.productName ?? '-'}` },
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
        <Info label="DB baglantisi" value={status.databaseConnected ? 'OK' : 'DEGRADED'} />
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
        title="Son Audit Kayitlari"
        rows={status.recentAuditLogs}
        columns={[
          { label: 'Aksiyon', render: (row) => row.action },
          { label: 'Varlik', render: (row) => `${row.entityType} #${row.entityId}` },
          { label: 'Kullanici', render: (row) => row.user?.username ?? 'system' },
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
        title="Kullanicilar"
        rows={users}
        columns={[
          { label: 'Ad', render: (row) => row.name },
          { label: 'Username', render: (row) => row.username },
          { label: 'Role', render: (row) => row.role },
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

function UserForm({ user, onSaved, onDone }: { user: AppUser | null; onSaved: () => Promise<void>; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', username: '', role: 'STAFF' as UserRole, password: '', active: true });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(user ? { name: user.name, username: user.username, role: user.role, password: '', active: user.active } : { name: '', username: '', role: 'STAFF', password: '', active: true });
  }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (user) await api.updateUser(Number(user.id), { name: form.name, username: form.username, role: form.role, active: form.active });
      else await api.createUser(form);
      await onSaved();
      onDone();
      setMessage('Kullanici kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kullanici kaydedilemedi.');
    }
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title-row">
        <h2>{user ? 'Kullanici Duzenle' : 'Yeni Kullanici'}</h2>
        {user ? <button type="button" className="ghost" onClick={onDone}>Vazgec</button> : null}
      </div>
      <div className="form-grid compact">
        <Field label="Ad" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
        <label>
          <span>Role</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
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
      <p>{user.username} icin yeni sifre girin.</p>
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
          <span>{rate?.updatedAt ? dateLabel(rate.updatedAt) : 'Kayit yok'}</span>
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
        <button className="primary" disabled={!canUpdateRate}>Guncelle</button>
        {!canUpdateRate ? <p className="message">STAFF rolu kur degistiremez.</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </form>
      <DataTable
        title="Kur Gecmisi"
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
  { id: 2, stockCode: 'MB-1002', barcode: '8690000001002', brand: 'Melisa Bebe', typeName: 'Hastane Cikisi', quantity: 18, buyPrice: 180, sellPrice: 289, buyPriceUsd: 6, buyPriceEur: 5.5, sellPriceUsd: 9.7, sellPriceEur: 8.8, active: true },
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
