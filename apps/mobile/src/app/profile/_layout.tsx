import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * Profile stack — S-23 Profile Hub root, Settings, Support History, and the
 * approved Artist Flow (S-25…S-28, UF-14). Artist Flow screens are plain stack
 * screens here (like Settings), not a separate app or tab bar — per the approved
 * decision in docs/screens.md §1 and docs/open-questions.md OQ-51.
 */
export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="audio-quality" options={{ title: 'Audio Quality & Playback' }} />
      <Stack.Screen name="downloads" options={{ title: 'Downloads & Offline' }} />
      <Stack.Screen name="account" options={{ title: 'Account & Security' }} />
      <Stack.Screen name="support-history" options={{ title: 'Support History' }} />
      <Stack.Screen name="artist/become-artist" options={{ title: 'Become An Artist' }} />
      <Stack.Screen name="artist/setup" options={{ title: 'Artist Setup' }} />
      <Stack.Screen name="artist/dashboard" options={{ title: 'Artist Dashboard' }} />
      <Stack.Screen name="artist/upload-track" options={{ title: 'Upload Track' }} />
    </Stack>
  );
}
