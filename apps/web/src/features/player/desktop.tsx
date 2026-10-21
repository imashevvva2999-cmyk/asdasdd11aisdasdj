// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { usePlayerStore } from '@mmusic/core/state/player-store';

import { useDuration } from './shared';

import './player-desktop.css';

/**
 * Desktop-only decorations of Now Playing (≥1024 px; hidden below, so the phone player is unchanged). Both are
 * decorative views of the shared player store: the real, keyboard-accessible scrubber stays the SeekBar range.
 */

function useRatio(): number {
  const progressSec = usePlayerStore((s) => s.progressSec);
  const duration = useDuration();
  return duration > 0 ? Math.min(1, Math.max(0, progressSec / duration)) : 0;
}

const RING_R = 47;
const RING_LEN = 2 * Math.PI * RING_R;

/** Circular progress around the round artwork: a dotted track, the coral played arc and its knob. */
export function ProgressRing() {
  const ratio = useRatio();
  const angle = ratio * 2 * Math.PI;
  return (
    <svg className="np-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="np-ring-track" cx="50" cy="50" r={RING_R} />
      <circle className="np-ring-fill" cx="50" cy="50" r={RING_R} strokeDasharray={`${(RING_LEN * ratio).toFixed(2)} ${RING_LEN.toFixed(2)}`} />
      <circle className="np-ring-knob" cx={50 + RING_R * Math.sin(angle)} cy={50 - RING_R * Math.cos(angle)} r="1.6" />
    </svg>
  );
}

const BARS = 72;
/** Stable bar heights per track (a decorative waveform, not analysed audio). */
function barHeights(seed: string): number[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.55 + h) * 0.6 + Math.sin(i * 1.7 + h / 7) * 0.4);
    return 0.18 + 0.82 * v;
  });
}

/** Waveform drawn behind the scrubber; bars left of the playhead are coral. */
export function Waveform({ trackId }: { trackId: string }) {
  const ratio = useRatio();
  const heights = barHeights(trackId);
  return (
    <div className="np-wave" aria-hidden="true">
      {heights.map((v, i) => (
        <span key={i} className={i / BARS < ratio ? 'on' : undefined} style={{ height: `${Math.round(v * 100)}%` }} />
      ))}
    </div>
  );
}
