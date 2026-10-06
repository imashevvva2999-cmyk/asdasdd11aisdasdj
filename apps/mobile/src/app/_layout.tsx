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
 * Real tab/stack navigation (таб-бар Home/Search/Library, player modal stack)
 * lands in Фаза 3 (docs/development-plan.md). GestureHandlerRootView +
 * BottomSheetModalProvider are wired here so any screen can use AppBottomSheet
 * (src/components/ui/bottom-sheet.tsx) without repeating this setup.
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
          />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
