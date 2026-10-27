import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { DemoStrings } from '@/demo/demo-strings';
import { isGuestPreview } from '@/demo/guest-mode';
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
  // Opened from the Artist Dashboard's in-place Demo Artist mode (e.g. a demo
  // campaign's statistics): the dashboard owns that preview, so this stack must
  // neither reload nor end it.
  const [ownedElsewhere] = useState(isGuestPreview);
  const [ready, setReady] = useState(ownedElsewhere);

  useEffect(() => {
    if (ownedElsewhere) return;
    enterGuestPreview();
    setReady(true);
    return () => exitGuestPreview();
  }, [ownedElsewhere]);

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
        // iOS shows the previous screen's title as the back label, and a screen without
        // one falls back to its route name ("index", "(tabs)"): arrow only, everywhere.
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      {/* Back (when there is history) and the dashboard's "Мой кабинет" switch both leave the preview. */}
      <Stack.Screen name="artist/(dashboard)" options={{ title: DemoStrings[locale].guestDashboardTitle }} />
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
