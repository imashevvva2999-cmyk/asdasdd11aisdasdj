import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from '../themed-text';

export type FormCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Surface Level 1 card grouping form fields (Stitch Artist Setup / Upload
 * Track). Fields inside should use `<TextField raised />` so they read
 * against the card.
 */
export function FormCard({ children, style }: FormCardProps) {
  return <View style={[formStyles.card, style]}>{children}</View>;
}

export type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

/** Two-or-more option toggle on an L1 track; the selected segment is raised
 * to L2 with high-emphasis bold text (Stitch Upload Track "Schedule Release"). */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, style }: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[segmentStyles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            style={[segmentStyles.segment, selected && segmentStyles.segmentSelected]}
          >
            <ThemedText variant="label-lg" emphasis={selected ? 'high' : 'medium'}>
              {option.label}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const formStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.md,
    gap: Spacing.md,
  },
});

const segmentStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: Radii.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: Colors.surface.l2,
  },
});
