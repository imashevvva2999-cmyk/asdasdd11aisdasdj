import { StyleSheet, View } from 'react-native';

import { CircleButton, IconButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

import { SeekBar } from './seek-bar';

/** Secondary text on the adaptive background (same as Now Playing). */
const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

/**
 * Persistent playback controls under Lyrics and Queue (W3 Этап 1,
 * iphone/lyrics.png): the same scrubber and ⏮ Play ⏭ as Now Playing, with
 * the same states and labels, so the music never stops being reachable.
 */
export function PlayerTransport() {
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const engineDurationSec = usePlayerStore((s) => s.durationSec);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const { t } = useAppStrings();

  if (!track) return null;

  // The engine's real duration once loaded; the catalog value until then.
  const durationSec = engineDurationSec ?? track.durationSec;
  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';

  return (
    <View style={styles.wrap}>
      <SeekBar
        progressSec={progressSec}
        durationSec={durationSec}
        disabled={unavailable}
        message={unavailable ? t('noAudioPreviewMessage') : failed ? t('playbackErrorMessage') : undefined}
        onSeek={seekTo}
        labelStyle={styles.onColorMedium}
      />
      <View style={styles.row}>
        <IconButton variant="ghost" icon="skip-previous" iconSize={32} size={48} accessibilityLabel={t('previousTrackLabel')} onPress={previous} />
        <CircleButton
          icon={isPlaying ? 'pause' : 'play-arrow'}
          accessibilityLabel={unavailable ? t('playUnavailableLabel') : playback === 'loading' ? t('loadingPauseLabel') : isPlaying ? t('pauseLabel') : t('playLabel')}
          size={60}
          iconSize={30}
          disabled={unavailable}
          loading={playback === 'loading'}
          onPress={togglePlayPause}
        />
        <IconButton variant="ghost" icon="skip-next" iconSize={32} size={48} accessibilityLabel={t('nextTrackLabel')} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginTop: Spacing.sm,
  },
  onColorMedium: {
    color: ON_COLOR_MEDIUM,
  },
});
