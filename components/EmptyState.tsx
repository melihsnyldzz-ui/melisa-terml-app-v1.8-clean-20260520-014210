import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';
import { AppButton } from './AppButton';

type EmptyStateProps = {
  badge: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ badge, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  badge: {
    minWidth: 46,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.anthracite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  badgeText: {
    color: colors.surface,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: typography.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
});
