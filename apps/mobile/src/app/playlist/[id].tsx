import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, IconButton, TrackRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getPlaylistById, getTrackById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = getPlaylistById(id ?? '');

  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  if (!playlist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Playlist not found.
        </ThemedText>
      </ThemedView>
    );
  }

  const trackList = (playlist.trackIds ?? []).map((trackId) => getTrackById(trackId)).filter(Boolean);
  const trackIdsForPlayback = trackList.map((t) => t!.id);

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
            {playlist.editorial ? 'Editorial Playlist' : 'Curated by'} {playlist.curator ? `· ${playlist.curator}` : ''}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {trackList.length || playlist.trackCount} tracks • {playlist.durationLabel}
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={trackList[0] && isLiked(trackList[0]!.id) ? 'favorite' : 'favorite-border'}
              accessibilityLabel="Save playlist"
              onPress={() => trackList[0] && toggleLike(trackList[0]!.id)}
            />
            <IconButton icon="download" accessibilityLabel="Download" onPress={() => {}} />
            <IconButton icon="sort" accessibilityLabel="Sort" onPress={() => {}} />
            <View style={styles.spacer} />
            <IconButton
              icon="shuffle"
              accessibilityLabel="Shuffle"
              onPress={() => trackIdsForPlayback.length > 0 && play(trackIdsForPlayback[0]!, trackIdsForPlayback)}
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
          {trackList.map((track, index) => (
            <TrackRow
              key={track!.id}
              index={index + 1}
              title={track!.title}
              artist={track!.artistName}
              durationLabel={formatDuration(track!.durationSec)}
              explicit={track!.explicit}
              lossless={track!.lossless}
              isPlaying={currentTrackId === track!.id && isPlaying}
              liked={isLiked(track!.id)}
              onPress={() => play(track!.id, trackIdsForPlayback)}
              onToggleLike={() => toggleLike(track!.id)}
              onOptionsPress={() => {}}
            />
          ))}
        </View>
      </ScrollView>
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
});
