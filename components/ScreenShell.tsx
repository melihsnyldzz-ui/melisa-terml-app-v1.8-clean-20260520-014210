import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../app/theme';
import { AppButton } from './AppButton';
import { TerminalHeader } from './TerminalHeader';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
};

export function ScreenShell({ title, subtitle, onBack, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.shell}>
      <TerminalHeader onBack={onBack} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 64 }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {onBack ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppButton label="Ana Menüye Dön" onPress={onBack} variant="dark" compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
    marginTop: 1,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  footer: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
