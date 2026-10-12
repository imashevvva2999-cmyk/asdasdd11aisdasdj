import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PillButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getArtistDemoTotals } from '@/lib/analytics-mock';
import { useArtistStore } from '@/state/artist-store';

import NotFoundScreen from './+not-found';

/**
 * DEV-ONLY demo-stat seeding button (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md). Not linked from any real
 * navigation. Sets clearly-labeled, non-real numbers on the current local
 * artist for the private management demo — never on any other artist.
 * Stripped from production and from the web export, same as dev-ui-kit.tsx.
 */
export default function DevDemoSeedScreen() {
  return __DEV__ ? <DevDemoSeedPanel /> : <NotFoundScreen />;
}

function DevDemoSeedPanel() {
  const artist = useArtistStore((s) => s.artist);
  const seedDemoStats = useArtistStore((s) => s.seedDemoStats);
  const entries = useArtistStore((s) => s.entries);
  const publishedIds = entries.filter((e) => e.status === 'published').map((e) => e.track.id);
  // Derived from the Analytics tab's own per-track figures, so Overview and
  // Analytics reconcile. Re-press after publishing more tracks.
  const totals = getArtistDemoTotals(publishedIds);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.content}>
        <ThemedText variant="headline-md">Demo stat seed (dev only)</ThemedText>
        <ThemedText variant="body-md">
          {artist ? `Current artist: ${artist.name}` : 'No artist profile yet — complete Become an Artist first.'}
        </ThemedText>
        <ThemedText variant="body-sm">
          {`${publishedIds.length} published track(s) → ${totals.monthlyListeners.toLocaleString('en-US')} listeners / ${totals.streams.toLocaleString('en-US')} streams (from Analytics)`}
        </ThemedText>
        <PillButton
          label="Seed demo stats from Analytics"
          onPress={() => seedDemoStats(totals.monthlyListeners, totals.streams)}
          disabled={!artist || publishedIds.length === 0}
        />
        <PillButton label="Back to Dashboard" onPress={() => router.push('/profile/artist/dashboard')} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, gap: Spacing.md, padding: Spacing.margin },
});
