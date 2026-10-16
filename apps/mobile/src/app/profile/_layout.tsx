import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { DemoStrings } from '@/demo/demo-strings';
import { useAppStrings } from '@/state/locale-store';

/**
 * Profile stack — S-23 Profile Hub root, Settings, Support History, and the
 * approved Artist Flow (S-25…S-28, UF-14). Artist Flow screens are plain stack
 * screens here (like Settings), not a separate app or tab bar — per the approved
 * decision in docs/screens.md §1 and docs/open-questions.md OQ-51.
 */
export default function ProfileStackLayout() {
  const { t, locale } = useAppStrings();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('profileTitle') }} />
      <Stack.Screen name="settings" options={{ title: t('settingsTitle') }} />
      <Stack.Screen name="settings-language" options={{ title: t('appLanguage') }} />
      <Stack.Screen name="audio-quality" options={{ title: t('menuAudioQuality') }} />
      <Stack.Screen name="downloads" options={{ title: t('menuDownloads') }} />
      <Stack.Screen name="account" options={{ title: t('menuAccount') }} />
      <Stack.Screen name="support-history" options={{ title: t('menuSupportHistory') }} />
      <Stack.Screen name="demo-login" options={{ title: DemoStrings[locale].loginTitle }} />
      <Stack.Screen name="demo-account" options={{ title: DemoStrings[locale].accountTitle }} />
      <Stack.Screen name="artist/become-artist" options={{ title: t('becomeArtistTitle') }} />
      <Stack.Screen name="artist/setup" options={{ title: t('artistSetupTitle') }} />
      <Stack.Screen name="artist/dashboard" options={{ title: t('artistDashboardTitle') }} />
      <Stack.Screen name="artist/upload-track" options={{ title: t('uploadTrackTitle') }} />
      <Stack.Screen name="artist/campaign/select-track" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/select-package" options={{ headerShown: false }} />
      <Stack.Screen
        name="artist/campaign/package-details"
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="artist/campaign/setup" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/confirm" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/success" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/statistics" options={{ headerShown: false }} />
    </Stack>
  );
}
