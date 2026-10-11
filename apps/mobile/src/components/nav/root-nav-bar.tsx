import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { useAppStrings } from '@/state/locale-store';

import { TabPill, type TabPillItem } from './floating-tab-bar';

/**
 * The same Home/Search/Library pill as `FloatingTabBar`, for the cross-tab
 * screens that live outside the Tabs navigator (Artist, Album, Playlist —
 * siblings of `(tabs)` in `src/app/_layout.tsx`, so `FloatingTabBar` is
 * unmounted there). None of the three is ever shown focused here: these
 * screens aren't "on" a tab, so tapping one just takes the listener there —
 * mirroring how `MiniPlayerOverlay` already reuses the player capsule on
 * these same three screens.
 */
export function RootNavBar() {
  const { t } = useAppStrings();
  const items: TabPillItem[] = [
    {
      key: 'home',
      label: t('homeTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
      onPress: () => router.push('/home'),
    },
    {
      key: 'search',
      label: t('searchTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="search" color={color} size={size} />,
      onPress: () => router.push('/search'),
    },
    {
      key: 'library',
      label: t('libraryTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="library-music" color={color} size={size} />,
      onPress: () => router.push('/library'),
    },
  ];
  return <TabPill items={items} />;
}
