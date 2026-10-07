import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, IconButton, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { nextSortMode, sortTracks, type TrackSortMode } from '@/lib/sort-tracks';
import { getTrackById, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

/** Pre-renders `late-night-flow` (the playlist with a full `trackIds` listing) for
 * static web export (verify-routes.mjs); other playlist IDs still resolve at runtime. */
export function generateStaticParams() {
  return [{ id: 'late-night-flow' }];
}

/**
 * S-10/S-11 Playlist Detail — shared route for both documented variants (user vs
 * editorial playlist, OQ-18 still open on which content model backs each — only the
 * presentational layout is implemented here).
 */
export default function PlaylistScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const playlist = usePlaylistsStore((s) => s.getPlaylistById(id));

  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const isSaved = useLibraryStore((s) => s.isSaved('playlist', id));
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const { showToast, toast } = useToast();

  const trackList = useMemo(
    () => sortTracks((playlist?.trackIds ?? []).map((trackId) => getTrackById(trackId)).filter((t): t is Track => Boolean(t)), sortMode),
    [playlist?.trackIds, sortMode],
  );

  if (!playlist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Playlist not found.
        </ThemedText>
      </ThemedView>
    );
  }

  const trackIdsForPlayback = trackList.map((t) => t.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={playlist.coverUri} size={220} radius={24} />
          <ThemedText variant="headline-lg" style={styles.title} numberOfLines={2}>
            {playlist.title}
          </ThemedText>
          {playlist.description && (
            <ThemedText variant="body-md" emphasis="medium" style={styles.description}>
              {playlist.description}
            </ThemedText>
          )}
          <ThemedText variant="body-sm" emphasis="medium">
            {playlist.editorial
              ? `Editorial Playlist${playlist.curator ? ` · ${playlist.curator}` : ''}`
              : playlist.curator
                ? `Curated by · ${playlist.curator}`
                : 'Your playlist'}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {formatTrackCount(trackList.length || playlist.trackCount)}
            {playlist.durationLabel ? ` • ${playlist.durationLabel}` : ''}
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={isSaved ? 'favorite' : 'favorite-border'}
              color={isSaved ? Colors.primary : undefined}
              accessibilityLabel={isSaved ? 'Remove playlist from Library' : 'Save playlist'}
              onPress={() => {
                toggleSaved('playlist', playlist.id);
                showToast(isSaved ? 'Removed from Library' : 'Saved to Library', 'check');
              }}
            />
            <IconButton
              icon={isDownloaded ? 'download-done' : 'download'}
              color={isDownloaded ? Colors.secondary : undefined}
              accessibilityLabel={isDownloaded ? 'Remove download' : 'Download'}
              onPress={() => {
                toggleDownloaded(playlist.id, 'playlist');
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
            <IconButton
              icon="shuffle"
              accessibilityLabel="Shuffle"
              onPress={() => playShuffled(trackIdsForPlayback)}
            />
            <CircleButton
              icon="play-arrow"
              accessibilityLabel="Play all"
              size={56}
              iconSize={26}
              onPress={() => trackIdsForPlayback.length > 0 && play(trackIdsForPlayback[0]!, trackIdsForPlayback)}
            />
          </View>
        </View>

        <View style={styles.trackList}>
          {trackList.length === 0 && (
            <ThemedText variant="body-md" emphasis="medium" style={styles.emptyHint}>
              No tracks yet — add some from any track&apos;s ⋮ menu.
            </ThemedText>
          )}
          {trackList.map((track, index) => (
            <TrackRow
              key={track.id}
              index={index + 1}
              title={track.title}
              artist={track.artistName}
              durationLabel={formatDuration(track.durationSec)}
              explicit={track.explicit}
              lossless={track.lossless}
              isPlaying={currentTrackId === track.id && isPlaying}
              liked={isLiked(track.id)}
              onPress={() => play(track.id, trackIdsForPlayback)}
              onToggleLike={() => toggleLike(track.id)}
              onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
            />
          ))}
        </View>
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

function formatTrackCount(count: number): string {
  return `${count} ${count === 1 ? 'track' : 'tracks'}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    paddingBottom: Spacing.xl * 3,
    gap: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  description: {
    textAlign: 'center',
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
  emptyHint: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
