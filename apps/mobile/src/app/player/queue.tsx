import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, IconButton, QueueRow, Toggle, TrackRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { getTrackById, type Track } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/**
 * S-17 Playback Queue (docs/screens.md §3.9). Derives the track list locally
 * from the store's stable `queue` id array instead of calling the store's
 * own `queueTracks()` selector directly — that function allocates a new
 * array on every call, which breaks React's snapshot-stability check
 * (`useSyncExternalStore`) and crashes this screen with "Maximum update
 * depth exceeded".
 */
export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const queueTracks = useMemo(
    () => queue.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t)),
    [queue],
  );
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playFromQueueIndex = usePlayerStore((s) => s.playFromQueueIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const autoplay = usePlayerStore((s) => s.autoplay);
  const toggleAutoplay = usePlayerStore((s) => s.toggleAutoplay);

  const current = queueTracks[currentIndex];
  const upcoming = queueTracks.slice(currentIndex + 1);
  const openCurrentOptions = () => {
    if (current) router.push({ pathname: '/sheets/options', params: { kind: 'track', id: current.id } });
  };

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <IconButton icon="keyboard-arrow-down" accessibilityLabel="Collapse" onPress={() => goBack()} />
          <ThemedText variant="headline-sm">Playback Queue</ThemedText>
          {current ? (
            <IconButton icon="more-horiz" accessibilityLabel="More options" onPress={openCurrentOptions} />
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.content}>
          {current && (
            <View style={styles.section}>
              <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
                NOW PLAYING
              </ThemedText>
              <TrackRow coverUri={current.coverUri} title={current.title} artist={current.artistName} isPlaying={isPlaying} onOptionsPress={openCurrentOptions} />
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
                PLAYING NEXT
              </ThemedText>
            </View>

            {upcoming.length === 0 ? (
              <EmptyState icon="queue-music" title="Queue is empty" hint="Play a track to start building your queue." />
            ) : (
              upcoming.map((track, offset) => (
                <QueueRow
                  key={`${track.id}-${offset}`}
                  coverUri={track.coverUri}
                  title={track.title}
                  artist={track.artistName}
                  durationLabel={formatDuration(track.durationSec)}
                  onPress={() => playFromQueueIndex(currentIndex + 1 + offset)}
                  style={styles.queueRow}
                />
              ))
            )}
          </View>

          <View style={styles.autoplayRow}>
            <View style={styles.autoplayText}>
              <ThemedText variant="label-lg">Infinity Autoplay</ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                Keep playing similar music
              </ThemedText>
            </View>
            <Toggle value={autoplay} onValueChange={toggleAutoplay} accessibilityLabel="Infinity Autoplay" />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.margin,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    letterSpacing: 1,
  },
  queueRow: {
    paddingVertical: Spacing.xs,
  },
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginTop: 'auto',
  },
  autoplayText: {
    flex: 1,
    gap: 2,
  },
});
