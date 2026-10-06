import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Mmusic is dark-first / dark-only (DESIGN.md; OQ-34). Always use expo-router's
 * DarkTheme regardless of system color scheme — do not branch on useColorScheme().
 * Real tab/stack navigation (таб-бар Home/Search/Library, player modal stack,
 * sheets) lands in Фаза 3 (docs/development-plan.md).
 */
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.canvas },
        }}
      />
    </ThemeProvider>
  );
}
