import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoCard } from '../../components/InfoCard';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { fetchTerminalBootstrapData } from '../../services/api';
import { loadSettings, saveBootstrapCache } from '../../storage/localStorage';
import { colors, radius, spacing, typography } from '../theme';

type DataUpdateScreenProps = {
  onBack: () => void;
};

export function DataUpdateScreen({ onBack }: DataUpdateScreenProps) {
  const [lastSync, setLastSync] = useState('Bugün 09:40');
  const [progress, setProgress] = useState('Bekliyor');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  const updateData = async () => {
    setProgress('Güncelleniyor');
    try {
      const settings = await loadSettings();
      const bootstrapData = await fetchTerminalBootstrapData(settings.apiBaseUrl);
      await saveBootstrapCache(bootstrapData);
      const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setLastSync(`Bugün ${nextSync}`);
      setProgress('Tamamlandı');
      setBanner({ message: `${bootstrapData.products.length} ürün ve ${bootstrapData.customers.length} müşteri güncellendi.`, tone: 'success' });
    } catch (error) {
      setProgress('Hata');
      setBanner({ message: error instanceof Error ? error.message : 'Veri güncelleme başarısız.', tone: 'warning' });
    }
  };

  return (
    <ScreenShell title="Veri Güncelle" subtitle="Ürün ve stok kontrolü" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>Son güncelleme</Text>
          <StatusPill label={lastSync} tone="dark" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Durum</Text>
          <StatusPill label={progress} tone={progress === 'Tamamlandı' ? 'success' : 'warning'} />
        </View>
        <AppButton label="Veri Güncelle" onPress={updateData} />
      </View>
      <InfoCard title="Çevrimdışı güvenlik" subtitle="Bekleyen belgeler korunur." tone="success" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
});
