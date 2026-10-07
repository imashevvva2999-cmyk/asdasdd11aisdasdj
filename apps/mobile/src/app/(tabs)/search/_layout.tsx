import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** Search tab's own stack (docs/screens.md §1: Search → Results → Empty; → Genre; → All Genres → Genre). */
export default function SearchStackLayout() {
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
      <Stack.Screen name="results" options={{ title: 'Search Results' }} />
      <Stack.Screen name="all-genres" options={{ title: 'All Genres & Moods' }} />
      <Stack.Screen name="genre/[id]" options={{ title: 'Genre' }} />
    </Stack>
  );
}
