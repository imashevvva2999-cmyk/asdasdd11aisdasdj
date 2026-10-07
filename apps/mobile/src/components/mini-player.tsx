import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/state/player-store';

import { Artwork } from './ui/artwork';
import { ThemedText } from './themed-text';
import { EqualizerIndicator } from './ui/equalizer';
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
          <Artwork uri={track.coverUri} size={44} radius={Radii.DEFAULT} style={styles.iconTile} />
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
            variant="ghost"
            icon="skip-next"
            iconSize={26}
            accessibilityLabel="Next track"
            onPress={(e) => {
              e.stopPropagation();
              next();
            }}
            size={44}
          />
          <IconButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            size={44}
            iconSize={24}
            style={styles.playButton}
          />
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * The same mini-player for full screens outside the tab navigator (Artist,
 * Album, Playlist — Stitch shows it there too), pinned above the bottom safe
 * area instead of above the tab bar. Pair with `MINI_PLAYER_OVERLAY_CLEARANCE`
 * bottom padding on the screen's scroll content.
 */
export function MiniPlayerOverlay() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlaySlot, { bottom: insets.bottom + Spacing.sm }]} pointerEvents="box-none">
      <MiniPlayer />
    </View>
  );
}

/** Scroll padding that keeps content clear of `MiniPlayerOverlay`. */
export const MINI_PLAYER_OVERLAY_CLEARANCE = 96;

const styles = StyleSheet.create({
  overlaySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  wrap: {
    position: 'absolute',
    left: Spacing.margin,
    right: Spacing.margin,
    bottom: 0,
    borderRadius: Radii.md,
    overflow: 'hidden',
    // Near-opaque so content scrolling underneath doesn't read through (no
    // cross-platform backdrop blur is available here).
    backgroundColor: 'rgba(24, 24, 30, 0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  iconTile: {
    width: 44,
    height: 44,
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
  playButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.35,
    elevation: 6,
  },
});
