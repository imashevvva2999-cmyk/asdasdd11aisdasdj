import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { DemoStrings } from '@/demo/demo-strings';
import { enterGuestPreview, exitGuestPreview } from '@/state/demo-session-store';
import { useAppStrings } from '@/state/locale-store';

/**
 * Public Guest Demo Preview — /demo/artist (production-safe, no login).
 *
 * Loads a fresh, immutable copy of the Solaris Echo demo fixture into the
 * in-memory app stores and switches on read-only mode (src/demo/guest-mode.ts:
 * every mutating store action is refused). It never reads or writes the
 * personal demo account's storage and needs no credentials. Loading happens
 * client-side after mount, so static-export rendering of other routes never
 * sees guest data; leaving /demo clears it again.
 */
export default function GuestPreviewLayout() {
  const { locale } = useAppStrings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    enterGuestPreview();
    setReady(true);
    return () => exitGuestPreview();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="artist/(dashboard)" options={{ title: DemoStrings[locale].guestDashboardTitle, headerBackVisible: false }} />
      <Stack.Screen name="artist/campaign/select-package" options={{ headerShown: false }} />
      <Stack.Screen
        name="artist/campaign/package-details"
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="artist/campaign/statistics" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.canvas },
});
