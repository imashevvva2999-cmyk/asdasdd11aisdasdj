import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui';
import { Colors } from '@/constants/theme';

/**
 * A quiet, unmistakable demo label for flows that look like real MBANK
 * payments but move no money (support, its receipt and history). No backend
 * or payment integration exists yet (OQ-10, OQ-44).
 */
export function DemoNotice({ text, style }: { text: string; style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]} accessibilityRole="text">
      <Icon name="info-outline" size={16} color={Colors.text.medium} />
      <ThemedText variant="label-md" emphasis="medium">
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
