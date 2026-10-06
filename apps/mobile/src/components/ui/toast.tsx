import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { blur } from '@mmusic/design-tokens';

import { Icon } from './icon';
import { ThemedText } from '../themed-text';

export type ToastProps = {
  message: string;
  icon?: string;
  visible: boolean;
};

/**
 * Presentational toast (e.g. "Initializing Artist Studio setup…" on S-25,
 * "✓ Added to Late Night Flow" on S-18). Show/hide timing is owned by the caller —
 * this component only renders the current `visible` state.
 */
export function Toast({ message, icon = 'sync', visible }: ToastProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <BlurView intensity={blur.overlay} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          <Icon name={icon} size={20} color={Colors.primary} />
          <ThemedText variant="body-sm" style={styles.message}>
            {message}
          </ThemedText>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.margin,
    right: Spacing.margin,
    bottom: Spacing.xl,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  blur: {
    backgroundColor: 'rgba(53, 52, 55, 0.6)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  message: {
    flex: 1,
  },
});
