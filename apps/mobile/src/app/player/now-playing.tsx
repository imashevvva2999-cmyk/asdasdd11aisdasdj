import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, Icon, IconButton, PressableScale } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getAlbumById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** S-15 Now Playing — full-screen player modal (docs/screens.md §3.9). */
export default function NowPlayingScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const liked = usePlayerStore((s) => (track ? s.isLiked(track.id) : false));

  useEffect(() => {
    if (trackId && trackId !== currentTrackId) {
      play(trackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  if (!track) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <SafeAreaView style={styles.emptyState}>
          <ThemedText variant="headline-sm" emphasis="medium">
            Nothing is playing
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const album = track.albumId ? getAlbumById(track.albumId) : undefined;
  const remainingSec = Math.max(0, track.durationSec - progressSec);
  const progressRatio = track.durationSec > 0 ? progressSec / track.durationSec : 0;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <IconButton icon="keyboard-arrow-down" accessibilityLabel="Collapse player" onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            <ThemedText variant="label-sm" emphasis="medium" style={styles.headerEyebrow}>
              {album ? 'PLAYING FROM ALBUM' : 'PLAYING'}
            </ThemedText>
            <ThemedText variant="label-md" numberOfLines={1}>
              {album?.title ?? track.title}
            </ThemedText>
          </View>
          <IconButton icon="more-horiz" accessibilityLabel="More options" onPress={() => {}} />
        </View>

        <View style={styles.artworkWrap}>
          <Artwork uri={track.coverUri} size={320} radius={32} />
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <ThemedText variant="headline-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <PressableLink
              label={track.artistName}
              onPress={() => router.push({ pathname: '/artist/[id]', params: { id: track.artistId } })}
            />
          </View>
          <IconButton
            icon={liked ? 'favorite' : 'favorite-border'}
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
            color={liked ? Colors.primary : Colors.text.medium}
            size={48}
            onPress={() => toggleLike(track.id)}
          />
        </View>

        <View style={styles.scrubberBlock}>
          <View style={styles.scrubberTrack}>
            <View style={[styles.scrubberProgress, { width: `${progressRatio * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <ThemedText variant="mono-num" emphasis="medium">
              {formatTime(progressSec)}
            </ThemedText>
            <ThemedText variant="mono-num" emphasis="medium">
              -{formatTime(remainingSec)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.transportRow}>
          <IconButton
            icon="shuffle"
            accessibilityLabel="Shuffle"
            color={shuffle ? Colors.primary : Colors.text.medium}
            onPress={toggleShuffle}
          />
          <IconButton icon="skip-previous" accessibilityLabel="Previous track" size={48} onPress={previous} />
          <CircleButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            size={72}
            iconSize={36}
            onPress={togglePlayPause}
          />
          <IconButton icon="skip-next" accessibilityLabel="Next track" size={48} onPress={next} />
          <IconButton
            icon="repeat"
            accessibilityLabel="Repeat"
            color={repeat !== 'off' ? Colors.primary : Colors.text.medium}
            onPress={cycleRepeat}
          />
        </View>

        <View style={styles.actionBar}>
          <PlayerTabButton label="Lyrics" icon="lyrics" onPress={() => router.push('/player/lyrics')} />
          <PlayerTabButton label="Queue" icon="queue-music" onPress={() => router.push('/player/queue')} />
          <PlayerTabButton label="Support" icon="volunteer-activism" onPress={() => router.push('/sheets/support')} />
          <PlayerTabButton label="Audio" icon="headphones" onPress={() => {}} active />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function PressableLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.inlineLink}>
      <ThemedText variant="label-lg" emphasis="medium" numberOfLines={1}>
        {label}
      </ThemedText>
      <Icon name="chevron-right" size={16} color={Colors.text.medium} />
    </PressableScale>
  );
}

function PlayerTabButton({ label, icon, onPress, active }: { label: string; icon: string; onPress: () => void; active?: boolean }) {
  return (
    <View style={styles.playerTabButton}>
      <IconButton icon={icon} accessibilityLabel={label} onPress={onPress} color={active ? Colors.primary : Colors.text.medium} size={32} />
      <ThemedText variant="label-sm" style={active ? { color: Colors.primary } : undefined}>
        {label}
      </ThemedText>
    </View>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerEyebrow: {
    letterSpacing: 1,
  },
  artworkWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  titleRow: {
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  scrubberBlock: {
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  scrubberTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  scrubberProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.lg,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface.l1,
  },
  playerTabButton: {
    alignItems: 'center',
    gap: 2,
  },
});
