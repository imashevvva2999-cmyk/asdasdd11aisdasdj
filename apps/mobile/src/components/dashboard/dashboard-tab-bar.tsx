import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
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

/**
 * Artist Dashboard's own bottom tab bar (Overview/Analytics/Promotion/Studio
 * Pro) — a plain, solid-surface row, visually consistent with the listener
 * FloatingTabBar but a fully separate component: switching these tabs never
 * touches the listener `(tabs)` group's state, and vice versa (OQ-56).
 */
export function DashboardTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useDashboardStrings();
  return (
    <View style={[styles.row, { paddingBottom: insets.bottom || Spacing.sm }]}>
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.l1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
});
