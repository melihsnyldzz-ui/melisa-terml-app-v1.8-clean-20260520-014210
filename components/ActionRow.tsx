import { StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import { AppButton } from './AppButton';

type ActionItem = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'quiet';
};

type ActionRowProps = {
  actions: ActionItem[];
};

export function ActionRow({ actions }: ActionRowProps) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <View key={action.label} style={[styles.item, actions.length > 2 && styles.tightItem]}>
          <AppButton label={action.label} onPress={action.onPress} variant={action.variant ?? 'quiet'} compact />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  item: {
    flex: 1,
    minWidth: '48%',
  },
  tightItem: {
    minWidth: '31%',
  },
});
