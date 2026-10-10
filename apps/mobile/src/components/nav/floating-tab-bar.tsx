import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
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

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const layouts = useRef<Record<number, { x: number; width: number }>>({});
  const [ready, setReady] = useState(false);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
    opacity: ready ? 1 : 0,
  }));

  const measure = (index: number, x: number, width: number) => {
    layouts.current[index] = { x, width };
    if (index === state.index) {
      indicatorX.value = x;
      indicatorW.value = width;
      setReady(true);
    }
  };

  useEffect(() => {
    const box = layouts.current[state.index];
    if (!box) return;
    if (reduceMotion) {
      indicatorX.value = box.x;
      indicatorW.value = box.width;
    } else {
      indicatorX.value = withTiming(box.x, { duration: 220 });
      indicatorW.value = withTiming(box.width, { duration: 220 });
    }
  }, [state.index, reduceMotion, indicatorX, indicatorW]);

  return (
    <View pointerEvents="box-none" style={[styles.slot, { bottom: insets.bottom + PILL_BOTTOM_GAP }]}>
      <Animated.View style={[styles.pill, sinkStyle]} accessibilityRole="tablist">
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
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
              onLayout={(e) => measure(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
              style={styles.item}
              testID={`tab-${route.name}`}
            >
              <TabIcon focused={focused} reduceMotion={reduceMotion}>
                {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
              </TabIcon>
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

function TabIcon({ focused, reduceMotion, children }: { focused: boolean; reduceMotion: boolean; children: ReactNode }) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  useEffect(() => {
    scale.value = reduceMotion ? (focused ? 1 : 0.92) : withTiming(focused ? 1 : 0.92, { duration: 180 });
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 0.75 + scale.value * 0.25 }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
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
