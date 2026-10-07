import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { ThemedText } from '../themed-text';

export type BadgeProps = {
  label: string;
  /** explicit = "E" outline marker. lossless = gold label. editorial = L2 pill.
   * neutral = plain L3 pill (generic use). */
  variant?: 'explicit' | 'lossless' | 'editorial' | 'neutral';
  style?: ViewStyle;
};

/** Small inline marker — E / LOSSLESS / Editorial (docs/screens.md §3.9). */
export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  if (variant === 'explicit') {
    return (
      <View style={[styles.explicit, style]}>
        <ThemedText variant="label-sm" emphasis="medium">
          {label}
        </ThemedText>
      </View>
    );
  }

  if (variant === 'lossless') {
    return (
      <ThemedText variant="label-sm" emphasis="primary" style={{ color: Colors.secondary, letterSpacing: 0.6 }}>
        {label}
      </ThemedText>
    );
  }

  return (
    <View style={[styles.pill, variant === 'editorial' ? styles.editorial : styles.neutral, style]}>
      <ThemedText variant="label-sm" emphasis="medium">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  explicit: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.text.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  editorial: {
    backgroundColor: Colors.surface.l2,
  },
  neutral: {
    backgroundColor: Colors.surface.l3,
  },
});
