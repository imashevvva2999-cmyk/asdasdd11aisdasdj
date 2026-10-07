import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';

import { Icon } from './icon';
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
  /** Pre-formatted amount shown inside the circle, e.g. "100". */
  amount?: string;
  /** Currency unit for the caption under the circle (KGS/сом, OQ-08). */
  unit?: string;
  /** Glyph inside the circle instead of an amount (e.g. "More"). */
  icon?: string;
  /** Caption under the circle; defaults to "<amount> <unit>". */
  label?: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

/** Donation-amount chip — 56px outlined circle with the amount, caption
 * below; selected = solid coral with a glow (Stitch S-19). */
export function AmountChip({ amount, unit, icon, label, selected = false, onPress, style }: AmountChipProps) {
  const caption = label ?? [amount, unit].filter(Boolean).join(' ');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={caption}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[amountStyles.column, style]}
    >
      <View style={[amountStyles.circle, selected && amountStyles.selected]}>
        {icon ? (
          <Icon name={icon} size={22} color={Colors.text.high} />
        ) : (
          <ThemedText variant="body-lg" style={amountStyles.amount}>
            {amount}
          </ThemedText>
        )}
      </View>
      <ThemedText variant="body-sm" emphasis={selected ? 'primary' : 'medium'} numberOfLines={1}>
        {caption}
      </ThemedText>
    </PressableScale>
  );
}

const amountStyles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.5,
    elevation: 6,
  },
  amount: {
    fontWeight: '600',
  },
});
