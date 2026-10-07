import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/state/player-store';

import { ThemedText } from './themed-text';
import { EqualizerIndicator } from './ui/equalizer';
import { Icon } from './ui/icon';
import { IconButton } from './ui/button';
import { PressableScale } from './ui/pressable-scale';

/**
 * Floating mini-player (DESIGN.md "Floating Mini-Player"; docs/screens.md
 * §3.1/§3.2/§3.10 "мини-плеер" — present on every main-tab Stitch screen but
 * not previously implemented). Mounted once in `(tabs)/_layout.tsx` so it
 * stays consistent across Home/Search/Library instead of being rebuilt per
 * screen. Reads the existing `usePlayerStore` (Фаза 4 Batch 2) — no new
 * playback state, no second player.
 *
 * Renders nothing when nothing has ever started playing (`currentTrack()` is
 * undefined on a cold load), matching Stitch's assumption that a track is
 * already queued.
 */
export function MiniPlayer() {
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);

  if (!track) {
    return null;
  }

  const progressRatio = track.durationSec > 0 ? Math.min(1, progressSec / track.durationSec) : 0;

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } })}
      style={styles.wrap}
    >
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          <View style={styles.iconTile}>
            <Icon name="album" size={22} color={Colors.primary} />
          </View>
          <View style={styles.textBlock}>
            <ThemedText variant="label-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <View style={styles.metaRow}>
              <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1} style={styles.artistText}>
                {track.artistName}
              </ThemedText>
              {isPlaying && <EqualizerIndicator size={12} />}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon="skip-next"
            accessibilityLabel="Next track"
            onPress={(e) => {
              e.stopPropagation();
              next();
            }}
            size={40}
            style={styles.transparentButton}
          />
          <IconButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            size={40}
            style={styles.playButton}
          />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.margin,
    right: Spacing.margin,
    bottom: 0,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 28, 36, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.surface.l3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  artistText: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  transparentButton: {
    backgroundColor: 'transparent',
  },
  playButton: {
    backgroundColor: Colors.primary,
  },
});
