import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../app/theme';

type TerminalStatusBarProps = {
  terminalId?: string;
  branch?: string;
  online?: boolean;
};

export function TerminalStatusBar({ terminalId = 'T01', branch = 'Merkez Depo', online = true }: TerminalStatusBarProps) {
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.bar}>
      <Text style={styles.brand}>MELİSA BEBE</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{terminalId}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.metaText}>{branch}</Text>
        <Text style={[styles.status, online ? styles.online : styles.offline]}>{online ? 'Hazır' : 'Çevrimdışı'}</Text>
        <Text style={styles.metaText}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.anthracite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  brand: {
    color: colors.surface,
    fontSize: typography.section,
    fontWeight: '900',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.line,
    fontSize: typography.small,
    fontWeight: '800',
  },
  dot: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  status: {
    fontSize: typography.small,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  online: {
    color: colors.surface,
    backgroundColor: colors.success,
  },
  offline: {
    color: colors.surface,
    backgroundColor: colors.red,
  },
});
