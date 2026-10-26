import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISCOVER_HEADER_HEIGHT, DISCOVER_PLAY_SIZE, DiscoveryFeed, discoverLayout } from '@/components/player/discovery-feed';
import { PlayerBackground } from '@/components/player/player-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, IconButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { getGenreIdForTrack, getTrackIdsForGenre } from '@/lib/genre-tracks';
import { genreNameLabel } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { useDiscoveryStore } from '@/state/discovery-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

/**
 * Late Night Flow — full-screen vertical discovery player (approved Option A).
 * Opens from Home's Late Night Flow waveform. Swipe up/down to move through
 * the queue via `DiscoveryFeed`, which calls the SAME `swipeTo` Now Playing's
 * horizontal carousel already uses — one playback system, two presentations.
 * Closing (the back control, or the hardware/browser back gesture) returns to
 * Home; nothing here stops playback on close, so the mini-player keeps
 * whatever track was last playing, exactly like leaving Now Playing today.
 */
export default function DiscoverScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const windowWidth = useContentWidth();
  const { height: windowHeight } = useWindowSize();
  // From the root provider, not a SafeAreaView measured inside this transparent
  // modal: the header always clears the status bar / Dynamic Island.
  const insets = useSafeAreaInsets();
  const layout = useMemo(
    () => discoverLayout(windowWidth, windowHeight, insets),
    [windowWidth, windowHeight, insets],
  );
  const { locale, t } = useAppStrings();
  const genreIds = useDiscoveryStore((s) => s.genreIds);
  const genreIndex = useDiscoveryStore((s) => s.genreIndex);
  const genreId = genreIds[genreIndex];
  const firstRun = useRef(true);
  // The song the user opened Discover from, and the genre it lives in. Kept in
  // refs so the open survives the start-genre switch and React's dev
  // double-invoked effects: runs for any other genre wait, and the entry is
  // consumed once, on the start genre.
  const entryRef = useRef<string | undefined>(undefined);
  const startIndexRef = useRef<number | undefined>(undefined);

  // Genre change (or first open): play this genre's queue, resuming its last track.
  useEffect(() => {
    const discovery = useDiscoveryStore.getState();
    const player = usePlayerStore.getState();
    if (firstRun.current) {
      firstRun.current = false;
      entryRef.current = trackId || player.currentTrackId();
      const entry = entryRef.current;
      const startGenre = (entry && getGenreIdForTrack(entry)) || discovery.genreIds[0];
      startIndexRef.current = Math.max(0, discovery.genreIds.indexOf(startGenre));
      if (startIndexRef.current !== discovery.genreIndex) {
        discovery.setGenreIndex(startIndexRef.current);
        return;
      }
    }
    if (startIndexRef.current !== undefined && startIndexRef.current !== genreIndex) return;
    startIndexRef.current = undefined;
    const entryTrack = entryRef.current;
    entryRef.current = undefined;
    const id = discovery.genreIds[genreIndex];
    const trackIds = id ? getTrackIdsForGenre(id) : [];
    if (trackIds.length === 0) {
      player.pause();
      return;
    }
    const restored = discovery.lastTrackByGenre[id];
    const current = player.currentTrackId();
    const sameQueue = player.queue.length === trackIds.length && player.queue.every((q, i) => q === trackIds[i]);
    // On open, the song the user came from wins; if this genre's queue is
    // already playing, keep its song; on genre swipes the remembered song wins.
    const target =
      entryTrack && trackIds.includes(entryTrack)
        ? entryTrack
        : sameQueue && current && trackIds.includes(current)
          ? current
          : restored && trackIds.includes(restored)
            ? restored
            : trackIds[0];
    if (!(sameQueue && current === target)) play(target, trackIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreIndex]);

  // Remember the last song per genre so returning to it resumes there.
  useEffect(() => {
    const discovery = useDiscoveryStore.getState();
    const id = discovery.genreIds[discovery.genreIndex];
    if (id && currentTrackId && getTrackIdsForGenre(id).includes(currentTrackId)) {
      discovery.recordLastTrack(id, currentTrackId);
    }
  }, [currentTrackId]);

  if (!track) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <SafeAreaView style={styles.emptyState}>
          <ThemedText variant="headline-sm" emphasis="medium">
            {t('queueEmpty')}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';
  const notice = unavailable ? t('noAudioPreviewMessage') : failed ? t('playbackErrorMessage') : undefined;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PlayerBackground />
      </Animated.View>
      <DiscoveryFeed size={{ width: windowWidth, height: windowHeight }} layout={layout} />
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[styles.header, { marginTop: insets.top }]} pointerEvents="box-none">
          <IconButton variant="ghost" icon="close" iconSize={26} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
          {genreId && (
            <View style={styles.genreChip}>
              <ThemedText variant="label-md" numberOfLines={1} style={styles.genreLabel}>
                #{genreNameLabel(locale, genreId)}
              </ThemedText>
            </View>
          )}
          {genreIds.length > 1 && (
            <View style={styles.genreDots}>
              {genreIds.map((id, i) => (
                <View key={id} style={[styles.genreDot, i === genreIndex && styles.genreDotActive]} />
              ))}
            </View>
          )}
        </View>
        {/* Lined up with the cover's edges, just under it (same layout as the feed). */}
        <View style={[styles.info, { top: layout.infoTop, left: layout.coverLeft, width: layout.cover }]} pointerEvents="box-none">
          <View style={styles.infoRow} pointerEvents="box-none">
            <View style={styles.titleBlock}>
              <ThemedText variant="headline-md" numberOfLines={1}>
                {track.title}
              </ThemedText>
              <ThemedText variant="label-lg" numberOfLines={1} style={styles.onColorMedium}>
                {track.artistName}
              </ThemedText>
            </View>
            <CircleButton
              icon={isPlaying ? 'pause' : 'play-arrow'}
              accessibilityLabel={unavailable ? t('playUnavailableLabel') : playback === 'loading' ? t('loadingPauseLabel') : isPlaying ? t('pauseLabel') : t('playLabel')}
              size={DISCOVER_PLAY_SIZE}
              iconSize={32}
              disabled={unavailable}
              loading={playback === 'loading'}
              onPress={togglePlayPause}
            />
          </View>
          {/* Same messages as Now Playing: a failed load is said, never just a play icon again. */}
          {notice && (
            <ThemedText variant="label-md" style={styles.onColorMedium} accessibilityLiveRegion="polite">
              {notice}
            </ThemedText>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onColorMedium: { color: ON_COLOR_MEDIUM },
  header: { height: DISCOVER_HEADER_HEIGHT, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  genreChip: {
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  genreLabel: { color: '#fff', letterSpacing: 0.3 },
  genreDots: { marginLeft: 'auto', flexDirection: 'row', gap: 6, paddingRight: Spacing.sm },
  genreDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  genreDotActive: { width: 18, backgroundColor: '#fff' },
  info: { position: 'absolute', gap: Spacing.sm },
  infoRow: { minHeight: DISCOVER_PLAY_SIZE, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
});
