import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/** The tab that last played its entrance — module-scoped so every tab root screen shares
 * it, letting each one tell a real tab switch apart from merely regaining focus (a sheet
 * or the player closing, or returning from a screen pushed on this same tab's own stack). */
let lastActiveTab: string | null = null;

/**
 * Fades/slides a tab root screen's content in only when `tab` becomes the
 * active tab (not on every focus — expo-router's Tabs keep each screen
 * mounted after first visit, and transparentModal routes like the player or
 * a sheet re-focus the tab underneath them on dismiss without it having
 * stopped being the active tab). Spread the returned style onto the screen's
 * outer content wrapper, e.g. `<Animated.View style={[styles.flex, useTabEntrance('home').style]}>`.
 */
export function useTabEntrance(tab: string) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion || lastActiveTab === tab ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      const changed = lastActiveTab !== tab;
      lastActiveTab = tab;
      if (reduceMotion || !changed) {
        progress.value = 1;
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, { duration: 260 });
    }, [reduceMotion, progress, tab]),
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return { style };
}
