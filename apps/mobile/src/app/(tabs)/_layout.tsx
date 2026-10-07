import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { Icon } from '@/components/ui/icon';
import { resolveFontFamily } from '@/constants/fonts';
import { Colors, TypeScale } from '@/constants/theme';

/** Measured from the Stitch Home/Library exports (`<nav class="... h-20 ...">`,
 * `w-16 h-12` per-tab touch target, `text-[24px]` icons) — Фаза 4 visual QA pass. */
const TAB_BAR_HEIGHT = 80;
const TAB_ICON_SIZE = 24;

/**
 * Main bottom navigation — Home / Search / Library (docs/screens.md §1 "Таб-бар [Д]").
 * Exactly 3 tabs per the design — no additional tabs are introduced. Each tab owns
 * its own nested Stack (home/_layout.tsx, search/_layout.tsx, library/_layout.tsx)
 * so "каждая вкладка хранит свой стек навигации" (screens.md §1) holds: pushing a
 * tab-local screen (e.g. Home → See All) does not affect the other tabs' stacks.
 * Shared cross-tab destinations (Artist/Album/Playlist/Create Playlist) live at
 * the root level instead (src/app/artist/[id].tsx etc.) so they aren't duplicated
 * per tab — see src/app/_layout.tsx.
 *
 * The persistent mini-player (DESIGN.md "Floating Mini-Player") is mounted here,
 * floating just above the tab bar, so Home/Search/Library share one instance
 * instead of each screen rebuilding it (Фаза 4 visual QA pass).
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.text.medium,
          tabBarStyle: {
            backgroundColor: 'rgba(19, 19, 21, 0.92)',
            borderTopColor: 'rgba(255, 255, 255, 0.05)',
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingTop: 12,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: {
            fontFamily: resolveFontFamily(TypeScale['label-sm'].fontFamily, TypeScale['label-sm'].fontWeight),
            fontSize: TypeScale['label-sm'].fontSize,
          },
        }}
      >
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

      <View style={[styles.miniPlayerSlot, { bottom: TAB_BAR_HEIGHT + insets.bottom }]} pointerEvents="box-none">
        <MiniPlayer />
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
