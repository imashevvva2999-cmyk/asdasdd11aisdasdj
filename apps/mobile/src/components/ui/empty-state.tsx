import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { PillButton } from './button';
import { Icon } from './icon';
import { ThemedText } from '../themed-text';

export type EmptyStateProps = {
  icon: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  /** 'error' tints the icon red instead of neutral (same icon→title→hint→CTA shape
   * covers both empty and error states — docs/screens.md §3.8, §3.17). */
  tone?: 'neutral' | 'error';
};

/** Icon-in-circle → title → hint → CTA pattern, shared by empty and error states. */
export function EmptyState({ icon, title, hint, actionLabel, onActionPress, tone = 'neutral' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, tone === 'error' && styles.iconCircleError]}>
        <Icon name={icon} size={32} color={tone === 'error' ? Colors.error : Colors.text.medium} />
      </View>
      <ThemedText variant="headline-sm" style={styles.title}>
        {title}
      </ThemedText>
      {hint && (
        <ThemedText variant="body-md" emphasis="medium" style={styles.hint}>
          {hint}
        </ThemedText>
      )}
      {actionLabel && onActionPress && (
        <PillButton label={actionLabel} onPress={onActionPress} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.margin,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  iconCircleError: {
    backgroundColor: 'rgba(255, 75, 75, 0.12)',
  },
  title: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.md,
  },
});
