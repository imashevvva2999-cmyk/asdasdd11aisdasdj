import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * Full-screen player modal stack (DESIGN.md "Floating Mini-Player" opens this;
 * docs/screens.md §1: Mini-player → Now Playing → Lyrics / Queue). No tab bar or
 * mini-player inside this stack (screens.md §1 navigation rules). Presentation
 * (transparentModal, no system animation) is set where this group is registered
 * in the root _layout.
 */
export default function PlayerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      {/* Transparent: Now Playing slides over the screen beneath (its own sheet + background). */}
      <Stack.Screen name="now-playing" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="lyrics" />
      <Stack.Screen name="queue" />
    </Stack>
  );
}
