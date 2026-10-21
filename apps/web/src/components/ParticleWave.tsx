// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect, useRef, useState } from 'react';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { paletteForTrack } from '@mmusic/core/lib/palette';
import { hexToRgb01, lerpRgb, type RGB } from '@mmusic/core/lib/particle-tint';
import { getTrackById } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { APPROVED_DENSITY, APPROVED_SPEED, DEFAULT_TINT, ParticleWave as ParticleWaveEngine, type ReactiveInput } from '@mmusic/ui-kit/visuals/particle-wave/engine';

import { audioUrlForTrack } from '@/assets/audio-assets';
import { getWebAnalyser } from '@/audio/web-analyser';

import { Artwork } from './Artwork';

/**
 * The approved MMusic Stars particle wave ("Particle Wave B" at 1.90×) — the website version of the app's
 * components/ui/particle-wave/particle-wave-artwork.web.tsx around the same ui-kit engine. The engine pauses itself
 * off screen, in a hidden tab and under Reduce Motion, and frees its GPU context on unmount; without WebGL the still
 * cover is shown instead. The tint follows the current track's palette; bass / mid / high come from the website's
 * non-routing analyser (src/audio/web-analyser.ts) while the current track is actually playing, and rest at zero
 * where frequency analysis is unavailable (Safari, Firefox) — the same wave, just without the beat.
 */
export function ParticleWave({ cover, trackId, className }: { cover: LocalOrRemoteImage | undefined; trackId?: string; className?: string }) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const trackIdRef = useRef(trackId);
  useEffect(() => {
    trackIdRef.current = trackId;
  }, [trackId]);
  const tintRef = useRef<RGB>(trackId ? hexToRgb01(paletteForTrack(getTrackById(trackId)).accent) : DEFAULT_TINT);
  const lastMsRef = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // A fresh canvas per mount: destroy() releases the canvas's WebGL context for good, so a remount (React StrictMode
    // in development, or returning to Home) must never reuse a canvas whose context was already lost.
    const canvas = document.createElement('canvas');
    host.append(canvas);
    const getReactive = (): ReactiveInput => {
      const now = performance.now();
      const dt = lastMsRef.current === 0 ? 16 : Math.min(now - lastMsRef.current, 100);
      lastMsRef.current = now;
      const track = trackIdRef.current ? getTrackById(trackIdRef.current) : undefined;
      if (track) tintRef.current = lerpRgb(tintRef.current, hexToRgb01(paletteForTrack(track).accent), dt);
      const player = usePlayerStore.getState();
      const playingId = player.currentTrackId();
      const active = player.isPlaying && !!playingId && audioUrlForTrack(playingId) !== undefined;
      const analyser = getWebAnalyser();
      const bands = analyser ? analyser.tick(now, active) : { bass: 0, mid: 0, high: 0 };
      return { tint: tintRef.current, ...bands };
    };
    const wave = new ParticleWaveEngine(canvas, { density: APPROVED_DENSITY, speed: APPROVED_SPEED, paused: false }, () => setFallback(true), getReactive);
    return () => {
      wave.destroy();
      canvas.remove();
    };
  }, []);

  if (fallback) return <Artwork source={cover} className={className} loading="eager" />;
  return <span ref={hostRef} className={className ? `particle-wave ${className}` : 'particle-wave'} aria-hidden="true" />;
}
