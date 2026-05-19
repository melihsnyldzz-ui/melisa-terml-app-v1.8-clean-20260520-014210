import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { EmptyState } from '../../components/EmptyState';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill, statusToneFor } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { getOpenDocumentsMock } from '../../services/api';
import type { AppScreen, OpenDocument, OpenDocumentStatus } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type OpenDocumentsScreenProps = {
  onBack: () => void;
  onNavigate: (screen: AppScreen) => void;
};

type DocumentFilter = 'Tümü' | OpenDocumentStatus | 'Hatalı';

const filters: DocumentFilter[] = ['Tümü', 'Açık', 'Beklemede', 'Hatalı'];
const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export function OpenDocumentsScreen({ onBack, onNavigate }: OpenDocumentsScreenProps) {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    getOpenDocumentsMock().then(setDocuments);
  }, []);

  const statusFilteredDocuments = useMemo(() => {
    if (filter === 'Tümü') return documents;
    if (filter === 'Hatalı') return documents.filter((document) => document.status === 'Gönderilemedi');
    return documents.filter((document) => document.status === filter);
  }, [documents, filter]);

  const filteredDocuments = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return statusFilteredDocuments;

    return statusFilteredDocuments.filter((document) => {
      const searchable = `${document.id} ${document.customerName} ${document.status}`;
      return normalizeSearchText(searchable).includes(query);
    });
  }, [searchQuery, statusFilteredDocuments]);

  const totalItems = useMemo(() => filteredDocuments.reduce((sum, document) => sum + document.itemCount, 0), [filteredDocuments]);
  const failedCount = useMemo(() => documents.filter((document) => document.status === 'Gönderilemedi').length, [documents]);

  const openDocument = (documentNo: string) => {
    setBanner({ message: `${documentNo} fişi açılıyor.`, tone: 'info' });
    onNavigate('newSale');
  };

  const prepareAlbum = (documentNo: string) => {
    setBanner({ message: `${documentNo} için QR albüm yönlendirmesi hazır.`, tone: 'info' });
    onNavigate('qrAlbum');
  };

  const sendDocument = (document: OpenDocument) => {
    const message = document.status === 'Gönderilemedi'
      ? `${document.id} tekrar gönderim kuyruğuna alındı.`
      : `${document.id} gönderim için hazırlandı.`;
    setBanner({ message, tone: document.status === 'Gönderilemedi' ? 'warning' : 'success' });
  };

  return (
    <ScreenShell title="Açık Fişler" subtitle={`${filteredDocuments.length} fiş görüntüleniyor`} onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <View style={styles.searchPanel}>
        <Text style={styles.searchLabel}>Fiş / müşteri ara</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Fiş no veya müşteri adı yaz"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={({ pressed }) => [styles.filterButton, filter === item && styles.filterActive, pressed && styles.pressed]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryPanel}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryMainText}>
            <Text style={styles.summaryTitle}>Fiş operasyonları</Text>
            <Text style={styles.summaryText}>Arama ve durum filtresiyle açık işleri hızlı kontrol et.</Text>
          </View>
          <StatusPill label={failedCount > 0 ? `${failedCount} risk` : 'Temiz'} tone={failedCount > 0 ? 'warning' : 'success'} />
        </View>
        <View style={styles.summaryMetricRow}>
          <InfoItem label="Görünen fiş" value={filteredDocuments.length.toString()} />
          <InfoItem label="Toplam ürün" value={totalItems.toString()} />
        </View>
      </View>

      {filteredDocuments.length === 0 ? (
        <EmptyState badge="FİŞ" title="Uygun fiş bulunamadı" description="Arama metnini veya filtreyi değiştirerek tekrar dene." />
      ) : (
        filteredDocuments.map((document) => (
          <View key={document.id} style={[styles.card, document.status === 'Gönderilemedi' && styles.failedCard]}>
            <View style={[styles.cardAccent, document.status === 'Gönderilemedi' && styles.failedAccent]} />
            <View style={styles.topRow}>
              <View style={styles.documentCode}>
                <Text style={styles.documentCodeText}>{document.id}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.customer} numberOfLines={1}>{document.customerName}</Text>
                <Text style={styles.meta}>{document.itemCount} ürün · {document.updatedAt}</Text>
              </View>
              <StatusPill label={document.status} tone={statusToneFor(document.status)} />
            </View>
            <View style={styles.infoRow}>
              <InfoItem label="Ürün adedi" value={document.itemCount.toString()} />
              <InfoItem label="Güncellendi" value={document.updatedAt} />
            </View>
            <ActionRow
              actions={[
                { label: 'Aç', onPress: () => openDocument(document.id), variant: 'quiet' },
                { label: 'QR Albüm', onPress: () => prepareAlbum(document.id), variant: 'secondary' },
                { label: 'Gönder', onPress: () => sendDocument(document), variant: 'primary' },
              ]}
            />
          </View>
        ))
      )}
    </ScreenShell>
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
  searchPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  searchLabel: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  searchInput: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.sm,
    fontWeight: '800',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterButton: {
    flexGrow: 1,
    minWidth: '23%',
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite, borderBottomWidth: 2, borderBottomColor: colors.red },
  filterText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  filterTextActive: { color: colors.surface },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  summaryMainText: { flex: 1, gap: 2 },
  summaryTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '900' },
  summaryText: { color: colors.muted, fontSize: typography.small, fontWeight: '800' },
  summaryMetricRow: { flexDirection: 'row', gap: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  failedCard: { backgroundColor: colors.dangerSoft, borderColor: colors.red },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.anthracite },
  failedAccent: { backgroundColor: colors.red },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  documentCode: {
    width: 64,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCodeText: { color: colors.surface, fontWeight: '900', fontSize: typography.small },
  detail: { flex: 1, gap: 2 },
  customer: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: typography.small, fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: spacing.xs },
  infoItem: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xs,
    gap: 2,
  },
  infoLabel: { color: colors.muted, fontSize: typography.small, fontWeight: '900' },
  infoValue: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900' },
  pressed: { opacity: 0.86 },
});
