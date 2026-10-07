import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, IconButton, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getAlbumById, getTrackById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** Pre-renders `horizon-deluxe` (the album with a full `trackIds` listing) for
 * static web export (verify-routes.mjs); other album IDs still resolve at runtime. */
export function generateStaticParams() {
  return [{ id: 'horizon-deluxe' }];
}

/** S-09 Album (docs/screens.md §3.4). */
export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const album = getAlbumById(id ?? '');
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  if (!album) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Album not found.
        </ThemedText>
      </ThemedView>
    );
  }

  const trackList = (album.trackIds ?? []).map((trackId) => getTrackById(trackId)).filter(Boolean);
  const typeLabel = album.type === 'ep' ? 'EP' : album.type === 'single' ? 'Single' : 'Album';

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={album.coverUri} size={220} radius={24} />
          <ThemedText variant="headline-lg" style={styles.title} numberOfLines={2}>
            {album.title}
          </ThemedText>
          <ThemedText
            variant="body-lg"
            emphasis="primary"
            onPress={() => router.push({ pathname: '/artist/[id]', params: { id: album.artistId } })}
          >
            {album.artistName}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {album.year} • {typeLabel} • {trackList.length || album.trackCount} tracks
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={trackList[0] && isLiked(trackList[0]!.id) ? 'favorite' : 'favorite-border'}
              accessibilityLabel="Save album"
              onPress={() => trackList[0] && toggleLike(trackList[0]!.id)}
            />
            <IconButton icon="download" accessibilityLabel="Download" onPress={() => {}} />
            <IconButton icon="more-horiz" accessibilityLabel="More options" onPress={() => {}} />
            <View style={styles.spacer} />
            <IconButton icon="shuffle" accessibilityLabel="Shuffle" onPress={() => trackList.length > 0 && play(trackList[0]!.id, trackList.map((t) => t!.id))} />
            <CircleButton
              icon="play-arrow"
              accessibilityLabel="Play album"
              size={56}
              iconSize={26}
              onPress={() => trackList.length > 0 && play(trackList[0]!.id, trackList.map((t) => t!.id))}
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
              onPress={() => play(track!.id, trackList.map((t) => t!.id))}
              onToggleLike={() => toggleLike(track!.id)}
              onOptionsPress={() => {}}
            />
          ))}
        </View>

        <ThemedText variant="body-sm" emphasis="medium" style={styles.footer}>
          © {album.year} {album.artistName}
        </ThemedText>
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
  footer: {
    textAlign: 'center',
    color: Colors.text.low,
  },
});
