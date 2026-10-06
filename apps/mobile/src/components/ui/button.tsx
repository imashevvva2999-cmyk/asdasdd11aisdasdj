import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { shadow } from '@mmusic/design-tokens';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from '../themed-text';

type PressHandler = (event: GestureResponderEvent) => void;

export type PillButtonProps = {
  label: string;
  onPress?: PressHandler;
  /** Primary = solid coral + glow (Play All, Confirm & Send). Secondary = translucent glass (Follow, Cancel). */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  /** Trailing icon, e.g. arrow_forward on "Become an Artist →". */
  trailingIcon?: string;
  leadingIcon?: string;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Primary / secondary pill button (DESIGN.md "Buttons & Interactive Controls";
 * docs/screens.md §3.3 "Primary pill" / "Secondary glass").
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  trailingIcon,
  leadingIcon,
  style,
  testID,
}: PillButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.text.high} />
      ) : (
        <View style={styles.content}>
          {leadingIcon && <Icon name={leadingIcon} size={18} color={Colors.text.high} />}
          <ThemedText variant="label-lg" emphasis="high">
            {label}
          </ThemedText>
          {trailingIcon && <Icon name={trailingIcon} size={18} color={Colors.text.high} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: shadow.primaryButton.color,
    shadowOffset: { width: shadow.primaryButton.offsetX, height: shadow.primaryButton.offsetY },
    shadowRadius: shadow.primaryButton.blurRadius,
    shadowOpacity: 1,
    elevation: 6,
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  disabled: {
    opacity: 0.4,
  },
});

export type CircleButtonProps = {
  icon: string;
  onPress?: PressHandler;
  disabled?: boolean;
  /** 64px main transport control (Play/Pause) vs 40/48px secondary controls. */
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
  accessibilityLabel: string;
};

/** Primary circle button — 48–64px coral circle (DESIGN.md "Tactile Playback Controls"). */
export function CircleButton({ icon, onPress, disabled = false, size = 64, iconSize = 28, style, accessibilityLabel }: CircleButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        circleStyles.base,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={Colors.text.high} />
    </PressableScale>
  );
}

export type IconButtonProps = {
  icon: string;
  onPress?: PressHandler;
  disabled?: boolean;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  style?: ViewStyle;
};

/** Icon button on an L2 surface circle, 40–48px (docs/screens.md §3.3 "Icon button"). */
export function IconButton({ icon, onPress, disabled = false, size = 44, color = Colors.text.high, accessibilityLabel, style }: IconButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        circleStyles.surface,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={color} />
    </PressableScale>
  );
}

const circleStyles = StyleSheet.create({
  base: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type TextLinkButtonProps = {
  label: string;
  onPress?: PressHandler;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Coral uppercase text link (See All, Explore, History, Clear all). */
export function TextLinkButton({ label, onPress, disabled = false, style }: TextLinkButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[disabled && styles.disabled, style]}
    >
      <ThemedText variant="label-md" emphasis="primary" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}
