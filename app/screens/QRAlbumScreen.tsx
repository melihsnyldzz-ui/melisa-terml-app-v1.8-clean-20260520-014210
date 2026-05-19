import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { notifyMessage, notifySuccess, notifyWarning } from '../../services/feedback';
import { loadActiveSaleDraft } from '../../storage/localStorage';
import type { ActiveSaleDraft, AppScreen } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type QRAlbumScreenProps = {
  onBack: () => void;
  onNavigate?: (screen: AppScreen) => void;
};

const qrDarkCells = [0, 1, 2, 4, 6, 7, 9, 10, 12, 14, 17, 18, 20, 21, 24, 26, 28, 31, 32, 34, 35, 37, 39, 40, 42, 45, 47, 48];

export function QRAlbumScreen({ onBack, onNavigate }: QRAlbumScreenProps) {
  const [draft, setDraft] = useState<ActiveSaleDraft | null>(null);
  const [albumReady, setAlbumReady] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadActiveSaleDraft().then(setDraft);
  }, []);

  const totalQuantity = useMemo(() => draft?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0, [draft]);
  const albumStatus = albumReady || (draft?.lines.length ?? 0) > 0 ? 'Hazır' : 'Taslak';
  const albumLink = draft ? `melisababy.com/a/${draft.documentNo}-x8Kp92` : '';
  const shortLink = draft ? `melisababy.com/a/${draft.documentNo}` : '';

  const showAction = (message: string, feedback: 'success' | 'message' = 'success') => {
    if (!draft || draft.lines.length === 0) {
      setBanner({ message: 'Albüm için ürün eklenmiş aktif fiş gerekli.', tone: 'warning' });
      notifyWarning();
      return;
    }

    setAlbumReady(true);
    setBanner({ message, tone: 'success' });
    if (feedback === 'message') {
      notifyMessage();
      return;
    }
    notifySuccess();
  };

  return (
    <ScreenShell title="QR Albüm" subtitle="Müşteri vitrini" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      {!draft ? (
        <EmptyState
          badge="QR"
          title="QR albüm hazırlanacak fiş yok"
          description="Yeni fiş başlatıp ürün eklediğinizde albüm burada hazırlanır."
          actionLabel={onNavigate ? 'Yeni Fişe Git' : undefined}
          onAction={onNavigate ? () => onNavigate('newSale') : undefined}
        />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryTitleBlock}>
                <Text style={styles.summaryKicker}>Müşteri albümü</Text>
                <Text style={styles.documentNo}>{draft.documentNo}</Text>
              </View>
              <StatusPill label={albumStatus} tone={albumStatus === 'Hazır' ? 'success' : 'warning'} />
            </View>
            <Text style={styles.customerName} numberOfLines={1}>{draft.customerName}</Text>
            <View style={styles.metricGrid}>
              <Metric label="Ürün kalemi" value={draft.lines.length.toString()} />
              <Metric label="Toplam adet" value={totalQuantity.toString()} />
            </View>
            <View style={styles.priceGuard}>
              <Text style={styles.priceGuardText}>Fiyat gösterilmez</Text>
            </View>
          </View>

          <View style={styles.qrPanel}>
            <View style={styles.qrTopRow}>
              <Text style={styles.panelTitle}>Güvenli QR bağlantısı</Text>
              <StatusPill label={albumStatus} tone={albumStatus === 'Hazır' ? 'success' : 'warning'} />
            </View>
            <View style={styles.qrBox}>
              <View style={styles.qrGrid}>
                {Array.from({ length: 49 }).map((_, index) => (
                  <View key={index} style={[styles.qrCell, qrDarkCells.includes(index) && styles.qrCellDark]} />
                ))}
              </View>
            </View>
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Albüm bağlantısı</Text>
              <Text style={styles.qrLink} numberOfLines={1} ellipsizeMode="middle">{albumLink}</Text>
            </View>
          </View>

          <View style={styles.whatsappCard}>
            <Text style={styles.whatsappTitle}>WhatsApp mesaj önizlemesi</Text>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>Merhaba, aldığınız ürünlerin görsellerine aşağıdaki bağlantıdan ulaşabilirsiniz.</Text>
              <Text style={styles.messageLink} numberOfLines={1}>{shortLink}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {draft.lines.map((item) => (
              <View key={item.lineId} style={styles.productCard}>
                <View style={styles.imageBox}>
                  <Text style={styles.imageCode}>{item.code}</Text>
                  <View style={styles.imageAccent} />
                  <Text style={styles.imageText}>Ürün görseli</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productCode}>{item.code}</Text>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.productMetaRow}>
                    <Text style={styles.productMeta}>{item.color}</Text>
                    <Text style={styles.productMeta}>{item.size}</Text>
                    <Text style={styles.quantityBadge}>Adet {item.quantity}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actionGrid}>
            <ActionRow
              actions={[
                { label: 'QR Oluştur / Yenile', onPress: () => showAction('QR albüm hazırlandı.'), variant: 'primary' },
                { label: 'Linki Kopyala', onPress: () => showAction('Albüm bağlantısı kopyalandı.', 'message'), variant: 'secondary' },
              ]}
            />
            <ActionRow
              actions={[
                { label: 'WhatsApp ile Gönder', onPress: () => showAction('WhatsApp mesajı hazırlandı.', 'message'), variant: 'dark' },
                { label: 'Görselleri Hazırla', onPress: () => showAction('Ürün görselleri hazırlandı.'), variant: 'quiet' },
              ]}
            />
          </View>
        </>
      )}
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

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  summaryTitleBlock: { flex: 1, gap: 2 },
  summaryKicker: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  documentNo: { color: colors.red, fontSize: typography.section, fontWeight: '900' },
  customerName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', gap: spacing.xs },
  metricBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  metricValue: { color: colors.anthracite, fontSize: typography.section, fontWeight: '900', textAlign: 'center' },
  metricLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  priceGuard: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  priceGuardText: { color: colors.surface, fontSize: typography.small, fontWeight: '900' },
  qrPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrTopRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  panelTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  qrBox: {
    width: 118,
    height: 118,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrGrid: {
    width: 84,
    height: 84,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  qrCell: { width: 10, height: 10, backgroundColor: colors.surfaceSoft },
  qrCellDark: { backgroundColor: colors.anthracite },
  linkBox: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  qrLink: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  whatsappCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#bce7c8',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  whatsappTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  messageBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  messageText: { color: colors.text, fontSize: typography.body, fontWeight: '700', lineHeight: 17 },
  messageLink: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  grid: { gap: spacing.sm },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageBox: {
    width: 72,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  imageCode: { color: colors.red, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  imageAccent: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.anthracite },
  imageText: { color: colors.anthracite, fontSize: 10, fontWeight: '800' },
  productInfo: { flex: 1, gap: spacing.xs },
  productCode: { color: colors.red, fontSize: typography.small, fontWeight: '900' },
  productName: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  productMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  productMeta: { color: colors.muted, fontWeight: '800', fontSize: typography.small },
  quantityBadge: {
    color: colors.surface,
    backgroundColor: colors.anthracite,
    overflow: 'hidden',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: typography.small,
    fontWeight: '900',
  },
  actionGrid: { gap: spacing.xs },
});
