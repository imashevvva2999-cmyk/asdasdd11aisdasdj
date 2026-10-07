import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** Library tab's own stack (docs/screens.md §1: Library → Liked Songs). */
export default function LibraryStackLayout() {
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
      <Stack.Screen name="liked-songs" options={{ title: 'Liked Songs' }} />
    </Stack>
  );
}
