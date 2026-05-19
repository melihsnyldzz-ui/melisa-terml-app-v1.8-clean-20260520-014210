import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../app/theme';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastMessageProps = {
  message?: string;
  tone?: ToastTone;
};

const toneStyles: Record<ToastTone, { backgroundColor: string; borderColor: string; color: string }> = {
  success: { backgroundColor: colors.successSoft, borderColor: colors.success, color: colors.success },
  error: { backgroundColor: colors.dangerSoft, borderColor: colors.red, color: colors.red },
  warning: { backgroundColor: colors.warningSoft, borderColor: colors.amber, color: colors.amber },
  info: { backgroundColor: colors.surfaceSoft, borderColor: colors.anthracite, color: colors.anthracite },
};

export function ToastMessage({ message, tone = 'info' }: ToastMessageProps) {
  if (!message) return null;
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.banner, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }]}>
      <View style={[styles.dot, { backgroundColor: toneStyle.borderColor }]} />
      <Text style={[styles.text, { color: toneStyle.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.subtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 18,
  },
});
