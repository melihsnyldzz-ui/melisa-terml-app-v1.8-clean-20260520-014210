import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import {
  checkSQLiteAvailable,
  loadCachedCustomers,
  loadCachedProducts,
  loadLastSuccessfulConnectionAt,
  loadLastSyncAt,
  loadOfflineSalesReceipts,
} from '../../storage/localStorage';
import { colors, radius, spacing, typography } from '../theme';

type FieldTestScreenProps = {
  onBack: () => void;
};

type FieldTestState = {
  lastConnectionAt: string | null;
  productCount: number;
  customerCount: number;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncAt: string | null;
  sqliteActive: boolean;
};

const initialState: FieldTestState = {
  lastConnectionAt: null,
  productCount: 0,
  customerCount: 0,
  pendingCount: 0,
  failedCount: 0,
  syncedCount: 0,
  lastSyncAt: null,
  sqliteActive: false,
};

export function FieldTestScreen({ onBack }: FieldTestScreenProps) {
  const [state, setState] = useState<FieldTestState>(initialState);

  useEffect(() => {
    Promise.all([
      loadLastSuccessfulConnectionAt(),
      loadCachedProducts(),
      loadCachedCustomers(),
      loadOfflineSalesReceipts(),
      loadLastSyncAt(),
      checkSQLiteAvailable(),
    ]).then(([lastConnectionAt, products, customers, receipts, lastSyncAt, sqliteActive]) => {
      setState({
        lastConnectionAt,
        productCount: products.length,
        customerCount: customers.length,
        pendingCount: receipts.filter((receipt) => (receipt.status ?? 'PENDING') === 'PENDING').length,
        failedCount: receipts.filter((receipt) => receipt.status === 'FAILED').length,
        syncedCount: receipts.filter((receipt) => receipt.status === 'SYNCED' || receipt.synced).length,
        lastSyncAt,
        sqliteActive,
      });
    });
  }, []);

  return (
    <ScreenShell title="Saha Testi" subtitle="Cihaz ve offline durum kontrolü" onBack={onBack}>
      <View style={styles.panel}>
        <ChecklistRow label="API bağlantısı başarılı mı?" value={state.lastConnectionAt ? formatDate(state.lastConnectionAt) : 'Hayır'} ok={Boolean(state.lastConnectionAt)} />
        <ChecklistRow label="Bootstrap veri indirildi mi?" value={state.productCount > 0 && state.customerCount > 0 ? 'Evet' : 'Hayır'} ok={state.productCount > 0 && state.customerCount > 0} />
        <ChecklistRow label="Ürün cache sayısı" value={state.productCount.toString()} ok={state.productCount > 0} />
        <ChecklistRow label="Müşteri cache sayısı" value={state.customerCount.toString()} ok={state.customerCount > 0} />
        <ChecklistRow label="Bekleyen fiş sayısı" value={state.pendingCount.toString()} ok={state.pendingCount === 0} />
        <ChecklistRow label="Failed fiş sayısı" value={state.failedCount.toString()} ok={state.failedCount === 0} />
        <ChecklistRow label="Synced fiş sayısı" value={state.syncedCount.toString()} ok />
        <ChecklistRow label="Son sync zamanı" value={state.lastSyncAt ? formatDate(state.lastSyncAt) : 'Yok'} ok={Boolean(state.lastSyncAt)} />
        <ChecklistRow label="SQLite aktif mi?" value={state.sqliteActive ? 'Evet' : 'Hayır'} ok={state.sqliteActive} />
      </View>
    </ScreenShell>
  );
}

function ChecklistRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <StatusPill label={ok ? 'OK' : 'Hata'} tone={ok ? 'success' : 'danger'} />
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR');
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textBlock: { flex: 1, gap: 2 },
  label: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  value: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
});
