import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { shadow } from '@mmusic/design-tokens';

import { AnimatedIcon } from './animated-icon';
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
        // Disabled: dim and drop the glow. Loading: stay fully opaque (the
        // spinner + label read as "working", not as a broken disabled pill).
        disabled && !loading && styles.disabled,
        isDisabled && styles.noGlow,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={Colors.text.high} />
          <ThemedText variant="label-lg" emphasis="high">
            {label}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.content}>
          {leadingIcon && <AnimatedIcon name={leadingIcon} size={18} color={Colors.text.high} />}
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
  noGlow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
      <AnimatedIcon name={icon} size={iconSize} color={Colors.text.high} />
    </PressableScale>
  );
}

export type IconButtonProps = {
  icon: string;
  onPress?: PressHandler;
  disabled?: boolean;
  size?: number;
  color?: string;
  /** 'surface' = L2 circle (default); 'ghost' = bare glyph tap zone, as used
   * for the player's header and secondary transport controls in Stitch. */
  variant?: 'surface' | 'ghost';
  /** Glyph size; defaults to 45% of `size` (surface) or 60% (ghost). */
  iconSize?: number;
  accessibilityLabel: string;
  style?: ViewStyle;
};

/** Icon button on an L2 surface circle, 40–48px (docs/screens.md §3.3 "Icon button"). */
export function IconButton({
  icon,
  onPress,
  disabled = false,
  size = 44,
  color = Colors.text.high,
  variant = 'surface',
  iconSize,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const ghost = variant === 'ghost';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        ghost ? circleStyles.ghost : circleStyles.surface,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <AnimatedIcon name={icon} size={iconSize ?? Math.round(size * (ghost ? 0.6 : 0.45))} color={color} />
    </PressableScale>
  );
}

const circleStyles = StyleSheet.create({
  base: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // DESIGN.md "Primary Play Buttons": subtle optical glow.
    shadowColor: shadow.primaryButton.color,
    shadowOffset: { width: shadow.primaryButton.offsetX, height: shadow.primaryButton.offsetY },
    shadowRadius: shadow.primaryButton.blurRadius,
    shadowOpacity: 1,
    elevation: 6,
  },
  surface: {
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type TextLinkButtonProps = {
  label: string;
  onPress?: PressHandler;
  disabled?: boolean;
  /** 'primary' = coral uppercase 10px link (See All, Explore, History);
   * 'muted' = sentence-case grey secondary action (Cancel, receipt links). */
  tone?: 'primary' | 'muted';
  icon?: string;
  style?: ViewStyle;
};

/** Coral uppercase text link (See All, Explore, History, Clear all). */
export function TextLinkButton({ label, onPress, disabled = false, tone = 'primary', icon, style }: TextLinkButtonProps) {
  const muted = tone === 'muted';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.linkRow, disabled && styles.disabled, style]}
    >
      {icon && <Icon name={icon} size={16} color={muted ? Colors.text.medium : Colors.primary} />}
      {muted ? (
        <ThemedText variant="label-lg" emphasis="medium">
          {label}
        </ThemedText>
      ) : (
        <ThemedText variant="label-sm" emphasis="primary" style={styles.linkText}>
          {label}
        </ThemedText>
      )}
    </PressableScale>
  );
}
