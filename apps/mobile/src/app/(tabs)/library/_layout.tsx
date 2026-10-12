import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAppStrings } from '@/state/locale-store';

/** Library tab's own stack (docs/screens.md §1: Library → Liked Songs). */
export default function LibraryStackLayout() {
  const { t } = useAppStrings();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="liked-songs" options={{ title: t('likedSongs') }} />
    </Stack>
  );
}
