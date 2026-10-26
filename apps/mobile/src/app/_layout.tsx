import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startAudio } from '@/audio/platform-audio';
import { FloatingPaymentButton } from '@/components/mbank/floating-payment-button';
import { PlayerExpandPreview } from '@/components/player/expand-preview';
import { iconFonts } from '@/components/ui/icon';
import { RouteTitle } from '@/components/web/route-title';
import { useFloatingButtonStore } from '@/state/floating-button-store';
import { PlayerSurfaceSync } from '@/state/player-surface';
import { usePlayerStore } from '@/state/player-store';
import { useProfileAvatarStore } from '@/state/profile-avatar-store';
import { useAppStrings, useLocaleStore } from '@/state/locale-store';
import { useDemoSessionStore } from '@/state/demo-session-store';
import { restoreArtistAccount } from '@/state/artist-account-persistence';
import { loadedFonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { MAX_CONTENT_WIDTH } from '@/hooks/use-content-width';
import { keepRealWalletAtZero } from '@/state/promo-wallet-rule';

SplashScreen.preventAutoHideAsync();

/** The website opened at the public guest preview (/demo/*). Native has no
 * `window.location` outside the dev runtime, so this is false there. */
function isGuestPreviewUrl(): boolean {
  return typeof window !== 'undefined' && !!window.location?.pathname?.startsWith('/demo');
}

/**
 * Mmusic is dark-first / dark-only (DESIGN.md; OQ-34). Always use expo-router's
 * DarkTheme regardless of system color scheme — do not branch on useColorScheme().
 * GestureHandlerRootView + BottomSheetModalProvider are wired here so any screen
 * can use AppBottomSheet (src/components/ui/bottom-sheet.tsx) without repeating
 * this setup.
 *
 * Фаза 3 navigation architecture (docs/screens.md §1, docs/user-flow.md):
 * - (tabs) — Home/Search/Library bottom nav, each with its own nested stack.
 * - player — full-screen player modal (Now Playing/Lyrics/Queue), no tab bar.
 * - sheets — bottom-sheet-style screens (Track options/Add to Playlist/Support/
 *   Confirm/Success), formSheet presentation.
 * - artist/[id], album/[id], playlist/[id], create-playlist — shared cross-tab
 *   destinations living once at root instead of being duplicated per tab.
 * - profile — Profile Hub, Settings, Support History, and the approved Artist
 *   Flow (S-25…S-28, UF-14) as plain stack screens (no separate Studio tab bar).
 * - track/[id] — deep-link redirect target (mmusic://track/{id}) into the player.
 *
 * This single root Stack is also what keeps the app WebView-safe (OQ-53): there
 * is no native-only navigation primitive here that a RN-Web/WebView surface
 * can't render — route structure is identical for both targets.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ ...loadedFonts, ...iconFonts });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Real audio (Фаза 2): created on the client only — static web rendering has no audio.
  useEffect(() => {
    startAudio();
  }, []);

  // likedTrackIds persistence (Phase 0, item 5): `skipHydration: true` on the
  // store keeps the first paint matching the static export's server HTML;
  // rehydrating here, client-only and after mount, avoids a hydration mismatch.
  useEffect(() => {
    usePlayerStore.persist.rehydrate();
  }, []);

  // App Language (Settings > App Language, Priority 1): same skipHydration
  // + client-only rehydrate pattern as likedTrackIds above.
  useEffect(() => {
    useLocaleStore.persist.rehydrate();
  }, []);

  // Profile avatar override: same skipHydration + client-only rehydrate
  // pattern as above.
  useEffect(() => {
    useProfileAvatarStore.persist.rehydrate();
  }, []);

  // Floating MBANK payment button's last snapped position: same skipHydration
  // + client-only rehydrate pattern as above.
  useEffect(() => {
    useFloatingButtonStore.persist.rehydrate();
  }, []);

  // Regular artist account (frontend MVP, localStorage — see
  // state/artist-account-persistence.ts). Runs before the demo session restore
  // so a signed-in demo then takes over; skipped in the guest preview.
  useEffect(() => {
    if (isGuestPreviewUrl()) return;
    restoreArtistAccount();
  }, []);

  // Demo Artist Account (dev/demo only): restores a signed-in demo session.
  // Skipped entirely under the public guest preview (/demo/*), which must never
  // read the personal demo account's storage.
  useEffect(() => {
    if (isGuestPreviewUrl()) return;
    useDemoSessionStore.persist.rehydrate();
  }, []);

  // Outside the demo the promo wallet is 0 — the website's rule, shared. After
  // the two restores above, so a restored demo session keeps its balance.
  useEffect(() => keepRealWalletAtZero(), []);

  const { t } = useAppStrings();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Wide browser windows: keep the mobile/WebView presentation in a
          centred phone-width column instead of stretching every screen. */}
      <View style={styles.appColumn}>
      <BottomSheetModalProvider>
        <ThemeProvider value={DarkTheme}>
          <StatusBar style="light" />
          {/* Keeps the shared carousel position (artwork, colours, mini-player) in step with the store. */}
          <PlayerSurfaceSync />
          {/* Website: per-page <title> (browser tabs, history, shared links).
              Before the stack, so a screen's own <Head> (e.g. 404) wins. */}
          <RouteTitle />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.canvas },
              // Same header treatment as the tab stacks (Artist / Album / Playlist).
              headerStyle: { backgroundColor: Colors.canvas },
              headerTintColor: Colors.text.high,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="player"
              // Dynamic Premium (plan §4.2): no system transition or native swipe —
              // Now Playing draws its own expand/collapse over the screen beneath.
              options={{ presentation: 'transparentModal', animation: 'none', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen
              name="sheets"
              // Transparent so the shared SheetScreen can draw its own dimmed
              // backdrop + bottom-pinned drawer over the screen beneath.
              options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="create-playlist" options={{ presentation: 'modal' }} />
            <Stack.Screen name="artist/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="album/[id]" options={{ headerShown: true, title: t('albumHeaderTitle') }} />
            <Stack.Screen name="playlist/[id]" options={{ headerShown: true, title: t('playlistHeaderTitle') }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
          </Stack>
          {/* Follows a swipe up on the mini-player until the player route opens. */}
          <PlayerExpandPreview />
          {/* AssistiveTouch-style draggable MBANK payment entry point — one
              instance for the whole app, drawn above everything else. */}
          <FloatingPaymentButton />
        </ThemeProvider>
      </BottomSheetModalProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  appColumn: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
