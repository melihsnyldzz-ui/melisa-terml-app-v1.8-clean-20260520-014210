import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'dark';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, { backgroundColor: string; color: string; borderColor: string }> = {
  success: { backgroundColor: colors.successSoft, color: colors.success, borderColor: '#bce7c8' },
  warning: { backgroundColor: colors.warningSoft, color: colors.amber, borderColor: '#efd5a7' },
  danger: { backgroundColor: colors.dangerSoft, color: colors.red, borderColor: '#f3bcc5' },
  info: { backgroundColor: colors.surfaceSoft, color: colors.anthracite, borderColor: colors.line },
  dark: { backgroundColor: colors.anthracite, color: colors.surface, borderColor: colors.anthracite },
};

export function StatusPill({ label, tone = 'info' }: StatusPillProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }]}>
      <Text style={[styles.text, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

export function statusToneFor(label: string): StatusTone {
  if (['Açık', 'Hazır', 'Okundu', 'Başarılı', 'Tamamlandı', 'Senkronlandı', 'OK'].includes(label)) return 'success';
  if (['Beklemede', 'Taslak', 'Uyarı', 'Çevrimdışı'].includes(label)) return 'warning';
  if (['Gönderilemedi', 'Acil', 'Okunmadı', 'Hata'].includes(label)) return 'danger';
  return 'info';
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.small,
    fontWeight: '900',
  },
});
