import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startAudio } from '@/audio/expo-audio-engine';
import { loadedFonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { MAX_CONTENT_WIDTH } from '@/hooks/use-content-width';

SplashScreen.preventAutoHideAsync();

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
  const [fontsLoaded, fontError] = useFonts(loadedFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Real audio (Фаза 2): created on the client only — static web rendering has no audio.
  useEffect(() => {
    startAudio();
  }, []);

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
            <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen
              name="sheets"
              // Transparent so the shared SheetScreen can draw its own dimmed
              // backdrop + bottom-pinned drawer over the screen beneath.
              options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="create-playlist" options={{ presentation: 'modal' }} />
            <Stack.Screen name="artist/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="album/[id]" options={{ headerShown: true, title: 'Album' }} />
            <Stack.Screen name="playlist/[id]" options={{ headerShown: true, title: 'Playlist' }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
          </Stack>
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
