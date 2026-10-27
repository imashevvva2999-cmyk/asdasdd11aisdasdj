import { Stack, type Href } from 'expo-router';

import { IconButton } from '@/components/ui';
import { goBack } from '@/lib/navigation';
import { Colors } from '@/constants/theme';
import { DemoStrings } from '@/demo/demo-strings';
import { useAppStrings } from '@/state/locale-store';

/** Always-present back control for Profile (fallback Home) and the Artist
 * Dashboard (fallback Profile). With history it is a real pop — the same
 * native iOS back transition as the edge swipe: this screen slides away to
 * the right and the previous one, still mounted (scroll, mini-player and
 * playback intact), is revealed. Only without history (a direct link or a web
 * refresh) does it open `fallback`. Not router.navigate(): since Expo Router
 * v4 that pushes a new copy of the target — a forward slide that remounts
 * Home and its blurred tab bar, and grows the stack on every visit. */
function HeaderBackButton({ fallback }: { fallback: Href }) {
  const { t } = useAppStrings();
  return <IconButton icon="arrow-back" variant="ghost" size={40} accessibilityLabel={t('backLabel')} onPress={() => goBack(fallback)} />;
}

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
        // iOS shows the previous screen's title as the back label, and a screen without
        // one falls back to its route name ("index", "(tabs)"): arrow only, everywhere.
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('profileTitle'), headerLeft: () => <HeaderBackButton fallback="/home" /> }} />
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
      <Stack.Screen
        name="artist/dashboard"
        options={{ title: t('artistDashboardTitle'), headerLeft: () => <HeaderBackButton fallback="/profile" /> }}
      />
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
