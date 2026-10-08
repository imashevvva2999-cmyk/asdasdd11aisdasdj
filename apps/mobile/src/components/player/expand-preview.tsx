import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/ui';
import { Radii } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { usePlayerStore } from '@/state/player-store';
import {
  EXPAND_ART_SCALE_FROM,
  PLAYER_ARTWORK_TOP_GAP,
  PLAYER_HEADER_HEIGHT,
  expandPreview,
  expandProgress,
  playerArtworkSize,
} from '@/state/player-surface';

import { PlayerBackground } from './player-background';

const PAUSED_SCALE = 0.92;
export const SHEET_TOP_RADIUS = 24;

/**
 * In-place expand layer (plan §4.2 п. 7, Step 0 finding §12.2): while a finger
 * drags the mini-player up, this light copy of the full player — palette
 * background and cover in Now Playing's exact place — follows it. The real
 * route opens only on commit and draws the same picture at the same
 * `expandProgress`, then hides this layer, so the hand-off is invisible and
 * no navigation work happens during the drag. Mounted once, above the stack.
 */
export function PlayerExpandPreview() {
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { height } = useWindowSize();
  const contentWidth = useContentWidth();
  const insets = useSafeAreaInsets();
  const size = playerArtworkSize(contentWidth, height);
  const pausedScale = isPlaying ? 1 : PAUSED_SCALE;

  const sheetStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    return {
      opacity: expandPreview.value ? 1 : 0,
      transform: [{ translateY: expandPreview.value ? (1 - p) * height : height * 2 }],
      borderTopLeftRadius: SHEET_TOP_RADIUS * (1 - p),
      borderTopRightRadius: SHEET_TOP_RADIUS * (1 - p),
    };
  });
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(expandProgress.value, [0, 1], [EXPAND_ART_SCALE_FROM, 1]) * pausedScale }],
  }));

  if (!track) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sheet, sheetStyle]} testID="player-expand-preview">
      <PlayerBackground />
      <Animated.View
        style={[
          styles.art,
          { top: insets.top + PLAYER_HEADER_HEIGHT + PLAYER_ARTWORK_TOP_GAP, left: (contentWidth - size) / 2, width: size, height: size },
          artStyle,
        ]}
      >
        <Artwork uri={track.coverUri} size={size} radius={Radii.lg} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
});
