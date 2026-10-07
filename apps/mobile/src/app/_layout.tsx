import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { loadedFonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={DarkTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.canvas },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="sheets" options={{ presentation: 'formSheet' }} />
            <Stack.Screen name="create-playlist" options={{ presentation: 'modal' }} />
            <Stack.Screen name="artist/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="album/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="playlist/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
