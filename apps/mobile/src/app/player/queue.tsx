import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerBackground } from '@/components/player/player-background';
import { PlayerSubHeader } from '@/components/player/player-subheader';
import { PlayerTransport } from '@/components/player/player-transport';
import { ThemedText } from '@/components/themed-text';
import { Artwork, EmptyState, EqualizerIndicator, Icon, IconButton, QueueRow, Toggle } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getTrackById, type Track } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

/** Quiet surface for rows on the adaptive stage (no grey cards, W3 spec §1). */
const ON_STAGE_SURFACE = 'rgba(10, 10, 12, 0.28)';

/**
 * S-17 Playback Queue (docs/screens.md §3.9; W3 Этап 1, iphone/queue.png): on
 * the cover's stage colour, with the shared Lyrics / Queue header and the
 * playback controls always below. Derives the track list locally
 * from the store's stable `queue` id array instead of calling the store's
 * own `queueTracks()` selector directly — that function allocates a new
 * array on every call, which breaks React's snapshot-stability check
 * (`useSyncExternalStore`) and crashes this screen with "Maximum update
 * depth exceeded".
 */
export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const queueTracks = useMemo(
    () => queue.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t)),
    [queue],
  );
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const order = usePlayerStore((s) => s.order);
  const playFromQueueIndex = usePlayerStore((s) => s.playFromQueueIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const autoplay = usePlayerStore((s) => s.autoplay);
  const toggleAutoplay = usePlayerStore((s) => s.toggleAutoplay);

  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const { t } = useAppStrings();

  const current = queueTracks[currentIndex];
  const currentLiked = current ? likedTrackIds.has(current.id) : false;
  // "Playing Next" follows the play order (shuffle included), not queue order.
  const upcomingIndices = useMemo(() => order.slice(order.indexOf(currentIndex) + 1), [order, currentIndex]);
  const upcoming = upcomingIndices.map((index) => queueTracks[index]).filter((t): t is Track => Boolean(t));
  const openCurrentOptions = () => {
    if (current) router.push({ pathname: '/sheets/options', params: { kind: 'track', id: current.id } });
  };

  return (
    <View style={styles.flex}>
      <PlayerBackground />
      <SafeAreaView style={styles.flex}>
        <PlayerSubHeader active="queue" />

        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          {current && (
            <View style={styles.section}>
              <View style={styles.eyebrowRow}>
                <Icon name="graphic-eq" size={16} color={Colors.primary} />
                <ThemedText variant="label-sm" emphasis="primary" style={styles.eyebrow}>
                  {t('nowPlayingEyebrowLabel')}
                </ThemedText>
              </View>
              <View style={styles.nowPlayingCard}>
                <View>
                  <Artwork uri={current.coverUri} size={56} radius={Radii.DEFAULT} />
                  {isPlaying && (
                    <View style={styles.coverOverlay}>
                      <EqualizerIndicator size={18} />
                    </View>
                  )}
                </View>
                <View style={styles.nowPlayingText}>
                  <ThemedText variant="headline-sm" numberOfLines={1} style={styles.nowPlayingTitle}>
                    {current.title}
                  </ThemedText>
                  <ThemedText variant="body-md" emphasis="medium" numberOfLines={1}>
                    {current.artistName}
                  </ThemedText>
                  <ThemedText variant="mono-num" emphasis="low">
                    {formatDuration(current.durationSec)}
                  </ThemedText>
                </View>
                <IconButton
                  variant="ghost"
                  icon={currentLiked ? 'favorite' : 'favorite-border'}
                  iconSize={26}
                  color={currentLiked ? Colors.primary : Colors.text.medium}
                  accessibilityLabel={currentLiked ? t('unlikeLabel') : t('likeLabel')}
                  onPress={() => toggleLike(current.id)}
                />
                <IconButton variant="ghost" icon="more-horiz" iconSize={24} accessibilityLabel={t('moreOptionsLabel')} onPress={openCurrentOptions} />
              </View>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('playingNextLabel')}</ThemedText>

            {upcoming.length === 0 ? (
              <EmptyState icon="queue-music" title={t('queueEmpty')} hint={t('queueEmptyHint')} />
            ) : (
              upcoming.map((track, offset) => (
                <QueueRow
                  key={`${track.id}-${offset}`}
                  coverUri={track.coverUri}
                  title={track.title}
                  artist={track.artistName}
                  durationLabel={formatDuration(track.durationSec)}
                  onPress={() => playFromQueueIndex(upcomingIndices[offset]!)}
                  style={styles.queueRow}
                />
              ))
            )}
          </View>

          <View style={styles.autoplayRow}>
            <Icon name="all-inclusive" size={24} color={Colors.primary} />
            <View style={styles.autoplayText}>
              <ThemedText variant="label-lg">{t('infinityAutoplay')}</ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                {t('keepPlayingSimilarMusicHint')}
              </ThemedText>
            </View>
            <Toggle value={autoplay} onValueChange={toggleAutoplay} accessibilityLabel={t('infinityAutoplay')} />
          </View>
        </ScrollView>
        <PlayerTransport />
      </SafeAreaView>
    </View>
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
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eyebrow: {
    letterSpacing: 1,
  },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ON_STAGE_SURFACE,
  },
  nowPlayingTitle: {
    color: Colors.primary,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radii.DEFAULT,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  queueRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ON_STAGE_SURFACE,
  },
  autoplayText: {
    flex: 1,
    gap: 2,
  },
});
