import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useDemoStrings } from '@/demo/demo-strings';

export type DashboardMode = 'real' | 'demo';

const MODES: DashboardMode[] = ['real', 'demo'];
/** The highlight's slide between the two modes. */
const INDICATOR_MS = 220;

/**
 * "Мой кабинет" / "Demo Artist" switch at the top of the Artist Dashboard (the
 * website's DashboardModeSwitch), as a segmented control whose highlight
 * slides to the selected mode. Presentational: the dashboard layout owns the
 * mode change and its content transition.
 */
export function DashboardModeSwitch({ mode, onChange }: { mode: DashboardMode; onChange: (mode: DashboardMode) => void }) {
  const { d } = useDemoStrings();
  const reduceMotion = useReducedMotion();
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const layouts = useRef<Partial<Record<DashboardMode, { x: number; width: number }>>>({});
  const [ready, setReady] = useState(false);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
    opacity: ready ? 1 : 0,
  }));

  const measure = (segment: DashboardMode, x: number, width: number) => {
    layouts.current[segment] = { x, width };
    if (segment === mode) {
      indicatorX.set(x);
      indicatorW.set(width);
      setReady(true);
    }
  };

  useEffect(() => {
    const box = layouts.current[mode];
    if (!box) return;
    if (reduceMotion) {
      indicatorX.set(box.x);
      indicatorW.set(box.width);
    } else {
      const timing = { duration: INDICATOR_MS, easing: Easing.out(Easing.cubic) };
      indicatorX.set(withTiming(box.x, timing));
      indicatorW.set(withTiming(box.width, timing));
    }
  }, [mode, reduceMotion, indicatorX, indicatorW]);

  const labels: Record<DashboardMode, { icon: string; label: string }> = {
    real: { icon: 'person', label: d.modeReal },
    demo: { icon: 'science', label: d.modeDemo },
  };

  return (
    <View style={styles.slot} accessibilityRole="tablist" accessibilityLabel={d.modeLabel}>
      <View style={styles.pill}>
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
        {MODES.map((segment) => {
          const selected = segment === mode;
          const color = selected ? Colors.primary : Colors.text.medium;
          return (
            <PressableScale
              key={segment}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[segment].label}
              onPress={() => onChange(segment)}
              onLayout={(e) => measure(segment, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
              style={styles.segment}
            >
              <Icon name={labels[segment].icon} size={18} color={color} />
              <ThemedText variant="label-md" numberOfLines={1} style={{ color }}>
                {labels[segment].label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { paddingHorizontal: Spacing.margin, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  // Same surface and highlight as the dashboard's floating tab bar (dashboard-tab-bar.tsx).
  pill: {
    flexDirection: 'row',
    padding: Spacing.xs,
    gap: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.full,
  },
});
