import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../app/theme';
import { APP_VERSION } from '../app/version';
import { StatusPill } from './StatusPill';

type TerminalHeaderProps = {
  title?: string;
  terminalId?: string;
  branch?: string;
  online?: boolean;
  onBack?: () => void;
};

export function TerminalHeader({ title = 'MELİSA BEBE', terminalId = 'T01', branch = 'Merkez Depo', online = true, onBack }: TerminalHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>GERİ</Text>
          </Pressable>
        ) : null}
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>{title}</Text>
          <Text style={styles.subBrand}>Saha Terminali</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{APP_VERSION}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>{terminalId}</Text>
        </View>
        <Text style={styles.meta}>{branch}</Text>
        <StatusPill label={online ? 'Hazır' : 'Çevrimdışı'} tone={online ? 'success' : 'warning'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.red,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  backText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  brandBlock: {
    flex: 1,
  },
  brand: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
  },
  subBrand: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
  },
  versionBadge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.anthraciteSoft,
    backgroundColor: '#161b22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  versionText: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaLabel: {
    color: colors.anthracite,
    fontSize: typography.small,
    fontWeight: '900',
  },
  meta: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
  },
});
