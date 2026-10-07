import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, Icon, IconButton, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { goBack } from '@/lib/navigation';
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
  const [scrubberWidth, setScrubberWidth] = useState(0);
  const windowWidth = useContentWidth();

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
  // Stitch: artwork spans the content width (20px margins), capped at 340.
  const artworkSize = Math.min(340, windowWidth - Spacing.margin * 2);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <IconButton variant="ghost" icon="keyboard-arrow-down" iconSize={28} accessibilityLabel="Collapse player" onPress={() => goBack()} />
          <View style={styles.headerCenter}>
            <ThemedText variant="label-sm" emphasis="medium" style={styles.headerEyebrow}>
              {album ? 'PLAYING FROM ALBUM' : 'PLAYING'}
            </ThemedText>
            <ThemedText variant="label-md" numberOfLines={1}>
              {album?.title ?? track.title}
            </ThemedText>
          </View>
          <IconButton
            variant="ghost"
            icon="more-horiz"
            iconSize={26}
            accessibilityLabel="More options"
            onPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
          />
        </View>

        <View style={styles.artworkWrap}>
          <View style={styles.artworkGlow} pointerEvents="none" />
          <Artwork uri={track.coverUri} size={artworkSize} radius={32} />
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
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Seek"
            aria-valuemin={0}
            aria-valuemax={track.durationSec}
            aria-valuenow={Math.floor(progressSec)}
            aria-valuetext={`${formatTime(progressSec)} of ${formatTime(track.durationSec)}`}
            onLayout={(event) => setScrubberWidth(event.nativeEvent.layout.width)}
            onPress={(event) => {
              if (scrubberWidth <= 0) return;
              // react-native-web press events may omit `locationX`; fall back to
              // the DOM `offsetX` (same left edge — the bar spans the full width).
              const native = event.nativeEvent as { locationX?: number; offsetX?: number };
              const x = Number.isFinite(native.locationX) ? native.locationX : native.offsetX;
              if (x === undefined || !Number.isFinite(x)) return;
              const ratio = Math.min(1, Math.max(0, x / scrubberWidth));
              seekTo(Math.round(ratio * track.durationSec));
            }}
            style={styles.scrubberHitArea}
          >
            <View style={styles.scrubberTrack}>
              <View style={[styles.scrubberProgress, { width: `${progressRatio * 100}%` }]} />
            </View>
            <View pointerEvents="none" style={[styles.scrubberThumb, { left: `${progressRatio * 100}%` }]} />
          </Pressable>
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
            variant="ghost"
            icon="shuffle"
            iconSize={26}
            accessibilityLabel="Shuffle"
            color={shuffle ? Colors.primary : Colors.text.medium}
            onPress={toggleShuffle}
          />
          <IconButton variant="ghost" icon="skip-previous" iconSize={38} accessibilityLabel="Previous track" size={52} onPress={previous} />
          <CircleButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            size={72}
            iconSize={36}
            onPress={togglePlayPause}
          />
          <IconButton variant="ghost" icon="skip-next" iconSize={38} accessibilityLabel="Next track" size={52} onPress={next} />
          <IconButton
            variant="ghost"
            iconSize={26}
            icon="repeat"
            accessibilityLabel="Repeat"
            color={repeat !== 'off' ? Colors.primary : Colors.text.medium}
            onPress={cycleRepeat}
          />
        </View>

        <View style={styles.actionBar}>
          <PlayerTabButton label="Lyrics" icon="lyrics" onPress={() => router.push('/player/lyrics')} />
          <PlayerTabButton label="Queue" icon="queue-music" onPress={() => router.push('/player/queue')} />
          <PlayerTabButton
            label="Support"
            icon="volunteer-activism"
            onPress={() => router.push({ pathname: '/sheets/support', params: { artistId: track.artistId } })}
          />
          <PlayerTabButton label="Audio" icon="headphones" onPress={() => router.push('/profile/settings')} />
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

/** Horizontal icon + label pill in the player's bottom action bar (Stitch S-15). */
function PlayerTabButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.playerTabButton}>
      <Icon name={icon} size={18} color={Colors.text.medium} />
      <ThemedText variant="label-md" emphasis="medium">
        {label}
      </ThemedText>
    </PressableScale>
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
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  artworkGlow: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    opacity: 0.12,
    transform: [{ scale: 1.2 }],
  },
  titleRow: {
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
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
  scrubberHitArea: {
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  scrubberThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.8,
  },
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
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
    marginTop: Spacing.xl,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.xl,
    padding: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.surface.l1,
  },
  playerTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radii.full,
  },
});
