import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getFailedOperationsMock, syncOfflineSalesReceipt } from '../../services/api';
import { notifySuccess } from '../../services/feedback';
import { loadFailedOperationsSnapshot, loadOfflineSalesReceipts, loadSettings, markOfflineSalesReceiptFailed, markOfflineSalesReceiptSynced, saveFailedOperations } from '../../storage/localStorage';
import type { FailedOperation, OfflineSalesReceipt } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type FailedQueueScreenProps = {
  onBack: () => void;
};

export function FailedQueueScreen({ onBack }: FailedQueueScreenProps) {
  const [operations, setOperations] = useState<FailedOperation[]>([]);
  const [offlineReceipts, setOfflineReceipts] = useState<OfflineSalesReceipt[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | 'synced'>('all');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const savedOperations = await loadFailedOperationsSnapshot();
    const receipts = await loadOfflineSalesReceipts();
    setOfflineReceipts(receipts);
    if (savedOperations) {
      setOperations([...receipts.map(receiptToOperation), ...savedOperations]);
      return;
    }

    const initialOperations = await getFailedOperationsMock();
    await saveFailedOperations(initialOperations);
    setOperations([...receipts.map(receiptToOperation), ...initialOperations]);
  };

  const retryOperation = async (operation: FailedOperation) => {
    const offlineReceipt = offlineReceipts.find((receipt) => receipt.localUuid === operation.id);
    if (offlineReceipt) {
      try {
        const settings = await loadSettings();
        const result = await syncOfflineSalesReceipt(offlineReceipt, settings.apiBaseUrl);
        await markOfflineSalesReceiptSynced(offlineReceipt.localUuid);
        setOfflineReceipts((current) => current.filter((receipt) => receipt.localUuid !== offlineReceipt.localUuid));
        setBanner({ message: result.duplicate ? 'Bu fiş daha önce gönderilmiş, sistemde kayıtlı.' : `${operation.documentNo} merkeze gönderildi.`, tone: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Senkron başarısız.';
        await markOfflineSalesReceiptFailed(offlineReceipt.localUuid, message);
        setBanner({ message, tone: 'warning' });
        await loadQueue();
        return;
      }
    } else {
      setBanner({ message: `${operation.documentNo} için tekrar deneme başarılı.`, tone: 'success' });
    }
    const nextOperations = operations.filter((item) => item.id !== operation.id);
    setOperations(nextOperations);
    await saveFailedOperations(nextOperations);
    notifySuccess();
  };

  const retryAll = async () => {
    const settings = await loadSettings();
    let successCount = 0;
    for (const receipt of offlineReceipts.filter((item) => item.status !== 'SYNCED' && !item.synced)) {
      try {
        await syncOfflineSalesReceipt(receipt, settings.apiBaseUrl);
        await markOfflineSalesReceiptSynced(receipt.localUuid);
        successCount += 1;
      } catch (error) {
        await markOfflineSalesReceiptFailed(receipt.localUuid, error instanceof Error ? error.message : 'Senkron başarısız.');
      }
    }
    await loadQueue();
    setBanner({ message: `${successCount} fiş başarıyla gönderildi.`, tone: successCount === offlineReceipts.length ? 'success' : 'warning' });
    notifySuccess();
  };

  const visibleOperations = operations.filter((operation) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return operation.status === 'Bekliyor' || operation.status === 'Tekrar denenecek';
    if (filter === 'failed') return operation.status === 'Gönderilemedi';
    return operation.status === 'Senkronlandı';
  });

  return (
    <ScreenShell title="Gönderilemeyenler" subtitle={`${visibleOperations.length} işlem`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      {operations.length > 0 ? (
        <View style={styles.topPanel}>
          <View>
            <Text style={styles.topTitle}>Offline kuyruk</Text>
            <Text style={styles.topText}>Bağlantı hazır olduğunda yeniden gönderilir.</Text>
          </View>
          <View style={styles.filterRow}>
            <FilterButton label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterButton label="Pending" active={filter === 'pending'} onPress={() => setFilter('pending')} />
            <FilterButton label="Failed" active={filter === 'failed'} onPress={() => setFilter('failed')} />
            <FilterButton label="Synced" active={filter === 'synced'} onPress={() => setFilter('synced')} />
          </View>
          <ActionRow actions={[{ label: 'Tüm Bekleyenleri Gönder', onPress: retryAll, variant: 'primary' }]} />
        </View>
      ) : null}

      {visibleOperations.length === 0 ? (
        <EmptyState badge="OK" title="Bekleyen işlem yok" description="Tüm işlemler güncel." />
      ) : (
        visibleOperations.map((operation) => (
          <View key={operation.id} style={styles.queueCard}>
            <View style={styles.cardAccent} />
            <View style={styles.cardTop}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.documentNo}>{operation.documentNo}</Text>
                <Text style={styles.operationType}>{operation.operationType}</Text>
              </View>
              <StatusPill label={operation.status} tone={statusToneFor(operation.status)} />
            </View>

            <Text style={styles.title}>{operation.title}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Sebep" value={operation.reason} />
              <InfoItem label="Saat" value={operation.createdAt} />
            </View>

            <Pressable onPress={() => retryOperation(operation)} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScreenShell>
  );
}

function receiptToOperation(receipt: OfflineSalesReceipt): FailedOperation {
  const status = receipt.status === 'SYNCED' || receipt.synced
    ? 'Senkronlandı'
    : receipt.status === 'FAILED'
      ? 'Gönderilemedi'
      : receipt.retryCount > 0
        ? 'Tekrar denenecek'
        : 'Bekliyor';
  return {
    id: receipt.localUuid,
    documentNo: receipt.documentNo,
    operationType: 'Offline satis fisi',
    title: `${receipt.customerName} satis fisi bekliyor`,
    reason: receipt.lastError ? shortenError(receipt.lastError) : status === 'Senkronlandı' ? 'Merkezde kayıtlı.' : 'Merkeze senkron bekliyor.',
    createdAt: new Date(receipt.createdAt).toLocaleString('tr-TR'),
    status,
  };
}

function shortenError(value: string) {
  return value.length > 90 ? `${value.slice(0, 87)}...` : value;
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  topTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  topText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.xs },
  filterButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  filterTextActive: { color: colors.surface },
  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.red },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitleBlock: { flex: 1, gap: 2 },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  operationType: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  title: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  infoGrid: { gap: spacing.xs },
  infoItem: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 15 },
  retryButton: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: colors.redDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  retryText: { color: colors.surface, fontSize: typography.body, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
