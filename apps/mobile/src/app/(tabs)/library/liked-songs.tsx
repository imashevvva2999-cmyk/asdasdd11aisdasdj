import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, EmptyState, IconButton, TrackRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getTrackById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/**
 * S-13 Liked Songs — "auto playlist" sourced live from the shared player store's
 * `likedTrackIds`, not a separate local list, so liking a track anywhere in the
 * app (Now Playing, Album, Playlist, Artist) is reflected here immediately.
 */
export default function LikedSongsScreen() {
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const likedTracks = Array.from(likedTrackIds)
    .map((id) => getTrackById(id))
    .filter(Boolean);
  const likedTrackIdsOrdered = likedTracks.map((t) => t!.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Artwork size={160} radius={24} />
          <ThemedText variant="headline-lg" style={styles.title}>
            Liked Songs
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            Auto Playlist • {likedTracks.length} saved tracks
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton icon="download" accessibilityLabel="Download offline" onPress={() => {}} />
            <IconButton icon="sort" accessibilityLabel="Sort" onPress={() => {}} />
            <View style={styles.spacer} />
            <IconButton
              icon="shuffle"
              accessibilityLabel="Shuffle"
              onPress={() => likedTrackIdsOrdered.length > 0 && play(likedTrackIdsOrdered[0]!, likedTrackIdsOrdered)}
            />
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
          <EmptyState
            icon="favorite-border"
            title="No liked songs yet"
            hint="Tap the heart on any track to save it here."
          />
        ) : (
          <View style={styles.trackList}>
            {likedTracks.map((track, index) => (
              <TrackRow
                key={track!.id}
                index={index + 1}
                title={track!.title}
                artist={track!.artistName}
                durationLabel={formatDuration(track!.durationSec)}
                explicit={track!.explicit}
                lossless={track!.lossless}
                isPlaying={currentTrackId === track!.id && isPlaying}
                liked
                onPress={() => play(track!.id, likedTrackIdsOrdered)}
                onToggleLike={() => toggleLike(track!.id)}
              />
            ))}
          </View>
        )}
      </View>
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
    flex: 1,
    padding: Spacing.margin,
    gap: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
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
