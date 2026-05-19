import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusPill } from '../../components/StatusPill';
import { TerminalHeader } from '../../components/TerminalHeader';
import { ToastMessage } from '../../components/ToastMessage';
import { getFailedOperationsMock, getMessagesMock, getOpenDocumentsMock } from '../../services/api';
import { loadActiveSaleDraft, loadFailedOperationsSnapshot, loadOfflineSalesReceipts, saveFailedOperations } from '../../storage/localStorage';
import type { ActiveSaleDraft } from '../../types';
import type { AppScreen, OpenDocument, UserSession } from '../../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type DashboardScreenProps = {
  session: UserSession | null;
  onNavigate: (screen: AppScreen) => void;
  systemMessage?: string;
};

const modules: Array<{ label: string; description: string; screen: AppScreen; code: string }> = [
  { label: 'Açık Fişler', description: 'Bekleyen fişler', screen: 'openDocuments', code: 'AÇK' },
  { label: 'QR Albüm', description: 'Ürün görselleri', screen: 'qrAlbum', code: 'QR' },
  { label: 'Mesajlar', description: 'Operasyon notları', screen: 'messages', code: 'MSG' },
  { label: 'Gönderilemeyenler', description: 'Kuyruk işlemleri', screen: 'failedQueue', code: 'ERR' },
  { label: 'Veri Güncelle', description: 'Ürün ve stok', screen: 'dataUpdate', code: 'SYN' },
  { label: 'Saha Testi', description: 'Cihaz durumu', screen: 'fieldTest', code: 'TST' },
  { label: 'Ayarlar', description: 'Terminal bilgileri', screen: 'settings', code: 'SET' },
];

const quickActions: Array<{ label: string; screen: AppScreen; tone?: 'primary' | 'dark' }> = [
  { label: 'Yeni Fiş', screen: 'newSale', tone: 'primary' },
  { label: 'Açık Fiş', screen: 'openDocuments' },
  { label: 'Mesaj', screen: 'messages' },
  { label: 'QR', screen: 'qrAlbum', tone: 'dark' },
];

export function DashboardScreen({ session, onNavigate, systemMessage }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSync] = useState('09:40');
  const [activeDraft, setActiveDraft] = useState<ActiveSaleDraft | null>(null);

  useEffect(() => {
    getMessagesMock().then((messages) => {
      setUnreadCount(messages.filter((message) => !message.read).length);
      setUrgentCount(messages.filter((message) => message.type === 'Acil' && !message.read).length);
    });
    getOpenDocumentsMock().then(setDocuments);
    loadFailedOperationsSnapshot().then(async (savedOperations) => {
      const pendingOfflineReceipts = (await loadOfflineSalesReceipts()).filter((receipt) => receipt.status !== 'SYNCED' && !receipt.synced).length;
      if (savedOperations) {
        setFailedCount(savedOperations.length + pendingOfflineReceipts);
        return;
      }
      const operations = await getFailedOperationsMock();
      await saveFailedOperations(operations);
      setFailedCount(operations.length + pendingOfflineReceipts);
    });
    loadActiveSaleDraft().then(setActiveDraft);
  }, []);

  const personName = session?.username || 'Personel';
  const hasActiveDraft = Boolean(activeDraft);
  const activeLineCount = activeDraft?.lines.length ?? 0;
  const activeTotalQuantity = activeDraft?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

  return (
    <View style={styles.container}>
      <TerminalHeader terminalId="T01" branch={session?.branch ?? 'Merkez Depo'} online={!session?.offlineMode} />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 56 }]}>
        <ToastMessage message={systemMessage} tone="info" />
        <View style={styles.quickBar}>
          {quickActions.map((action) => (
            <Pressable key={action.label} onPress={() => onNavigate(action.screen)} style={({ pressed }) => [styles.quickButton, action.tone === 'primary' && styles.quickPrimary, action.tone === 'dark' && styles.quickDark, pressed && styles.pressed]}>
              <Text style={[styles.quickText, (action.tone === 'primary' || action.tone === 'dark') && styles.quickTextLight]}>{action.label}</Text>
              {action.screen === 'messages' && unreadCount > 0 ? <View style={styles.quickUnreadDot}><Text style={styles.quickUnreadText}>{unreadCount}</Text></View> : null}
            </Pressable>
          ))}
        </View>
        {urgentCount > 0 ? (
          <Pressable onPress={() => onNavigate('messages')} style={({ pressed }) => [styles.urgentAlert, pressed && styles.pressed]}>
            <Text style={styles.urgentAlertText}>Acil mesaj var</Text>
            <Text style={styles.urgentAlertCount}>{urgentCount}</Text>
          </Pressable>
        ) : null}
        <View style={styles.welcome}>
          <View>
            <Text style={styles.welcomeTitle}>Hoş geldin, {personName}</Text>
            <Text style={styles.welcomeSubtitle}>Bugünkü işlemler hazır</Text>
          </View>
          <View style={styles.terminalBadge}>
            <Text style={styles.terminalBadgeText}>T01</Text>
          </View>
        </View>

        <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.startSale, pressed && styles.pressed]}>
          <View>
            <Text style={styles.startSaleText}>+ Yeni Fiş Başlat</Text>
            <Text style={styles.startSaleHint}>Müşteri seç, ürünü okut</Text>
          </View>
          <View style={styles.startArrow}>
            <Text style={styles.startArrowText}>›</Text>
          </View>
        </Pressable>

        <View style={styles.summaryGrid}>
          <SummaryBox label="Açık Fiş" value={documents.length.toString()} />
          <SummaryBox label="Mesaj" value={unreadCount.toString()} tone={unreadCount > 0 ? 'danger' : 'dark'} />
          <SummaryBox label="Kuyruk" value={failedCount.toString()} tone={failedCount > 0 ? 'warning' : 'dark'} />
          <SummaryBox label="Senkron" value={lastSync} />
        </View>

        <View style={styles.activeCard}>
          <View style={styles.activeCardTop}>
            <Text style={styles.activeCardTitle}>Son aktif fiş</Text>
            {hasActiveDraft ? <StatusPill label="Hazır" tone="success" /> : <StatusPill label="Boş" tone="dark" />}
          </View>
          {hasActiveDraft && activeDraft ? (
            <>
              <View style={styles.documentHeader}>
                <Text style={styles.documentNo}>{activeDraft.documentNo}</Text>
                <Text style={styles.itemCount}>{activeLineCount} kalem · {activeTotalQuantity} adet</Text>
              </View>
              <View style={styles.activeDocRow}>
                <View style={styles.activeMeta}>
                  <Text style={styles.customerLabel}>Müşteri</Text>
                  <Text style={styles.customerName} numberOfLines={1}>{activeDraft.customerName}</Text>
                </View>
                <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
                  <Text style={styles.continueText}>Devam Et</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.activeDocRow}>
              <View style={styles.activeMeta}>
                <Text style={styles.documentNoMuted}>Aktif fiş yok</Text>
                <Text style={styles.customerName}>Yeni fiş başlatabilirsiniz</Text>
              </View>
              <Pressable onPress={() => onNavigate('newSale')} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
                <Text style={styles.continueText}>Yeni Fiş</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.menuGrid}>
          {modules.map((module) => (
            <Pressable key={module.screen} onPress={() => onNavigate(module.screen)} style={({ pressed }) => [styles.module, pressed && styles.pressed]}>
              <View style={styles.moduleAccent} />
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{module.code}</Text>
              </View>
              <View style={styles.moduleTextBlock}>
                <Text style={styles.moduleText}>{module.label}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              {module.screen === 'messages' && unreadCount > 0 ? <View style={styles.moduleUnreadBadge}><Text style={styles.moduleUnreadText}>{unreadCount}</Text></View> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>Terminal hazır · Veriler cihazda korunur</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: string;
  tone?: 'dark' | 'danger' | 'warning';
};

function SummaryBox({ label, value, tone = 'dark' }: SummaryBoxProps) {
  return (
    <View style={styles.summaryBox}>
      <Text style={[styles.summaryValue, tone === 'danger' && styles.summaryDanger, tone === 'warning' && styles.summaryWarning]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  quickBar: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.anthracite,
    ...shadows.subtle,
  },
  quickPrimary: {
    backgroundColor: colors.red,
    borderColor: colors.redDark,
    borderBottomColor: colors.anthracite,
  },
  quickDark: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
    borderBottomColor: colors.red,
  },
  quickText: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickTextLight: {
    color: colors.surface,
  },
  quickUnreadDot: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickUnreadText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  urgentAlert: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.red,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentAlertText: {
    color: colors.red,
    fontSize: typography.body,
    fontWeight: '900',
  },
  urgentAlertCount: {
    minWidth: 24,
    textAlign: 'center',
    color: colors.surface,
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    overflow: 'hidden',
    fontSize: typography.small,
    fontWeight: '900',
    paddingVertical: 2,
  },
  welcome: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.subtle,
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
    marginTop: 2,
  },
  terminalBadge: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.md,
    minWidth: 40,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
  },
  terminalBadgeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.body,
  },
  startSale: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.redDark,
    borderBottomWidth: 3,
    borderBottomColor: colors.anthracite,
    ...shadows.subtle,
  },
  pressed: {
    opacity: 0.86,
  },
  startSaleText: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
  },
  startSaleHint: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '800',
    marginTop: 2,
  },
  startArrow: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startArrowText: {
    color: colors.red,
    fontSize: 23,
    lineHeight: 24,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryBox: {
    flex: 1,
    minWidth: '23%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: 3,
    borderTopWidth: 2,
    borderTopColor: colors.anthracite,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    ...shadows.subtle,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  summaryDanger: {
    color: colors.red,
  },
  summaryWarning: {
    color: colors.amber,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
    marginTop: 2,
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  activeCardTitle: {
    color: colors.anthracite,
    fontSize: typography.body,
    fontWeight: '900',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  module: {
    width: '48.7%',
    minHeight: 62,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.subtle,
  },
  moduleAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.red,
  },
  codeBox: {
    width: 36,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  moduleTextBlock: {
    flex: 1,
    gap: 2,
  },
  moduleText: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  moduleDescription: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  moduleUnreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.redDark,
  },
  moduleUnreadText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '900',
  },
  activeDocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  documentNo: {
    color: colors.red,
    fontSize: typography.section,
    fontWeight: '900',
  },
  itemCount: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '900',
  },
  documentNoMuted: {
    color: colors.muted,
    fontSize: typography.section,
    fontWeight: '900',
  },
  activeMeta: {
    flex: 1,
    gap: 2,
  },
  customerLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  customerName: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  continueButton: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  continueText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: typography.small,
  },
  footerNote: {
    backgroundColor: colors.anthracite,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
  },
  footerNoteText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
});
