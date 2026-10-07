import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, EmptyState, Icon, IconButton, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { nextSortMode, sortTracks, type TrackSortMode } from '@/lib/sort-tracks';
import { getTrackById, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';

const LIKED_SONGS_ID = 'liked-songs';

/**
 * S-13 Liked Songs — "auto playlist" sourced live from the shared player store's
 * `likedTrackIds`, not a separate local list, so liking a track anywhere in the
 * app (Now Playing, Album, Playlist, Artist) is reflected here immediately.
 * Download is a local flag only (library store); Sort reorders locally.
 */
export default function LikedSongsScreen() {
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(LIKED_SONGS_ID));
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const { showToast, toast } = useToast();

  const likedTracks = useMemo(
    () =>
      sortTracks(
        Array.from(likedTrackIds)
          .map((id) => getTrackById(id))
          .filter((t): t is Track => Boolean(t)),
        sortMode,
      ),
    [likedTrackIds, sortMode],
  );
  const likedTrackIdsOrdered = likedTracks.map((t) => t.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[Colors.primary, Colors.tertiary, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Icon name="favorite" size={56} color={Colors.text.high} />
          </LinearGradient>
          <ThemedText variant="headline-lg" style={styles.title}>
            Liked Songs
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            Auto Playlist • {likedTracks.length} saved tracks
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={isDownloaded ? 'download-done' : 'download'}
              color={isDownloaded ? Colors.secondary : undefined}
              accessibilityLabel={isDownloaded ? 'Remove download' : 'Download offline'}
              onPress={() => {
                toggleDownloaded(LIKED_SONGS_ID);
                showToast(isDownloaded ? 'Download removed' : 'Marked for offline (demo — no audio is stored yet)', 'download');
              }}
            />
            <IconButton
              icon="sort"
              accessibilityLabel={`Sort: ${sortMode}`}
              onPress={() => {
                const next = nextSortMode(sortMode);
                setSortMode(next);
                showToast(`Sorted by ${next}`, 'sort');
              }}
            />
            <View style={styles.spacer} />
            <IconButton icon="shuffle" accessibilityLabel="Shuffle" onPress={() => playShuffled(likedTrackIdsOrdered)} />
            <CircleButton
              icon="play-arrow"
              accessibilityLabel="Play all"
              size={56}
              iconSize={26}
              onPress={() => likedTrackIdsOrdered.length > 0 && play(likedTrackIdsOrdered[0]!, likedTrackIdsOrdered)}
            />
          </View>
        </View>

        {likedTracks.length === 0 ? (
          <EmptyState icon="favorite-border" title="No liked songs yet" hint="Tap the heart on any track to save it here." />
        ) : (
          <View style={styles.trackList}>
            {likedTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                index={index + 1}
                title={track.title}
                artist={track.artistName}
                durationLabel={formatDuration(track.durationSec)}
                explicit={track.explicit}
                lossless={track.lossless}
                isPlaying={currentTrackId === track.id && isPlaying}
                liked
                onPress={() => play(track.id, likedTrackIdsOrdered)}
                onToggleLike={() => toggleLike(track.id)}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {toast}
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
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  heroIcon: {
    width: 160,
    height: 160,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  spacer: {
    flex: 1,
  },
  trackList: {
    gap: 2,
  },
});
