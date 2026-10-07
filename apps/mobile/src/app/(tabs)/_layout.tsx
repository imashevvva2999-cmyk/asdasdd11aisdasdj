import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { Colors } from '@/constants/theme';

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
 * The persistent mini-player (DESIGN.md "Floating Mini-Player") mounts above this
 * tab bar once playback exists (Фаза 5) — not implemented here, placeholder only.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.medium,
        tabBarStyle: {
          backgroundColor: Colors.surface.l1,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Icon name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Icon name="library-music" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
