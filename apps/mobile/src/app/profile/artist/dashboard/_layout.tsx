import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DashboardTabBar } from '@/components/dashboard/dashboard-tab-bar';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing } from '@/constants/theme';
import { useDemoStrings } from '@/demo/demo-strings';
import { useIsGuestPreview } from '@/demo/guest-mode';
import { useIsDemoArtist } from '@/state/demo-session-store';

const ICON_SIZE = 22;

/** Artist Dashboard's own navigator (OQ-56) — Overview/Analytics/Promotion/
 * Studio Pro, architecturally independent from the listener `(tabs)` group. */
export default function DashboardLayout() {
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const { d } = useDemoStrings();
  return (
    <View style={styles.flex}>
      {guest && (
        <View style={styles.banner} accessibilityRole="text">
          <Icon name="visibility" size={14} color={Colors.secondary} />
          <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>
            {d.guestBadge}
          </ThemedText>
          <ThemedText variant="label-sm" style={styles.bannerText} numberOfLines={1}>
            {d.guestBanner}
          </ThemedText>
          <View style={styles.readOnlyPill}>
            <Icon name="lock" size={11} color={Colors.text.medium} />
            <ThemedText variant="label-sm" emphasis="medium">
              {d.readOnly}
            </ThemedText>
          </View>
        </View>
      )}
      {demo && !guest && (
        <View style={styles.banner} accessibilityRole="text">
          <Icon name="science" size={14} color={Colors.secondary} />
          <ThemedText variant="label-sm" style={styles.bannerText} numberOfLines={1}>
            {d.banner}
          </ThemedText>
          <Pressable accessibilityRole="link" onPress={() => router.push('/profile/demo-account')} hitSlop={8}>
            <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
              {d.manage}
            </ThemedText>
          </Pressable>
        </View>
      )}
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <DashboardTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color }) => <Icon name="dashboard" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Icon name="show-chart" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="promotion" options={{ title: 'Promotion', tabBarIcon: ({ color }) => <Icon name="campaign" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="studio-pro" options={{ title: 'Studio Pro', tabBarIcon: ({ color }) => <Icon name="equalizer" color={color} size={ICON_SIZE} /> }} />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.margin,
    paddingVertical: 6,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  bannerText: { flex: 1, color: Colors.secondary },
  readOnlyPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
});
