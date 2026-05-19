import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage, ToastTone } from '../../components/ToastMessage';
import { createSaleMock, getMockProductByCode } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { clearActiveSaleDraft, loadActiveSaleDraft, loadBootstrapMeta, loadCachedCustomers, loadCachedProducts, loadSettings, saveActiveSaleDraft, saveOfflineSalesReceipt } from '../../storage/localStorage';
import type { ActiveSaleDraft, CachedCustomer, CachedProduct, CurrencyCode, ExchangeRateSnapshot, SaleLine, SaleStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type NewSaleScreenProps = {
  onBack: () => void;
};

type CustomerSuggestion = {
  id: string;
  name: string;
  code: string;
  city: string;
  defaultCurrency: CurrencyCode;
};

type LastScannedProduct = {
  code: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  time: string;
};

const mockCustomers: CustomerSuggestion[] = [
  { id: '1', name: 'ABC Baby Store', code: 'C-1001', city: 'Cache yok', defaultCurrency: 'TRY' },
  { id: '2', name: 'Mini Kids', code: 'C-1002', city: 'Cache yok', defaultCurrency: 'TRY' },
];

const quickCodes = ['MB-1001', 'MB-1002', 'MB-1003'];

const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export function NewSaleScreen({ onBack }: NewSaleScreenProps) {
  const barcodeInputRef = useRef<TextInput>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);
  const [customer, setCustomer] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([]);
  const [cachedCustomers, setCachedCustomers] = useState<CachedCustomer[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateSnapshot | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [lastScanned, setLastScanned] = useState<LastScannedProduct | null>(null);
  const [pendingDeleteLineId, setPendingDeleteLineId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalAmount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * (line.sellPrice ?? 0), 0), [lines]);
  const status: SaleStatus = documentNo && lines.length > 0 ? 'Hazır' : 'Taslak';
  const canScan = Boolean(documentNo);
  const customerQuery = normalizeSearchText(customer);
  const customerSource = useMemo<CustomerSuggestion[]>(() => {
    if (cachedCustomers.length === 0) return mockCustomers;
    return cachedCustomers.map((item) => ({
      id: item.id.toString(),
        name: item.name,
        code: `C-${item.id.toString().padStart(4, '0')}`,
        city: item.phone ?? 'Cache',
        defaultCurrency: item.defaultCurrency,
      }));
  }, [cachedCustomers]);
  const selectedCustomer = useMemo(
    () => customerSource.find((item) => normalizeSearchText(item.name) === customerQuery || Number(item.id) === selectedCustomerId),
    [customerQuery, customerSource, selectedCustomerId],
  );
  const customerSuggestions = useMemo(() => {
    if (!customerQuery) return customerSource.slice(0, 4);

    return customerSource
      .filter((item) => normalizeSearchText(item.name).includes(customerQuery) || normalizeSearchText(item.code).includes(customerQuery))
      .sort((first, second) => {
        const firstName = normalizeSearchText(first.name);
        const secondName = normalizeSearchText(second.name);
        const firstStarts = firstName.startsWith(customerQuery) ? 0 : 1;
        const secondStarts = secondName.startsWith(customerQuery) ? 0 : 1;
        if (firstStarts !== secondStarts) return firstStarts - secondStarts;
        return firstName.localeCompare(secondName, 'tr-TR');
      })
      .slice(0, 5);
  }, [customerQuery]);
  const customerMetaLabel = selectedCustomer
    ? `${selectedCustomer.code} · ${selectedCustomer.defaultCurrency} · ${selectedCustomer.city}`
    : customer.trim()
      ? 'Yeni müşteri adı ile devam edilecek'
      : 'Müşteri seçilmedi';

  useEffect(() => {
    Promise.all([loadActiveSaleDraft(), loadCachedProducts(), loadCachedCustomers(), loadBootstrapMeta()]).then(([draft, products, customers, meta]) => {
      setCachedProducts(products);
      setCachedCustomers(customers);
      setExchangeRate(meta?.exchangeRate ?? null);
      if (!draft) return;
      setCustomer(draft.customerName);
      setDocumentNo(draft.documentNo);
      setLines(draft.lines);
      setBanner({ message: `${draft.documentNo} taslak yüklendi.`, tone: 'info' });
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    });
  }, []);

  useEffect(() => {
    if (!documentNo) return undefined;
    const timer = setTimeout(() => barcodeInputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [documentNo]);

  const persistDraft = async (nextLines: SaleLine[] = lines, nextDocumentNo = documentNo, nextCustomer = customer) => {
    if (!nextDocumentNo) return;
    const draft: ActiveSaleDraft = {
      documentNo: nextDocumentNo,
      customerName: nextCustomer || 'Seçili müşteri yok',
      status: nextLines.length > 0 ? 'Hazır' : 'Taslak',
      lines: nextLines,
      updatedAt: new Date().toISOString(),
    };
    await saveActiveSaleDraft(draft);
  };

  const selectCustomer = (nextCustomer: CustomerSuggestion) => {
    const nextName = nextCustomer.name === 'Yeni Müşteri' ? '' : nextCustomer.name;
    setCustomer(nextName);
    setSelectedCustomerId(Number(nextCustomer.id) || undefined);
    setBanner({ message: nextName ? `${nextName} seçildi.` : 'Yeni müşteri adı yazılabilir.', tone: 'info' });
  };

  const focusScanner = () => {
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  const startSale = async () => {
    if (documentNo) {
      setBanner({ message: 'Fiş zaten aktif.', tone: 'info' });
      focusScanner();
      return;
    }

    const selectedCustomerName = customer.trim();
    if (!selectedCustomerName) {
      setBanner({ message: 'Önce müşteri adı yaz veya listeden seç.', tone: 'warning' });
      notifyWarning();
      return;
    }

    const sale = await createSaleMock(selectedCustomerName);
    const matchingCustomer = customerSource.find((item) => normalizeSearchText(item.name) === normalizeSearchText(selectedCustomerName));
    if (matchingCustomer) setSelectedCustomerId(Number(matchingCustomer.id) || undefined);
    setDocumentNo(sale.documentNo);
    await persistDraft(lines, sale.documentNo, selectedCustomerName);
    setBanner({ message: `${sale.documentNo} aktif fiş hazır. Barkod okutabilirsin.`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  const addProduct = async (rawCode?: string) => {
    if (!documentNo) {
      setBanner({ message: 'Önce fişi başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    const code = (rawCode ?? barcode).trim().toUpperCase();
    if (!code) {
      setBanner({ message: 'Kod okut ya da yaz.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const now = Date.now();
    if (lastScanRef.current?.code === code && now - lastScanRef.current.time < 500) {
      setBarcode('');
      setBanner({ message: 'Tekrarlı okutma engellendi.', tone: 'info' });
      notifyWarning();
      focusScanner();
      return;
    }
    lastScanRef.current = { code, time: now };

    const cachedProduct = cachedProducts.find((item) => item.barcode.toUpperCase() === code || item.stockCode.toUpperCase() === code);
    if (!cachedProduct && cachedProducts.length > 0) {
      setBarcode('');
      setBanner({ message: `${code} local ürün cache içinde bulunamadı.`, tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    const product = cachedProduct
      ? {
          id: cachedProduct.id,
          code: cachedProduct.stockCode,
          barcode: cachedProduct.barcode,
          name: cachedProduct.typeName,
          color: cachedProduct.brand,
          size: `Stok ${cachedProduct.quantity}`,
          sellPrice: cachedProduct.sellPrice,
          sellPriceTry: cachedProduct.sellPriceTry,
          sellPriceUsd: cachedProduct.sellPriceUsd,
          sellPriceEur: cachedProduct.sellPriceEur,
          brand: cachedProduct.brand,
          typeName: cachedProduct.typeName,
        }
      : await getMockProductByCode(code);
    const currency = selectedCustomer?.defaultCurrency ?? 'TRY';
    const pricedProduct = { ...product, sellPrice: priceForCurrency(product, currency, exchangeRate) };
    const existingLine = lines.find((line) => line.code === pricedProduct.code);
    const nextLines = existingLine
      ? lines.map((line) => (line.lineId === existingLine.lineId ? { ...line, quantity: line.quantity + 1 } : line))
      : [...lines, { ...pricedProduct, lineId: `${pricedProduct.code}-${Date.now()}`, quantity: 1 }];

    setLines(nextLines);
    setBarcode('');
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    const nextQuantity = nextLines.find((line) => line.code === pricedProduct.code)?.quantity ?? 1;
    setLastScanned({
      code: pricedProduct.code,
      name: pricedProduct.name,
      color: pricedProduct.color,
      size: `${pricedProduct.size} · ${currency} ${pricedProduct.sellPrice?.toFixed(2) ?? '0.00'}`,
      quantity: nextQuantity,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    });
    setBanner({ message: `${pricedProduct.code} fişe eklendi.`, tone: 'success' });
    notifySuccess();
    focusScanner();
  };

  const handleBarcodeChange = (value: string) => {
    if (value.includes('\n') || value.includes('\r')) {
      const scannedCode = value.replace(/[\r\n]/g, '').trim();
      setBarcode(scannedCode);
      void addProduct(scannedCode);
      return;
    }
    setBarcode(value);
  };

  const changeQuantity = async (lineId: string, delta: number) => {
    const nextLines = lines
      .map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line));
    setLines(nextLines);
    await persistDraft(nextLines);
    focusScanner();
  };

  const removeLine = async (lineId: string) => {
    if (pendingDeleteLineId !== lineId) {
      setPendingDeleteLineId(lineId);
      setBanner({ message: 'Silmek için tekrar basın.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }

    const nextLines = lines.filter((line) => line.lineId !== lineId);
    setLines(nextLines);
    setPendingDeleteLineId(null);
    await persistDraft(nextLines);
    setBanner({ message: 'Ürün satırı silindi.', tone: 'info' });
    notifyWarning();
    focusScanner();
  };

  const saveDraft = async () => {
    if (!documentNo) {
      setBanner({ message: 'Kaydetmek için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'Taslak kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  const prepareAlbum = async () => {
    if (!documentNo) {
      setBanner({ message: 'QR albüm için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    if (lines.length === 0) {
      setBanner({ message: 'QR albüm için ürün ekle.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'QR albüm hazırlandı.', tone: 'success' });
    notifySuccess();
  };

  const holdSale = async () => {
    if (!documentNo) {
      setBanner({ message: 'Beklemeye almak için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    await persistDraft();
    setBanner({ message: 'Fiş beklemeye alındı.', tone: 'info' });
  };

  const completeSale = async () => {
    if (!documentNo) {
      setBanner({ message: 'Tamamlamak için fiş başlat.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    if (lines.length === 0) {
      setBanner({ message: 'Tamamlamak için ürün ekle.', tone: 'warning' });
      notifyWarning();
      focusScanner();
      return;
    }
    const settings = await loadSettings();
    const currency = selectedCustomer?.defaultCurrency ?? 'TRY';
    const localUuid = `local-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    await saveOfflineSalesReceipt({
      localUuid,
      terminalId: settings.terminalId,
      documentNo,
      customerName: customer.trim() || 'Seçili müşteri yok',
      customerId: selectedCustomerId,
      synced: false,
      status: 'PENDING',
      currency,
      usedExchangeRate: exchangeRate,
      totalAmount,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      lines,
    });
    await clearActiveSaleDraft();
    setDocumentNo('');
    setLines([]);
    setLastScanned(null);
    setBanner({ message: 'Fiş offline kuyruğa kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  return (
    <ScreenShell title="Yeni Fiş" subtitle="Müşteri seç, barkod okut" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.statusPanel}>
        <View style={styles.statusTopRow}>
          <Text style={styles.statusDocument}>{documentNo || 'Fiş başlatılmadı'}</Text>
          <StatusPill label={status} tone={status === 'Hazır' ? 'success' : 'warning'} />
        </View>
        <Text style={styles.statusCustomer} numberOfLines={1}>{customer || 'Müşteri seçilmedi'}</Text>
        <View style={styles.statusMetricRow}>
          <Metric label="Kalem" value={lines.length.toString()} />
          <Metric label="Toplam" value={totalQuantity.toString()} />
          <Metric label="Tutar" value={`${selectedCustomer?.defaultCurrency ?? 'TRY'} ${totalAmount.toFixed(2)}`} />
          <Metric label="Okutma" value={canScan ? 'Hazır' : 'Kapalı'} />
        </View>
      </View>

      <View style={styles.formPanel}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.stepBadge}>1</Text>
          <View style={styles.sectionHeaderTextBlock}>
            <Text style={styles.label}>Müşteri ara</Text>
            <Text style={styles.helperText}>{documentNo ? 'Müşteri fişe bağlandı; barkod okutmaya devam et.' : 'İsim harfleri yazıldıkça uygun müşteriler listelenir.'}</Text>
          </View>
        </View>
        <TextInput
          value={customer}
          onChangeText={setCustomer}
          placeholder="Müşteri adı yaz"
          placeholderTextColor={colors.muted}
          style={[styles.input, documentNo && styles.lockedInput]}
          editable={!documentNo}
        />
        {customer.trim() ? (
          <View style={[styles.selectedCustomerCard, documentNo && styles.selectedCustomerCardLocked]}>
            <View style={styles.selectedCustomerTextBlock}>
              <Text style={styles.selectedCustomerLabel}>{documentNo ? 'Fiş müşterisi' : 'Seçilecek müşteri'}</Text>
              <Text style={styles.selectedCustomerName} numberOfLines={1}>{customer.trim()}</Text>
              <Text style={styles.selectedCustomerMeta}>{customerMetaLabel}</Text>
            </View>
            <StatusPill label={documentNo ? 'Kilitli' : 'Hazır'} tone={documentNo ? 'success' : 'info'} />
          </View>
        ) : null}
        {!documentNo && (
          <View style={styles.suggestionList}>
            {customerSuggestions.length > 0 ? (
              customerSuggestions.map((item) => {
                const selected = selectedCustomer?.id === item.id;
                const isManual = item.code === 'MANUEL';
                return (
                  <Pressable key={item.id} onPress={() => selectCustomer(item)} style={[styles.suggestionRow, selected && styles.suggestionRowSelected, isManual && styles.manualSuggestionRow]}>
                    <View style={styles.suggestionMain}>
                      <Text style={[styles.suggestionName, selected && styles.suggestionNameSelected]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.suggestionMeta, selected && styles.suggestionMetaSelected]}>{item.code} · {item.city}</Text>
                    </View>
                    <Text style={[styles.suggestionAction, selected && styles.suggestionActionSelected]}>{selected ? 'Seçili' : isManual ? 'Elle Yaz' : 'Seç'}</Text>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.noSuggestionBox}>
                <Text style={styles.noSuggestionTitle}>Eşleşen müşteri yok</Text>
                <Text style={styles.noSuggestionText}>Bu isimle yeni müşteri fişi başlatılabilir.</Text>
              </View>
            )}
          </View>
        )}
        <AppButton label={documentNo ? 'Fiş Başlatıldı' : 'Müşteriyi Seç ve Fiş Başlat'} onPress={startSale} variant={documentNo ? 'dark' : 'primary'} />
      </View>

      <View style={[styles.formPanel, !canScan && styles.lockedPanel]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.stepBadge}>2</Text>
          <View style={styles.sectionHeaderTextBlock}>
            <Text style={styles.label}>Barkod okut</Text>
            <Text style={styles.helperText}>{canScan ? 'Scanner hazır. Okutulan ürün fişe eklenir.' : 'Barkod alanı fiş başlatılınca açılır.'}</Text>
          </View>
        </View>
        <TextInput
          ref={barcodeInputRef}
          value={barcode}
          onChangeText={handleBarcodeChange}
          placeholder={canScan ? 'Kod okut veya yaz' : 'Önce müşteri seç ve fiş başlat'}
          placeholderTextColor={colors.muted}
          style={[styles.input, canScan && styles.scanInput, !canScan && styles.disabledInput]}
          autoCapitalize="characters"
          editable={canScan}
          blurOnSubmit={false}
          returnKeyType="done"
          onSubmitEditing={() => addProduct()}
        />
        <View style={styles.lastScanBox}>
          <Text style={styles.lastScanLabel}>Son okutulan</Text>
          {lastScanned ? (
            <View style={styles.lastScanBody}>
              <Text style={styles.lastScanCode}>{lastScanned.code}</Text>
              <Text style={styles.lastScanName} numberOfLines={1}>{lastScanned.name}</Text>
              <Text style={styles.lastScanMeta}>{lastScanned.color} · {lastScanned.size}</Text>
              <Text style={styles.lastScanMeta}>Adet {lastScanned.quantity} · {lastScanned.time}</Text>
            </View>
          ) : (
            <Text style={styles.lastScanEmpty}>Henüz ürün okutulmadı.</Text>
          )}
        </View>
        <ActionRow
          actions={[
            { label: 'Ürünü Ekle', onPress: () => addProduct(), variant: 'primary' },
          ]}
        />
        <View style={styles.quickCodeRow}>
          {quickCodes.map((code) => (
            <Pressable key={code} onPress={() => addProduct(code)} style={[styles.quickCodeButton, !canScan && styles.quickCodeButtonDisabled]}>
              <Text style={styles.quickCodeText}>{code}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {lines.length === 0 ? (
        <EmptyState badge="ÜRÜN" title="Fişte ürün yok" description="Müşteri seçilip fiş başlatıldıktan sonra kod okut." />
      ) : (
        <View style={styles.productList}>
          <View style={styles.productListHeader}>
            <Text style={styles.productListTitle}>Fiş ürünleri</Text>
            <Text style={styles.productListCount}>{lines.length} kalem · {totalQuantity} adet</Text>
          </View>
          {lines.map((line) => (
            <View key={line.lineId} style={styles.productRow}>
              <View style={styles.productMain}>
                <Text style={styles.productCode}>{line.code}</Text>
                <Text style={styles.productName} numberOfLines={1}>{line.name}</Text>
                <Text style={styles.productMeta} numberOfLines={1}>{line.color} · {line.size}</Text>
              </View>
              <View style={styles.quantityBlock}>
                <Text style={styles.quantityLabel}>Adet</Text>
                <Text style={styles.quantityValue}>{line.quantity}</Text>
              </View>
              <View style={styles.lineActions}>
                <Pressable onPress={() => changeQuantity(line.lineId, -1)} style={styles.lineButton}>
                  <Text style={styles.lineButtonText}>-</Text>
                </Pressable>
                <Pressable onPress={() => changeQuantity(line.lineId, 1)} style={styles.lineButton}>
                  <Text style={styles.lineButtonText}>+</Text>
                </Pressable>
                <Pressable onPress={() => removeLine(line.lineId)} style={[styles.lineButton, styles.deleteButton, pendingDeleteLineId === line.lineId && styles.deleteConfirmButton]}>
                  <Text style={styles.deleteText}>{pendingDeleteLineId === line.lineId ? 'Onay' : 'Sil'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionPanel}>
        <ActionRow
          actions={[
            { label: 'Taslağı Kaydet', onPress: saveDraft, variant: 'secondary' },
            { label: 'QR Albüm Hazırla', onPress: prepareAlbum, variant: 'dark' },
          ]}
        />
        <ActionRow
          actions={[
            { label: 'Beklemeye Al', onPress: holdSale, variant: 'quiet' },
            { label: 'Fişi Tamamla', onPress: completeSale, variant: 'primary' },
          ]}
        />
      </View>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function priceForCurrency(product: Pick<SaleLine, 'sellPrice' | 'sellPriceTry' | 'sellPriceUsd' | 'sellPriceEur'>, currency: CurrencyCode, rate: ExchangeRateSnapshot | null) {
  if (currency === 'TRY') return product.sellPriceTry ?? product.sellPrice ?? 0;
  if (currency === 'USD') {
    if (product.sellPriceUsd != null) return product.sellPriceUsd;
    return rate?.tryToUsd ? (product.sellPriceTry ?? product.sellPrice ?? 0) * rate.tryToUsd : rate?.usdToTry ? (product.sellPriceTry ?? product.sellPrice ?? 0) / rate.usdToTry : product.sellPrice ?? 0;
  }
  if (product.sellPriceEur != null) return product.sellPriceEur;
  return rate?.tryToEur ? (product.sellPriceTry ?? product.sellPrice ?? 0) * rate.tryToEur : rate?.eurToTry ? (product.sellPriceTry ?? product.sellPrice ?? 0) / rate.eurToTry : product.sellPrice ?? 0;
}

const styles = StyleSheet.create({
  statusPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  statusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  statusDocument: { color: colors.red, fontSize: typography.section, fontWeight: '900', flex: 1 },
  statusCustomer: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  statusMetricRow: { flexDirection: 'row', gap: spacing.xs },
  metricBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  metricValue: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900', textAlign: 'center' },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  formPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.xs },
  lockedPanel: { opacity: 0.92 },
  actionPanel: { gap: spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionHeaderTextBlock: { flex: 1, gap: 2 },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.anthracite,
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  helperText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  input: { minHeight: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.line, color: colors.ink, fontSize: typography.body, paddingHorizontal: spacing.md, fontWeight: '800' },
  lockedInput: { backgroundColor: colors.surface, borderColor: colors.anthracite },
  scanInput: { borderColor: colors.anthracite, backgroundColor: colors.surface },
  disabledInput: { opacity: 0.72 },
  selectedCustomerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  selectedCustomerCardLocked: { borderColor: colors.anthracite, borderLeftColor: colors.anthracite },
  selectedCustomerTextBlock: { flex: 1, gap: 2 },
  selectedCustomerLabel: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  selectedCustomerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  selectedCustomerMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  suggestionList: { gap: spacing.xs },
  suggestionRow: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  suggestionRowSelected: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  manualSuggestionRow: { borderStyle: 'dashed' },
  suggestionMain: { flex: 1, gap: 2 },
  suggestionName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  suggestionNameSelected: { color: colors.surface },
  suggestionMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  suggestionMetaSelected: { color: colors.surface },
  suggestionAction: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  suggestionActionSelected: { color: colors.surface },
  noSuggestionBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    gap: 2,
  },
  noSuggestionTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  noSuggestionText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lastScanBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: 2,
  },
  lastScanLabel: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  lastScanBody: { gap: 2 },
  lastScanCode: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  lastScanName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  lastScanMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  lastScanEmpty: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  quickCodeRow: { flexDirection: 'row', gap: spacing.xs },
  quickCodeButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  quickCodeButtonDisabled: { opacity: 0.45 },
  quickCodeText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  productList: { gap: spacing.xs },
  productListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  productListTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productListCount: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  productRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  productMain: { flex: 1, gap: 1 },
  productCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMeta: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  quantityBlock: {
    minWidth: 44,
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  quantityLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  quantityValue: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  lineActions: { flexDirection: 'row', gap: 4 },
  lineButton: {
    minHeight: 30,
    minWidth: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.anthracite,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  lineButtonText: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  deleteButton: { backgroundColor: colors.red, borderColor: colors.redDark },
  deleteConfirmButton: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  deleteText: { color: colors.surface, fontSize: 10, fontWeight: '900' },
});
