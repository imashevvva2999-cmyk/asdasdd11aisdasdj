import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { CAPSULE_GAP, PILL_BOTTOM_GAP, PILL_HEIGHT } from '@/components/nav/floating-tab-bar';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON_SIZE = 22;

/** Maps each route name to its localized-label key (Task 4). */
const TAB_LABEL_KEY = {
  index: 'overviewTab',
  analytics: 'analyticsTab',
  promotion: 'promotionTab',
  'studio-pro': 'studioProTab',
} as const;

/** Bottom clearance a Dashboard screen's ScrollView should reserve so its
 * last row never sits under the floating pill — same relationship
 * `Spacing.miniPlayerClearance` has to the listener FloatingTabBar. */
export const DASHBOARD_TAB_BAR_CLEARANCE = PILL_HEIGHT + PILL_BOTTOM_GAP + CAPSULE_GAP + Spacing.lg;

/**
 * Artist Dashboard's own bottom tab bar (Overview/Analytics/Promotion/Studio
 * Pro) — visually matched to the listener FloatingTabBar (same floating
 * pill: solid surface, hairline border, shadow, sliding focus indicator) but
 * a fully separate component: switching these tabs never touches the
 * listener `(tabs)` group's state, and vice versa (OQ-56). No main-nav files
 * are imported for behavior, only its exported size constants for parity.
 */
export function DashboardTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useDashboardStrings();
  const reduceMotion = useReducedMotion();

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
      <View style={styles.pill} accessibilityRole="tablist">
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? Colors.primary : Colors.text.medium;
          const labelKey = TAB_LABEL_KEY[route.name as keyof typeof TAB_LABEL_KEY];
          const label = labelKey ? t(labelKey) : typeof options.title === 'string' ? options.title : route.name;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => navigation.navigate(route.name)}
              onLayout={(e) => measure(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
              style={styles.item}
            >
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
              <ThemedText variant="label-sm" style={{ color }}>
                {label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
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
