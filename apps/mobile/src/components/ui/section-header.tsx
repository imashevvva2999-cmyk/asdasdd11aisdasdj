import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { TextLinkButton } from './button';
import { ThemedText } from '../themed-text';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

/** Section title + optional "See All" link — recurring pattern (docs/screens.md §3.9). */
export function SectionHeader({ title, actionLabel = 'See All', onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText variant="headline-sm">{title}</ThemedText>
      {onActionPress && <TextLinkButton label={actionLabel} onPress={onActionPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
});
