import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { pillSinkOffset } from '@/lib/stage-rules';
import { expandOrigin, expandProgress } from '@/state/player-surface';

/** The props expo-router's Tabs passes to a custom tab bar (no direct
 * @react-navigation import: it is not a direct dependency). */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const PILL_HEIGHT = 56;
export const PILL_BOTTOM_GAP = Spacing.sm;
/** Space between the pill and the capsule floating above it. */
export const CAPSULE_GAP = Spacing.sm;
const TAB_ICON_SIZE = 22;

/**
 * Floating navigation pill — Home / Search / Library (W3 Этап 1, Concept D,
 * iphone/home.png): a solid surface with a hairline border floating above the
 * content, no glass or blur. Replaces the full-width tab bar; the tabs, their
 * stacks and the tabPress behaviour (re-tap pops to the stack's root) are the
 * same as before. Screens keep `Spacing.miniPlayerClearance` bottom padding so
 * the pill and the capsule never cover the end of a list.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  // While the Home stage grows into Now Playing, the pill sinks below the edge.
  const reduceMotion = useReducedMotion();
  const sinkDistance = PILL_HEIGHT + PILL_BOTTOM_GAP + insets.bottom + 16;
  const sinkStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillSinkOffset(expandProgress.value, expandOrigin.value, reduceMotion, sinkDistance) }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.slot, { bottom: insets.bottom + PILL_BOTTOM_GAP }]}>
      <Animated.View style={[styles.pill, sinkStyle]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? Colors.primary : Colors.text.medium;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.item}
              testID={`tab-${route.name}`}
            >
              {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
              <ThemedText variant="label-sm" style={{ color }}>
                {label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    minWidth: 76,
    height: PILL_HEIGHT - 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radii.full,
  },
});
