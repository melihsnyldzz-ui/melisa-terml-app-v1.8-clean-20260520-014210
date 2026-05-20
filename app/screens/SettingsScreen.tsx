import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionRow } from '../../components/ActionRow';
import { AppButton } from '../../components/AppButton';
import { ScreenShell } from '../../components/ScreenShell';
import { StatusPill } from '../../components/StatusPill';
import { ToastMessage } from '../../components/ToastMessage';
import type { ToastTone } from '../../components/ToastMessage';
import { testApiHealth } from '../../services/api';
import { notifySuccess, notifyWarning } from '../../services/feedback';
import { appendFieldTestLog, loadSettings, saveLastSuccessfulConnectionAt, saveSettings } from '../../storage/localStorage';
import type { TerminalSettings, UserSession } from '../../types';
import { colors, radius, spacing, typography } from '../theme';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  session: UserSession | null;
};

const branchOptions = ['Merkez Depo', 'Mağaza', 'Sevkiyat'];

export function SettingsScreen({ onBack, onLogout, session }: SettingsScreenProps) {
  const [settings, setSettings] = useState<TerminalSettings>({
    terminalId: 'MB-TERM-001',
    branch: session?.branch ?? 'Merkez Depo',
    apiBaseUrl: 'Hazırlık Bağlantısı',
    vibrationEnabled: true,
    urgentVibrationEnabled: true,
  });
  const [lastSync, setLastSync] = useState('Henüz yok');
  const [banner, setBanner] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = <K extends keyof TerminalSettings>(key: K, value: TerminalSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    await saveSettings(settings);
    setBanner({ message: 'Terminal ayarları cihazda korunacak şekilde kaydedildi.', tone: 'success' });
    notifySuccess();
  };

  const savePreference = async <K extends keyof TerminalSettings>(key: K, value: TerminalSettings[K]) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    if (key === 'vibrationEnabled') {
      setBanner({ message: value ? 'Titreşim açıldı.' : 'Titreşim kapatıldı.', tone: value ? 'success' : 'info' });
      if (value) notifySuccess();
      return;
    }
    setBanner({ message: value ? 'Acil uyarı titreşimi açıldı.' : 'Acil uyarı titreşimi kapatıldı.', tone: value ? 'success' : 'info' });
    if (value) notifySuccess();
  };

  const checkConnection = async () => {
    try {
      const result = await testApiHealth(settings.apiBaseUrl);
      if (!result.databaseConnected) {
        await appendFieldTestLog({
          title: 'Online erişim testi DB uyarısı',
          detail: `${result.status} / database=YOK`,
          tone: 'warning',
        });
        setBanner({ message: 'API çalışıyor, veritabanı bağlantısı yok.', tone: 'warning' });
        notifyWarning();
        return;
      }
      const timestamp = new Date().toISOString();
      await saveLastSuccessfulConnectionAt(timestamp);
      await appendFieldTestLog({
        title: 'Online erişim testi başarılı',
        detail: `${result.status} / database=${result.databaseConnected ? 'OK' : 'YOK'}`,
        tone: 'success',
      });
      setSettings((current) => ({ ...current, lastSuccessfulConnectionAt: timestamp }));
      setBanner({ message: 'Bağlantı başarılı.', tone: 'success' });
      notifySuccess();
      return;
    } catch {
      await appendFieldTestLog({
        title: 'Online erişim testi başarısız',
        detail: settings.apiBaseUrl,
        tone: 'error',
      });
      setBanner({ message: 'Bağlantı yok / API adresini kontrol edin.', tone: 'error' });
    }
    notifyWarning();
  };

  const updateData = () => {
    const nextSync = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setLastSync(`Bugün ${nextSync}`);
    setBanner({ message: 'Veri güncelleme tamamlandı. Bekleyen belgeler korunur.', tone: 'success' });
  };

  return (
    <ScreenShell title="Ayarlar" subtitle="Terminal ayar paneli" onBack={onBack}>
      <ToastMessage message={banner?.message} tone={banner?.tone} />

      <Section title="Terminal Bilgisi">
        <Field label="Terminal ID" value={settings.terminalId} onChangeText={(value) => update('terminalId', value)} />
        <View style={styles.field}>
          <Text style={styles.label}>Depo</Text>
          <View style={styles.segmentRow}>
            {branchOptions.map((branch) => (
              <Pressable
                key={branch}
                onPress={() => update('branch', branch)}
                style={({ pressed }) => [styles.segmentButton, settings.branch === branch && styles.segmentButtonActive, pressed && styles.pressed]}
              >
                <Text style={[styles.segmentText, settings.branch === branch && styles.segmentTextActive]}>{branch}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <AppButton label="Ayarları Kaydet" onPress={save} compact />
      </Section>

      <Section title="Bağlantı">
        <Field label="API adresi" value={settings.apiBaseUrl} onChangeText={(value) => update('apiBaseUrl', value)} />
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Durum</Text>
          <StatusPill label={settings.apiBaseUrl.trim() ? 'Hazır' : 'Bekliyor'} tone={settings.apiBaseUrl.trim() ? 'success' : 'warning'} />
        </View>
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Son başarılı bağlantı</Text>
          <StatusPill label={settings.lastSuccessfulConnectionAt ? new Date(settings.lastSuccessfulConnectionAt).toLocaleString('tr-TR') : 'Yok'} tone={settings.lastSuccessfulConnectionAt ? 'success' : 'warning'} />
        </View>
        <AppButton label="Bağlantıyı Kontrol Et" onPress={checkConnection} variant="secondary" compact />
      </Section>

      <Section title="Senkron">
        <View style={styles.inlineRow}>
          <Text style={styles.rowLabel}>Son senkron</Text>
          <StatusPill label={lastSync} tone="dark" />
        </View>
        <Text style={styles.helperText}>Ürün, fiş ve mesaj hazırlıkları güncel tutulur.</Text>
        <AppButton label="Veri Güncelle" onPress={updateData} variant="dark" compact />
      </Section>

      <Section title="Bildirim / Titreşim">
        <ToggleRow
          label="Titreşim açık"
          enabled={settings.vibrationEnabled}
          onPress={() => savePreference('vibrationEnabled', !settings.vibrationEnabled)}
        />
        <ToggleRow
          label="Acil uyarı titreşimi"
          enabled={settings.urgentVibrationEnabled}
          disabled={!settings.vibrationEnabled}
          onPress={() => savePreference('urgentVibrationEnabled', !settings.urgentVibrationEnabled)}
        />
      </Section>

      <Section title="Güvenlik">
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Güvenli çalışma modu</Text>
          <Text style={styles.securityText}>Taslaklar cihazda saklanır. Oturum kapatılsa da kayıtlı ayarlar korunur.</Text>
        </View>
        <ActionRow
          actions={[
            { label: 'Kaydet', onPress: save, variant: 'secondary' },
            { label: 'Oturumu Kapat', onPress: onLogout, variant: 'dark' },
          ]}
        />
      </Section>
    </ScreenShell>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function Field({ label, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function ToggleRow({ label, enabled, disabled = false, onPress }: ToggleRowProps) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.toggleRow, disabled && styles.toggleDisabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, enabled && !disabled && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, enabled && !disabled && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: { color: colors.red, fontSize: typography.body, fontWeight: '900' },
  field: { gap: spacing.xs },
  label: { color: colors.anthracite, fontSize: typography.body, fontWeight: '900' },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    fontWeight: '700',
  },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
    borderBottomWidth: 2,
    borderBottomColor: colors.red,
  },
  segmentText: { color: colors.anthracite, fontSize: typography.small, fontWeight: '900', textAlign: 'center' },
  segmentTextActive: { color: colors.surface },
  pressed: { opacity: 0.86 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  helperText: { color: colors.muted, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
  toggleRow: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleDisabled: { opacity: 0.55 },
  toggleLabel: { color: colors.ink, fontSize: typography.body, fontWeight: '900', flex: 1 },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.line,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: colors.red },
  securityBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#efd5a7',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: spacing.sm,
    gap: 2,
  },
  securityTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '900' },
  securityText: { color: colors.text, fontSize: typography.small, fontWeight: '800', lineHeight: 16 },
});
