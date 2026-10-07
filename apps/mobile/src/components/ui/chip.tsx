import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from '../themed-text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  /** 'gradient' = coral→flame gradient (default filter selection). 'editorial' = bright
   * white pill with canvas text, used for editorial filtering per DESIGN.md. */
  selectedStyle?: 'gradient' | 'editorial';
  disabled?: boolean;
  style?: ViewStyle;
};

/** Filter / genre / library chip — fixed 32px height (DESIGN.md "Chips & Filter Pills"). */
export function Chip({ label, selected = false, onPress, selectedStyle = 'gradient', disabled = false, style }: ChipProps) {
  const content = (
    <ThemedText
      variant="label-md"
      style={{ color: selected ? (selectedStyle === 'editorial' ? Colors.canvas : Colors.text.high) : Colors.text.medium }}
    >
      {label}
    </ThemedText>
  );

  if (selected && selectedStyle === 'gradient') {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.tertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.base}
        >
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        selected && selectedStyle === 'editorial' ? styles.editorialSelected : styles.unselected,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselected: {
    backgroundColor: Colors.surface.l2,
  },
  editorialSelected: {
    backgroundColor: Colors.text.high,
  },
  disabled: {
    opacity: 0.4,
  },
});

export type RemovableChipProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  onRemove?: () => void;
  style?: ViewStyle;
};

/** Recent-search style chip with an inline remove (×) button (docs/screens.md §3.2 S-03). */
export function RemovableChip({ label, onPress, onRemove, style }: RemovableChipProps) {
  return (
    <PressableScale onPress={onPress} accessibilityRole={onRemove ? undefined : 'button'} style={[removableStyles.base, style]}>
      <ThemedText variant="label-md" emphasis="medium">
        {label}
      </ThemedText>
      {onRemove && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          style={removableStyles.removeButton}
        >
          <ThemedText variant="label-sm" emphasis="medium">
            ×
          </ThemedText>
        </PressableScale>
      )}
    </PressableScale>
  );
}

const removableStyles = StyleSheet.create({
  base: {
    height: 32,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface.l2,
  },
  removeButton: {
    marginLeft: 2,
  },
});

export type AmountChipProps = {
  /** Pre-formatted amount label, e.g. "100" (currency unit shown by the caller — KGS/сом, OQ-08). */
  amount: string;
  unit?: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** 64px circular donation-amount chip (docs/screens.md §3.3 "Amount chip", S-19). */
export function AmountChip({ amount, unit, selected = false, onPress, style }: AmountChipProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[amountStyles.base, selected && amountStyles.selected, style]}
    >
      <View style={amountStyles.inner}>
        <ThemedText variant="label-lg" emphasis={selected ? 'high' : 'high'}>
          {amount}
        </ThemedText>
        {unit && (
          <ThemedText variant="label-sm" emphasis="medium">
            {unit}
          </ThemedText>
        )}
      </View>
    </PressableScale>
  );
}

const amountStyles = StyleSheet.create({
  base: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: Colors.primary,
  },
  inner: {
    alignItems: 'center',
  },
});
