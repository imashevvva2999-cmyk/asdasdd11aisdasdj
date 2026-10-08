import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { ArtworkCarousel } from '@/components/player/artwork-carousel';
import { SeekBar } from '@/components/player/seek-bar';
import { ThemedText } from '@/components/themed-text';
import { CircleButton, Icon, IconButton, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { homeChromeOffset, homeChromeOpacity } from '@/lib/stage-math';
import { hasStartedPlayback } from '@/lib/stage-rules';
import { usePlayerStore } from '@/state/player-store';
import { expandOrigin, expandProgress, stageCoverRect } from '@/state/player-surface';

/** The cover on the Home stage (iphone/home.png); it grows into Now Playing's. */
export const STAGE_COVER_SIZE = 256;

const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

/**
 * The Floating Canvas stage at the top of Home (W3 Этап 1, Concept D,
 * iphone/home.png): the playing track on its own palette — swipe the cover to
 * change track, tap it to open Now Playing, ⏮ Play ⏭, the scrubber, and quiet
 * Like / Lyrics / Up next. The palette background is drawn by Home behind
 * this block and its header. Renders nothing when nothing is playing — Home
 * then starts with its editorial sections (decision OQ-W3-2), never a fake
 * playing state.
 */
export function HomeStage({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const engineDurationSec = usePlayerStore((s) => s.durationSec);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const liked = usePlayerStore((s) => (track ? s.isLiked(track.id) : false));
  const coverRef = useRef<View>(null);
  // Growing into Now Playing: everything under the cover slides down and fades first.
  const chromeStyle = useAnimatedStyle(() => {
    if (expandOrigin.value !== 'stage') return { opacity: 1, transform: [{ translateY: 0 }] };
    const p = expandProgress.value;
    return { opacity: homeChromeOpacity(p), transform: [{ translateY: homeChromeOffset(p) }] };
  });

  const openPlayer = useCallback(() => {
    openPlayerFromStage(coverRef.current);
  }, []);

  if (!track || !hasStartedPlayback(playback)) return null;

  // The engine's real duration once loaded; the catalog value until then.
  const durationSec = engineDurationSec ?? track.durationSec;
  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';

  return (
    <View style={styles.stage} onLayout={onLayout} testID="home-stage">
      <View ref={coverRef} collapsable={false} style={styles.cover}>
        <ArtworkCarousel size={STAGE_COVER_SIZE} paused={!isPlaying} onPress={openPlayer} insideScroll />
      </View>

      <Animated.View style={chromeStyle}>
      {/* Also opens the player: the keyboard / screen-reader path (the cover's
          tap is a pointer gesture, and the capsule steps aside for the stage). */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Open player: ${track.title} by ${track.artistName}`}
        onPress={openPlayer}
        style={styles.titleBlock}
      >
        <ThemedText variant="display-lg-mobile" numberOfLines={1} style={styles.center}>
          {track.title}
        </ThemedText>
        <ThemedText variant="label-lg" numberOfLines={1} style={[styles.center, styles.onColorMedium]}>
          {track.artistName}
        </ThemedText>
      </PressableScale>

      <View style={styles.transport}>
        <IconButton variant="ghost" icon="skip-previous" iconSize={34} size={48} accessibilityLabel="Previous track" onPress={previous} />
        <CircleButton
          icon={isPlaying ? 'pause' : 'play-arrow'}
          accessibilityLabel={unavailable ? 'Play (no audio in this preview)' : playback === 'loading' ? 'Loading. Pause' : isPlaying ? 'Pause' : 'Play'}
          size={64}
          iconSize={32}
          disabled={unavailable}
          loading={playback === 'loading'}
          onPress={togglePlayPause}
        />
        <IconButton variant="ghost" icon="skip-next" iconSize={34} size={48} accessibilityLabel="Next track" onPress={next} />
      </View>

      <View style={styles.seek}>
        <SeekBar
          progressSec={progressSec}
          durationSec={durationSec}
          disabled={unavailable}
          message={unavailable ? 'No audio in this preview' : failed ? "Couldn't play this track. Tap play to retry." : undefined}
          onSeek={seekTo}
          labelStyle={styles.onColorMedium}
        />
      </View>

      <View style={styles.quietRow}>
        <QuietAction
          icon={liked ? 'favorite' : 'favorite-border'}
          iconColor={liked ? Colors.primary : ON_COLOR_MEDIUM}
          label={liked ? 'Liked' : 'Like'}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          onPress={() => toggleLike(track.id)}
        />
        <QuietAction icon="lyrics" label="Lyrics" onPress={() => router.push('/player/lyrics')} />
        <QuietAction icon="queue-music" label="Up next" onPress={() => router.push('/player/queue')} />
      </View>
      </Animated.View>
    </View>
  );
}

/** Opens Now Playing from the stage, noting where the cover is so it can grow from there. */
export function openPlayerFromStage(cover: View | null) {
  // Web: the pressed cover keeps focus while the player hides Home from
  // assistive tech (aria-hidden); release focus first.
  if (Platform.OS === 'web') (document.activeElement as HTMLElement | null)?.blur?.();
  const open = () =>
    router.push({ pathname: '/player/now-playing', params: { trackId: usePlayerStore.getState().currentTrackId() } });
  if (!cover) {
    stageCoverRect.value = null;
    expandOrigin.value = 'mini';
    open();
    return;
  }
  cover.measureInWindow((x, y, width, height) => {
    const known = width > 0;
    stageCoverRect.value = known ? { x, y, width, height } : null;
    // Unknown place: fall back to the classic slide-up from the capsule.
    expandOrigin.value = known ? 'stage' : 'mini';
    open();
  });
}

function QuietAction({
  icon,
  label,
  onPress,
  iconColor = ON_COLOR_MEDIUM,
  accessibilityLabel,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  iconColor?: string;
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={styles.quietAction}>
      <Icon name={icon} size={18} color={iconColor} />
      <ThemedText variant="label-md" style={styles.onColorMedium}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'stretch',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  cover: {
    alignSelf: 'center',
  },
  titleBlock: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.margin,
    gap: 2,
  },
  center: {
    textAlign: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginTop: Spacing.md,
  },
  seek: {
    marginTop: Spacing.sm,
  },
  quietRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quietAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
  },
  onColorMedium: {
    color: ON_COLOR_MEDIUM,
  },
});
