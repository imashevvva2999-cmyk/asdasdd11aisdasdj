import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { InsetSafeArea } from '@/components/player/inset-safe-area';

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
import { useWindowSize } from '@/hooks/use-window-size';
import { lyricOpenAccessibilityLabel } from '@/lib/i18n';
import { lyricPreview, lyricsStateFor } from '@/lib/lyrics-state';
import { goBack } from '@/lib/navigation';
import { getAlbumById } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';
import { PLAYER_ARTWORK_TOP_GAP, PLAYER_HEADER_HEIGHT, playerArtworkSize } from '@/state/player-surface';

/** Secondary text and inactive icons on the adaptive background (readable on every palette). */
const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';
/** Shuffle / repeat when off: quieter than the transport (W3 Этап 1, iphone/now-playing.png). */
const ON_COLOR_QUIET = 'rgba(255, 255, 255, 0.56)';

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
  const { height: windowHeight } = useWindowSize();
  const { t, locale } = useAppStrings();
  // Expand/collapse sheet (mini-player ↔ full player), Back/Escape handling.
  const { collapse, sheetStyle, backgroundStyle, chromeStyle, artStyle, markArtReady } = usePlayerSheet();

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
        <InsetSafeArea style={styles.emptyState}>
          <ThemedText variant="headline-sm" emphasis="medium">
            {t('nothingPlayingLabel')}
          </ThemedText>
        </InsetSafeArea>
      </ThemedView>
    );
  }

  const album = track.albumId ? getAlbumById(track.albumId) : undefined;
  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';
  const demoAudio = hasDemoAudio(track.id);
  const artworkSize = playerArtworkSize(windowWidth, windowHeight);
  // One lyric line under the controls — only for real lyrics data (W3 spec §2.4).
  const lyricLine = lyricPreview(lyricsStateFor(track.id), progressSec * 1000, locale);

  return (
    <GestureDetector gesture={collapse}>
      <Animated.View style={[styles.sheet, sheetStyle]} testID="now-playing-sheet">
      {/* Dynamic Premium: the cover's palette, following the carousel; from the
          Home stage it fills in over the stage as the player grows. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <PlayerBackground />
      </Animated.View>
      <InsetSafeArea style={styles.flex}>
        <Animated.View style={[styles.header, chromeStyle]}>
          <IconButton variant="ghost" icon="keyboard-arrow-down" iconSize={28} accessibilityLabel={t('collapsePlayerLabel')} onPress={() => goBack()} />
          <View style={styles.headerCenter}>
            <ThemedText variant="label-sm" style={[styles.headerEyebrow, styles.onColorMedium]}>
              {album ? t('playingFromAlbum') : t('playingLabel')}
            </ThemedText>
            <ThemedText variant="label-md" numberOfLines={1}>
              {album?.title ?? track.title}
            </ThemedText>
          </View>
          <IconButton
            variant="ghost"
            icon="more-horiz"
            iconSize={26}
            accessibilityLabel={t('moreOptionsLabel')}
            onPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
          />
        </Animated.View>

        <Animated.View style={[styles.artworkWrap, artStyle]}>
          {/* Swipe left/right to change track (the real playing track). */}
          <ArtworkCarousel size={artworkSize} paused={!isPlaying} onCoverLoad={markArtReady} />
        </Animated.View>

        <Animated.View style={[styles.chrome, chromeStyle]}>

        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <ThemedText variant="headline-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            {/* Inline with the artist so the title block keeps one height for every track. */}
            <View style={styles.artistRow}>
              {/* The artist sheet (artist + album, Apple Music style); the full profile is one tap inside it. */}
              <PressableLink label={track.artistName} onPress={() => router.push({ pathname: '/sheets/now-playing-artist', params: { trackId: track.id } })} />
              {demoAudio && (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t('demoAudioViewCreditsLabel')}
                  onPress={() => router.push('/sheets/demo-audio')}
                  style={styles.demoPill}
                >
                  <Icon name="info-outline" size={14} color={ON_COLOR_MEDIUM} />
                  <ThemedText variant="label-sm" style={styles.onColorMedium}>
                    {t('demoAudio')}
                  </ThemedText>
                </PressableScale>
              )}
            </View>
          </View>
          <IconButton
            icon={liked ? 'favorite' : 'favorite-border'}
            accessibilityLabel={liked ? t('unlikeLabel') : t('likeLabel')}
            color={liked ? Colors.primary : ON_COLOR_MEDIUM}
            size={48}
            onPress={() => toggleLike(track.id)}
          />
        </View>

        <SeekBar
          progressSec={progressSec}
          durationSec={durationSec}
          disabled={unavailable}
          message={unavailable ? t('noAudioPreviewMessage') : failed ? t('playbackErrorMessage') : undefined}
          onSeek={seekTo}
          labelStyle={styles.onColorMedium}
        />

        <View style={styles.transportRow}>
          <IconButton
            variant="ghost"
            icon="shuffle"
            iconSize={22}
            accessibilityLabel={t('shuffleLabel')}
            color={shuffle ? Colors.primary : ON_COLOR_QUIET}
            onPress={toggleShuffle}
          />
          <IconButton variant="ghost" icon="skip-previous" iconSize={38} accessibilityLabel={t('previousTrackLabel')} size={52} onPress={previous} />
          <CircleButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={unavailable ? t('playUnavailableLabel') : playback === 'loading' ? t('loadingPauseLabel') : isPlaying ? t('pauseLabel') : t('playLabel')}
            size={72}
            iconSize={36}
            disabled={unavailable}
            loading={playback === 'loading'}
            onPress={togglePlayPause}
          />
          <IconButton variant="ghost" icon="skip-next" iconSize={38} accessibilityLabel={t('nextTrackLabel')} size={52} onPress={next} />
          <IconButton
            variant="ghost"
            iconSize={22}
            icon="repeat"
            accessibilityLabel={t('repeatLabel')}
            color={repeat !== 'off' ? Colors.primary : ON_COLOR_QUIET}
            onPress={cycleRepeat}
          />
        </View>

        {lyricLine !== undefined && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={lyricOpenAccessibilityLabel(locale, lyricLine.label, lyricLine.text)}
            onPress={() => router.push('/player/lyrics')}
            style={styles.lyricPreview}
          >
            <ThemedText variant="label-sm" style={styles.onColorQuiet}>
              {lyricLine.label}
            </ThemedText>
            <ThemedText variant="body-lg" numberOfLines={1} style={styles.lyricText}>
              {lyricLine.text}
            </ThemedText>
          </PressableScale>
        )}

        <View style={styles.actionBar}>
          <PlayerTabButton label={t('lyricsTab')} icon="lyrics" onPress={() => router.push('/player/lyrics')} />
          <PlayerTabButton label={t('queueTab')} icon="queue-music" onPress={() => router.push('/player/queue')} />
          <PlayerTabButton
            label={t('supportTab')}
            icon="volunteer-activism"
            onPress={() => router.push({ pathname: '/sheets/support', params: { artistId: track.artistId } })}
          />
          <PlayerTabButton label={t('audioTab')} icon="headphones" onPress={() => router.push('/profile/audio-quality')} />
        </View>
        </Animated.View>
      </InsetSafeArea>
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

/** Quiet icon-over-label action in the player's bottom row (W3 Этап 1, iphone/now-playing.png). */
function PlayerTabButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.playerTabButton}>
      <Icon name={icon} size={22} color={ON_COLOR_MEDIUM} />
      <ThemedText variant="label-sm" style={styles.onColorMedium}>
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
  onColorQuiet: {
    color: ON_COLOR_QUIET,
  },
  chrome: {
    flex: 1,
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
    marginTop: Spacing.lg,
  },
  lyricPreview: {
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.margin,
    paddingVertical: Spacing.xs,
  },
  lyricText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.margin,
    // Pinned to the bottom of the player, whatever the screen height.
    marginTop: 'auto',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  playerTabButton: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
});
