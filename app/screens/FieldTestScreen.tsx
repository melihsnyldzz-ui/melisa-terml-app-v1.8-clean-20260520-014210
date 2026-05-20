import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import {
  appendFieldTestLog,
  checkSQLiteAvailable,
  clearFieldTestLogs,
  defaultFieldTestChecklist,
  loadCachedCustomers,
  loadCachedProducts,
  loadFieldTestChecklist,
  loadFieldTestLogs,
  loadLastSuccessfulConnectionAt,
  loadLastSyncAt,
  loadOfflineSyncSummary,
  resetFieldTestChecklist,
  saveFieldTestChecklist,
} from '../../storage/localStorage';
import type { FieldTestChecklistKey, FieldTestChecklistState, FieldTestLogEntry } from '../../types/fieldTest';
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

const checklistItems: { key: FieldTestChecklistKey; label: string; helper: string }[] = [
  { key: 'apiHealthChecked', label: 'Online login / erişim testi', helper: 'Ayarlar ekranında Health testi OK ve databaseConnected=true olmalı.' },
  { key: 'bootstrapDownloaded', label: 'Bootstrap veri indirildi', helper: 'Veri Güncelle ekranı ürün ve müşteri cacheini indirmeli.' },
  { key: 'productCacheChecked', label: 'Ürün cache sayısı kontrol edildi', helper: 'Ürün cache sayısı sıfırdan büyük olmalı.' },
  { key: 'customerCacheChecked', label: 'Müşteri cache sayısı kontrol edildi', helper: 'Müşteri cache sayısı sıfırdan büyük olmalı.' },
  { key: 'wifiDisabled', label: 'Wi-Fi kapatıldı', helper: 'Offline senaryo için cihaz bağlantısı kesilmeli.' },
  { key: 'offlineSaleCreated', label: 'Offline barkod okutma testi', helper: 'Barkodla satış kaydı cihaz kuyruğuna yazılmalı.' },
  { key: 'receiptPendingChecked', label: 'Offline kayıt kuyruğu testi', helper: 'Gönderilemeyenler ekranında bekleyen fiş görünmeli.' },
  { key: 'wifiEnabled', label: 'Wi-Fi açıldı', helper: 'Aynı local ağ bağlantısı tekrar aktif edilmeli.' },
  { key: 'receiptSynced', label: 'Tekrar online olup sync testi', helper: 'Manuel sync sonrası fiş başarıyla backend e gönderilmeli.' },
  { key: 'duplicateSyncChecked', label: 'Duplicate gönderim engeli testi', helper: 'Aynı localUuid tekrar gönderildiğinde duplicate başarı kabul edilmeli.' },
];

export function FieldTestScreen({ onBack }: FieldTestScreenProps) {
  const [state, setState] = useState<FieldTestState>(initialState);
  const [checklist, setChecklist] = useState<FieldTestChecklistState>(defaultFieldTestChecklist);
  const [logs, setLogs] = useState<FieldTestLogEntry[]>([]);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => checklist[item.key]).length,
    [checklist],
  );

  useEffect(() => {
    refreshScreen();
  }, []);

  const refreshScreen = async () => {
    const [lastConnectionAt, products, customers, syncSummary, lastSyncAt, sqliteActive, savedChecklist, savedLogs] = await Promise.all([
      loadLastSuccessfulConnectionAt(),
      loadCachedProducts(),
      loadCachedCustomers(),
      loadOfflineSyncSummary(),
      loadLastSyncAt(),
      checkSQLiteAvailable(),
      loadFieldTestChecklist(),
      loadFieldTestLogs(),
    ]);

    const nextState = {
      lastConnectionAt,
      productCount: products.length,
      customerCount: customers.length,
      pendingCount: syncSummary.pending,
      failedCount: syncSummary.failed,
      syncedCount: syncSummary.synced,
      lastSyncAt,
      sqliteActive,
    };
    setState(nextState);
    setChecklist(savedChecklist);
    setLogs(savedLogs);
    return nextState;
  };

  const toggleChecklist = async (key: FieldTestChecklistKey) => {
    const nextChecklist = { ...checklist, [key]: !checklist[key] };
    setChecklist(nextChecklist);
    await saveFieldTestChecklist(nextChecklist);
    const item = checklistItems.find((checklistItem) => checklistItem.key === key);
    const nextLogs = await appendFieldTestLog({
      title: nextChecklist[key] ? 'Checklist işaretlendi' : 'Checklist geri alındı',
      detail: item?.label,
      tone: nextChecklist[key] ? 'success' : 'warning',
    });
    setLogs(nextLogs);
  };

  const handleResetChecklist = async () => {
    await resetFieldTestChecklist();
    setChecklist(defaultFieldTestChecklist);
    const nextLogs = await appendFieldTestLog({
      title: 'Checklist sıfırlandı',
      detail: 'Android saha testi adımları yeniden başlatıldı.',
      tone: 'warning',
    });
    setLogs(nextLogs);
  };

  const handleClearLogs = async () => {
    await clearFieldTestLogs();
    setLogs([]);
  };

  const handleRefresh = async () => {
    const nextState = await refreshScreen();
    const nextLogs = await appendFieldTestLog({
      title: 'Saha durumu yenilendi',
      detail: `Ürün: ${nextState.productCount}, müşteri: ${nextState.customerCount}, pending: ${nextState.pendingCount}`,
      tone: 'info',
    });
    setLogs(nextLogs);
  };

  return (
    <ScreenShell title="Saha Testi" subtitle="Cihaz, offline kuyruk ve Android test kontrolü" onBack={onBack}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.textBlock}>
            <Text style={styles.sectionTitle}>Canlı durum</Text>
            <Text style={styles.sectionHint}>Cihazdaki cache, kuyruk ve son bağlantı bilgisi.</Text>
          </View>
          <AppButton label="Yenile" onPress={handleRefresh} variant="quiet" compact />
        </View>
        <StatusRow label="API bağlantısı başarılı mı?" value={state.lastConnectionAt ? formatDate(state.lastConnectionAt) : 'Hayır'} ok={Boolean(state.lastConnectionAt)} />
        <StatusRow label="Bootstrap veri indirildi mi?" value={state.productCount > 0 && state.customerCount > 0 ? 'Evet' : 'Hayır'} ok={state.productCount > 0 && state.customerCount > 0} />
        <StatusRow label="Ürün cache sayısı" value={state.productCount.toString()} ok={state.productCount > 0} />
        <StatusRow label="Müşteri cache sayısı" value={state.customerCount.toString()} ok={state.customerCount > 0} />
        <StatusRow label="Bekleyen kayıt" value={state.pendingCount.toString()} ok={state.pendingCount === 0} />
        <StatusRow label="Hatalı kalan" value={state.failedCount.toString()} ok={state.failedCount === 0} />
        <StatusRow label="Başarılı gönderilen" value={state.syncedCount.toString()} ok />
        <StatusRow label="Son sync zamanı" value={state.lastSyncAt ? formatDate(state.lastSyncAt) : 'Yok'} ok={Boolean(state.lastSyncAt)} />
        <StatusRow label="SQLite aktif mi?" value={state.sqliteActive ? 'Evet' : 'Hayır'} ok={state.sqliteActive} />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.textBlock}>
            <Text style={styles.sectionTitle}>Android saha test checklist’i</Text>
            <Text style={styles.sectionHint}>{completedCount}/{checklistItems.length} adım tamamlandı.</Text>
          </View>
          <AppButton label="Sıfırla" onPress={handleResetChecklist} variant="secondary" compact />
        </View>
        {checklistItems.map((item) => (
          <ChecklistToggle
            key={item.key}
            label={item.label}
            helper={item.helper}
            checked={checklist[item.key]}
            onPress={() => toggleChecklist(item.key)}
          />
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.textBlock}>
            <Text style={styles.sectionTitle}>Test logu</Text>
            <Text style={styles.sectionHint}>Son 50 saha testi olayı cihazda saklanır.</Text>
          </View>
          <AppButton label="Temizle" onPress={handleClearLogs} variant="quiet" compact />
        </View>
        {logs.length === 0 ? (
          <View style={styles.emptyLog}>
            <Text style={styles.value}>Henüz test logu yok.</Text>
          </View>
        ) : (
          logs.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </View>
    </ScreenShell>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <StatusPill label={ok ? 'OK' : 'Kontrol'} tone={ok ? 'success' : 'danger'} />
    </View>
  );
}

function ChecklistToggle({ label, helper, checked, onPress }: { label: string; helper: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.checkRow, checked && styles.checkRowDone, pressed && styles.pressed]}>
      <View style={[styles.checkbox, checked && styles.checkboxDone]}>
        <Text style={[styles.checkboxText, checked && styles.checkboxTextDone]}>{checked ? '✓' : ''}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{helper}</Text>
      </View>
    </Pressable>
  );
}

function LogRow({ log }: { log: FieldTestLogEntry }) {
  return (
    <View style={[styles.logRow, styles[`log_${log.tone}`]]}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{log.title}</Text>
        {log.detail ? <Text style={styles.value}>{log.detail}</Text> : null}
        <Text style={styles.timeText}>{formatDate(log.createdAt)}</Text>
      </View>
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
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: '900' },
  sectionHint: { color: colors.muted, fontSize: typography.small, fontWeight: '700' },
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
  checkRow: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkRowDone: {
    borderColor: colors.green,
    backgroundColor: '#eefbf4',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkboxText: { color: colors.surface, fontSize: 18, fontWeight: '900' },
  checkboxTextDone: { color: colors.surface },
  textBlock: { flex: 1, gap: 2 },
  label: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  value: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  timeText: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  emptyLog: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
  },
  logRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  log_info: { borderColor: colors.line, backgroundColor: colors.surfaceSoft },
  log_success: { borderColor: colors.green, backgroundColor: '#eefbf4' },
  log_warning: { borderColor: '#f59e0b', backgroundColor: '#fff7ed' },
  log_error: { borderColor: colors.red, backgroundColor: '#fef2f2' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
