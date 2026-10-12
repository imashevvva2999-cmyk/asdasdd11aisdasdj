import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscoveryFeed } from '@/components/player/discovery-feed';
import { PlayerBackground } from '@/components/player/player-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, IconButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { goBack } from '@/lib/navigation';
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
  const { t } = useAppStrings();

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
            {t('queueEmpty')}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const unavailable = playback === 'unavailable';

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PlayerBackground />
      </Animated.View>
      <DiscoveryFeed size={{ width: windowWidth, height: windowHeight }} />
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <IconButton variant="ghost" icon="close" iconSize={26} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
        </View>
        <View style={styles.footer} pointerEvents="box-none">
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
            size={64}
            iconSize={32}
            disabled={unavailable}
            loading={playback === 'loading'}
            onPress={togglePlayPause}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onColorMedium: { color: ON_COLOR_MEDIUM },
  header: { height: 56, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
});
