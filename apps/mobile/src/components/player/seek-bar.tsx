import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useSmoothProgress } from '@/hooks/use-smooth-progress';
import { scrubRatio } from '@/lib/gesture-math';
import { useAppStrings } from '@/state/locale-store';

/** Accessibility increment/decrement step. */
const A11Y_STEP_SEC = 10;
const SCRUB_THUMB_SCALE = 1.35;

type SeekBarProps = {
  progressSec: number;
  durationSec: number;
  /** No audio to seek (unavailable preview): no thumb, no gestures. */
  disabled: boolean;
  /** Replaces the time row (unavailable / error), same height. */
  message?: string;
  onSeek: (sec: number) => void;
  /** Colour of the time labels and message on the adaptive background. */
  labelStyle?: TextStyle;
};

/**
 * Now Playing scrubber (Dynamic Premium, plan §3 Step 4): drag the bar to
 * scrub with a live preview of the position and time — the audio seeks once,
 * on release — or tap anywhere to jump. The pan only claims horizontal
 * movement, so a vertical pull on the player is never captured here.
 */
export function SeekBar({ progressSec, durationSec, disabled, message, onSeek, labelStyle }: SeekBarProps) {
  const reduceMotion = useReducedMotion();
  const ratio = durationSec > 0 ? Math.min(1, progressSec / durationSec) : 0;
  const progress = useSmoothProgress(ratio);
  const { t } = useAppStrings();

  const width = useSharedValue(0);
  const duration = useSharedValue(durationSec);
  const scrubbing = useSharedValue(false);
  const scrubValue = useSharedValue(0);
  const lastPreviewSec = useSharedValue(-1);
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  useEffect(() => {
    duration.value = durationSec;
  }, [durationSec, duration]);

  // Seek, then show the new position right away so the thumb never flashes back.
  const finish = useCallback(
    (value: number) => {
      onSeek(Math.round(value * duration.value));
      progress.value = value;
      scrubbing.value = false;
      setPreviewSec(null);
    },
    [onSeek, duration, progress, scrubbing],
  );

  const gesture = useMemo(() => {
    const preview = (value: number) => {
      'worklet';
      const sec = Math.floor(value * duration.value);
      if (sec !== lastPreviewSec.value) {
        lastPreviewSec.value = sec;
        scheduleOnRN(setPreviewSec, sec);
      }
    };
    const pan = Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-4, 4])
      .failOffsetY([-12, 12])
      .onStart((e) => {
        scrubbing.value = true;
        scrubValue.value = scrubRatio(e.x, width.value);
        lastPreviewSec.value = -1;
        preview(scrubValue.value);
      })
      .onUpdate((e) => {
        scrubValue.value = scrubRatio(e.x, width.value);
        preview(scrubValue.value);
      })
      .onEnd(() => {
        scheduleOnRN(finish, scrubValue.value);
      })
      .onFinalize((_, success) => {
        // Cancelled (e.g. the system took the touch): drop the preview, no seek.
        if (!success && scrubbing.value) {
          scrubbing.value = false;
          scheduleOnRN(setPreviewSec, null);
        }
      });
    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((e) => {
        scheduleOnRN(finish, scrubRatio(e.x, width.value));
      });
    return Gesture.Exclusive(pan, tap);
  }, [disabled, finish, duration, lastPreviewSec, scrubValue, scrubbing, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(scrubbing.value ? scrubValue.value : progress.value) * 100}%`,
  }));
  const thumbStyle = useAnimatedStyle(() => {
    const scale = scrubbing.value ? SCRUB_THUMB_SCALE : 1;
    return {
      left: `${(scrubbing.value ? scrubValue.value : progress.value) * 100}%`,
      transform: [{ scale: reduceMotion ? scale : withTiming(scale, { duration: 120 }) }],
    };
  });

  const shownSec = previewSec ?? progressSec;
  const remainingSec = Math.max(0, durationSec - shownSec);

  return (
    <View style={styles.block}>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('seekLabel')}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (disabled) return;
            const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP_SEC : -A11Y_STEP_SEC;
            onSeek(progressSec + delta);
          }}
          aria-valuemin={0}
          aria-valuemax={Math.round(durationSec)}
          aria-valuenow={Math.floor(progressSec)}
          aria-valuetext={`${formatTime(progressSec)} ${t('ofConnectorWord')} ${formatTime(durationSec)}`}
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
          }}
          style={styles.hitArea}
          testID="seek-bar"
        >
          <View pointerEvents="none" style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          {!disabled && <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />}
        </View>
      </GestureDetector>
      {/* Same row height in every state, so nothing shifts. */}
      <View style={styles.timeRow}>
        {message ? (
          <ThemedText variant="body-sm" style={labelStyle} accessibilityRole="alert">
            {message}
          </ThemedText>
        ) : (
          <>
            <ThemedText variant="mono-num" style={labelStyle} testID="seek-elapsed">
              {formatTime(shownSec)}
            </ThemedText>
            <ThemedText variant="mono-num" style={labelStyle}>
              -{formatTime(remainingSec)}
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  hitArea: {
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: Radii.full,
    backgroundColor: Colors.text.high,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.3,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.text.high,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 20,
  },
});
