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
  /** 'hero' = 144px glowing disc with a waveform and the icon as a corner
   * badge (Stitch S-05 Empty Search); 'default' = 64px icon circle. */
  variant?: 'default' | 'hero';
  /** Leading icon on the CTA. */
  actionIcon?: string;
};

/** Icon-in-circle → title → hint → CTA pattern, shared by empty and error states. */
export function EmptyState({ icon, title, hint, actionLabel, onActionPress, tone = 'neutral', variant = 'default', actionIcon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {variant === 'hero' ? (
        <View style={styles.heroGlow}>
          <View style={styles.heroDisc}>
            <Icon name="graphic-eq" size={56} color={Colors.primary} />
          </View>
          <View style={styles.heroBadge}>
            <Icon name={icon} size={20} color={Colors.text.high} />
          </View>
        </View>
      ) : (
        <View style={[styles.iconCircle, tone === 'error' && styles.iconCircleError]}>
          <Icon name={icon} size={32} color={tone === 'error' ? Colors.error : Colors.text.medium} />
        </View>
      )}
      <ThemedText variant="headline-sm" style={styles.title}>
        {title}
      </ThemedText>
      {hint && (
        <ThemedText variant="body-md" emphasis="medium" style={styles.hint}>
          {hint}
        </ThemedText>
      )}
      {actionLabel && onActionPress && (
        <PillButton label={actionLabel} leadingIcon={actionIcon} onPress={onActionPress} style={styles.action} />
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
  heroGlow: {
    width: 144,
    height: 144,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroDisc: {
    width: 104,
    height: 104,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
