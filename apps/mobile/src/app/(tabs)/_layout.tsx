import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { CAPSULE_GAP, FloatingTabBar, PILL_BOTTOM_GAP, PILL_HEIGHT } from '@/components/nav/floating-tab-bar';
import { Icon } from '@/components/ui/icon';

const TAB_ICON_SIZE = 22;

/**
 * Main navigation — Home / Search / Library (docs/screens.md §1 "Таб-бар [Д]"),
 * drawn as the Floating Canvas pill (W3 Этап 1, Concept D). Exactly 3 tabs per
 * the design — no additional tabs are introduced. Each tab owns its own nested
 * Stack (home/_layout.tsx, search/_layout.tsx, library/_layout.tsx) so "каждая
 * вкладка хранит свой стек навигации" (screens.md §1) holds: pushing a
 * tab-local screen (e.g. Home → See All) does not affect the other tabs' stacks.
 * Shared cross-tab destinations (Artist/Album/Playlist/Create Playlist) live at
 * the root level instead (src/app/artist/[id].tsx etc.) so they aren't duplicated
 * per tab — see src/app/_layout.tsx.
 *
 * The player capsule (the mini-player) is mounted here once, floating just
 * above the pill, so Home/Search/Library share one instance.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Icon name="home" color={color} size={TAB_ICON_SIZE} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <Icon name="search" color={color} size={TAB_ICON_SIZE} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => <Icon name="library-music" color={color} size={TAB_ICON_SIZE} />,
          }}
        />
      </Tabs>

      <View
        style={[styles.miniPlayerSlot, { bottom: insets.bottom + PILL_BOTTOM_GAP + PILL_HEIGHT + CAPSULE_GAP }]}
        pointerEvents="box-none"
      >
        <MiniPlayer respectStage />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  miniPlayerSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
