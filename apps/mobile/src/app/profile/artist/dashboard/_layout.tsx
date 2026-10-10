import { Tabs } from 'expo-router';

import { DashboardTabBar } from '@/components/dashboard/dashboard-tab-bar';
import { Icon } from '@/components/ui/icon';

const ICON_SIZE = 22;

/** Artist Dashboard's own navigator (OQ-56) — Overview/Analytics/Promotion/
 * Studio Pro, architecturally independent from the listener `(tabs)` group. */
export default function DashboardLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <DashboardTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color }) => <Icon name="dashboard" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Icon name="show-chart" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="promotion" options={{ title: 'Promotion', tabBarIcon: ({ color }) => <Icon name="campaign" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="studio-pro" options={{ title: 'Studio Pro', tabBarIcon: ({ color }) => <Icon name="equalizer" color={color} size={ICON_SIZE} /> }} />
    </Tabs>
  );
}
