import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';

type HoneywellPreviewFrameProps = {
  children: ReactNode;
};

export function HoneywellPreviewFrame({ children }: HoneywellPreviewFrameProps) {
  return (
    <View style={styles.stage}>
      <View style={styles.device}>
        <View style={styles.topCap}>
          <View style={styles.speaker} />
          <Text style={styles.deviceLabel}>MELISA TERMINAL · T01</Text>
          <Text style={styles.deviceSubLabel}>ANDROID OPERATION HANDHELD</Text>
        </View>

        <View style={styles.screenBezel}>
          <View style={styles.screen}>{children}</View>
        </View>

        <View style={styles.keyArea}>
          <View style={styles.scanButton}>
            <Text style={styles.scanText}>SCAN</Text>
          </View>
          <View style={styles.keyRow}>
            <View style={styles.smallKey} />
            <View style={styles.navKey} />
            <View style={styles.smallKey} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#e7eaee',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  device: {
    width: 430,
    minHeight: 820,
    backgroundColor: colors.anthracite,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#111820',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  topCap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  speaker: {
    width: 82,
    height: 7,
    borderRadius: radius.sm,
    backgroundColor: '#10151b',
    borderWidth: 1,
    borderColor: colors.anthraciteSoft,
  },
  deviceLabel: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  deviceSubLabel: {
    color: '#9ca5b0',
    fontSize: 10,
    fontWeight: '800',
  },
  screenBezel: {
    backgroundColor: '#0c1015',
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2d3540',
  },
  screen: {
    width: 375,
    height: 667,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  keyArea: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  scanButton: {
    width: 138,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.redDark,
  },
  scanText: {
    color: colors.surface,
    fontSize: typography.small,
    fontWeight: '900',
  },
  keyRow: {
    width: 210,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallKey: {
    width: 46,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: '#141a21',
    borderWidth: 1,
    borderColor: '#3d4652',
  },
  navKey: {
    width: 72,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10151b',
    borderWidth: 1,
    borderColor: '#3d4652',
  },
});
