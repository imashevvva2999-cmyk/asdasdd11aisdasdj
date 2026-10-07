import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, Icon, IconButton, PillButton, TrackRow } from '@/components/ui';
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
        {/* Stitch S-13: badge left, text right, then Play All + shuffle on the
            left and the quieter download / sort controls on the right. */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Icon name="favorite" size={40} color={Colors.primary} />
          </View>
          <View style={styles.heroText}>
            <ThemedText variant="label-sm" emphasis="primary" style={styles.eyebrow}>
              Auto Playlist
            </ThemedText>
            <ThemedText variant="display-lg-mobile">Liked Songs</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">
              {likedTracks.length} {likedTracks.length === 1 ? 'saved track' : 'saved tracks'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <PillButton
            label="Play All"
            leadingIcon="play-arrow"
            disabled={likedTrackIdsOrdered.length === 0}
            onPress={() => likedTrackIdsOrdered.length > 0 && play(likedTrackIdsOrdered[0]!, likedTrackIdsOrdered)}
            style={styles.playAll}
          />
          <IconButton icon="shuffle" size={48} accessibilityLabel="Shuffle" onPress={() => playShuffled(likedTrackIdsOrdered)} />
          <View style={styles.spacer} />
          <IconButton
            variant="ghost"
            size={40}
            icon={isDownloaded ? 'download-done' : 'download'}
            color={isDownloaded ? Colors.secondary : Colors.text.medium}
            accessibilityLabel={isDownloaded ? 'Remove download' : 'Download offline'}
            onPress={() => {
              toggleDownloaded(LIKED_SONGS_ID);
              showToast(isDownloaded ? 'Download removed' : 'Marked for offline (demo — no audio is stored yet)', 'download');
            }}
          />
          <IconButton
            variant="ghost"
            size={40}
            icon="swap-vert"
            color={Colors.text.medium}
            accessibilityLabel={`Sort: ${sortMode}`}
            onPress={() => {
              const next = nextSortMode(sortMode);
              setSortMode(next);
              showToast(`Sorted by ${next}`, 'sort');
            }}
          />
        </View>

        {likedTracks.length === 0 ? (
          <EmptyState icon="favorite-border" title="No liked songs yet" hint="Tap the heart on any track to save it here." />
        ) : (
          <View style={styles.trackList}>
            {likedTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                index={index + 1}
                coverUri={track.coverUri}
                active={currentTrackId === track.id}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  heroBadge: {
    width: 96,
    height: 96,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l2,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playAll: {
    paddingHorizontal: Spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  trackList: {
    gap: 2,
  },
});
