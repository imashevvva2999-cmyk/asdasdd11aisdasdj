import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hasDemoAudio } from '@/audio/demo-audio';
import { ArtworkCarousel } from '@/components/player/artwork-carousel';
import { PlayerBackground } from '@/components/player/player-background';
import { SeekBar } from '@/components/player/seek-bar';
import { usePlayerSheet } from '@/components/player/use-player-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, Icon, IconButton, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { goBack } from '@/lib/navigation';
import { getAlbumById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { PLAYER_ARTWORK_TOP_GAP, PLAYER_HEADER_HEIGHT, playerArtworkSize } from '@/state/player-surface';

/** Secondary text and inactive icons on the adaptive background (readable on every palette). */
const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

/** S-15 Now Playing — full-screen player modal (docs/screens.md §3.9). */
export default function NowPlayingScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const engineDurationSec = usePlayerStore((s) => s.durationSec);
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
  const windowWidth = useContentWidth();
  // Expand/collapse sheet (mini-player ↔ full player), Back/Escape handling.
  const { collapse, sheetStyle, chromeStyle, artStyle } = usePlayerSheet();

  // Hooks stay above the empty-state return below.
  // The engine's real duration once loaded; the catalog value until then.
  const durationSec = engineDurationSec ?? track?.durationSec ?? 0;

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
  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';
  const demoAudio = hasDemoAudio(track.id);
  const artworkSize = playerArtworkSize(windowWidth);

  return (
    <GestureDetector gesture={collapse}>
      <Animated.View style={[styles.sheet, sheetStyle]} testID="now-playing-sheet">
      {/* Dynamic Premium: the cover's palette, following the carousel. */}
      <PlayerBackground />
      <SafeAreaView style={styles.flex}>
        <Animated.View style={[styles.header, chromeStyle]}>
          <IconButton variant="ghost" icon="keyboard-arrow-down" iconSize={28} accessibilityLabel="Collapse player" onPress={() => goBack()} />
          <View style={styles.headerCenter}>
            <ThemedText variant="label-sm" style={[styles.headerEyebrow, styles.onColorMedium]}>
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
        </Animated.View>

        <Animated.View style={[styles.artworkWrap, artStyle]}>
          {/* Swipe left/right to change track (the real playing track). */}
          <ArtworkCarousel size={artworkSize} paused={!isPlaying} />
        </Animated.View>

        <Animated.View style={chromeStyle}>

        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <ThemedText variant="headline-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            {/* Inline with the artist so the title block keeps one height for every track. */}
            <View style={styles.artistRow}>
              <PressableLink
                label={track.artistName}
                onPress={() => router.push({ pathname: '/artist/[id]', params: { id: track.artistId } })}
              />
              {demoAudio && (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Demo audio. View credits"
                  onPress={() => router.push('/sheets/demo-audio')}
                  style={styles.demoPill}
                >
                  <Icon name="info-outline" size={14} color={ON_COLOR_MEDIUM} />
                  <ThemedText variant="label-sm" style={styles.onColorMedium}>
                    Demo audio
                  </ThemedText>
                </PressableScale>
              )}
            </View>
          </View>
          <IconButton
            icon={liked ? 'favorite' : 'favorite-border'}
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
            color={liked ? Colors.primary : ON_COLOR_MEDIUM}
            size={48}
            onPress={() => toggleLike(track.id)}
          />
        </View>

        <SeekBar
          progressSec={progressSec}
          durationSec={durationSec}
          disabled={unavailable}
          message={unavailable ? 'No audio in this preview' : failed ? "Couldn't play this track. Tap play to retry." : undefined}
          onSeek={seekTo}
          labelStyle={styles.onColorMedium}
        />

        <View style={styles.transportRow}>
          <IconButton
            variant="ghost"
            icon="shuffle"
            iconSize={26}
            accessibilityLabel="Shuffle"
            color={shuffle ? Colors.primary : ON_COLOR_MEDIUM}
            onPress={toggleShuffle}
          />
          <IconButton variant="ghost" icon="skip-previous" iconSize={38} accessibilityLabel="Previous track" size={52} onPress={previous} />
          <CircleButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={unavailable ? 'Play (no audio in this preview)' : playback === 'loading' ? 'Loading. Pause' : isPlaying ? 'Pause' : 'Play'}
            size={72}
            iconSize={36}
            disabled={unavailable}
            loading={playback === 'loading'}
            onPress={togglePlayPause}
          />
          <IconButton variant="ghost" icon="skip-next" iconSize={38} accessibilityLabel="Next track" size={52} onPress={next} />
          <IconButton
            variant="ghost"
            iconSize={26}
            icon="repeat"
            accessibilityLabel="Repeat"
            color={repeat !== 'off' ? Colors.primary : ON_COLOR_MEDIUM}
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
          <PlayerTabButton label="Audio" icon="headphones" onPress={() => router.push('/profile/audio-quality')} />
        </View>
        </Animated.View>
      </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}

function PressableLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.inlineLink}>
      <ThemedText variant="label-lg" numberOfLines={1} style={styles.onColorMedium}>
        {label}
      </ThemedText>
      <Icon name="chevron-right" size={16} color={ON_COLOR_MEDIUM} />
    </PressableScale>
  );
}

/** Horizontal icon + label pill in the player's bottom action bar (Stitch S-15). */
function PlayerTabButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.playerTabButton}>
      <Icon name={icon} size={18} color={ON_COLOR_MEDIUM} />
      <ThemedText variant="label-md" style={styles.onColorMedium}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    flex: 1,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: PLAYER_HEADER_HEIGHT,
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
    marginTop: PLAYER_ARTWORK_TOP_GAP,
    marginBottom: Spacing.xl,
  },
  onColorMedium: {
    color: ON_COLOR_MEDIUM,
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
    flexShrink: 1,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    backgroundColor: 'rgba(10, 10, 12, 0.3)',
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
