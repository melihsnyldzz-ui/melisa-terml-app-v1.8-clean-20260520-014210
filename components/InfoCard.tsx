import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../app/theme';

type InfoCardProps = {
  title: string;
  subtitle?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning' | 'dark';
  children?: ReactNode;
};

export function InfoCard({ title, subtitle, tone = 'default', children }: InfoCardProps) {
  const isDark = tone === 'dark';

  return (
    <View style={[styles.card, styles[tone]]}>
      <View style={[styles.accent, isDark && styles.darkAccent]} />
      <Text style={[styles.title, isDark && styles.darkTitle]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomWidth: 2,
    gap: spacing.xs,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.red,
  },
  darkAccent: {
    backgroundColor: colors.red,
  },
  default: {
    borderColor: colors.line,
    borderBottomColor: '#c5cbd3',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#f3bcc5',
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: '#bce7c8',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: '#efd5a7',
  },
  dark: {
    backgroundColor: colors.anthracite,
    borderColor: colors.anthracite,
    borderBottomColor: colors.red,
  },
  title: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
  },
  darkTitle: {
    color: colors.surface,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 18,
    fontWeight: '700',
  },
  darkSubtitle: {
    color: colors.line,
  },
});
