import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getSharedAnalyser } from '@/audio/audio-analyser.web';
import { hasDemoAudio } from '@/audio/demo-audio';
import { toImageSource } from '@/constants/artwork-sources';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Radii } from '@/constants/theme';
import { paletteForTrack } from '@/lib/palette';
import { hexToRgb01, lerpRgb, type RGB } from '@/lib/particle-tint';
import { getTrackById, type TrackId } from '@/mocks';

import { APPROVED_DENSITY, APPROVED_SPEED, DEFAULT_TINT, ParticleWave, type ReactiveInput } from '@mmusic/ui-kit/visuals/particle-wave/engine';

export type ParticleWaveArtworkProps = {
  /** The approved still artwork: shown if WebGL is unavailable or cannot recover. */
  uri: LocalOrRemoteImage;
  /** Freeze on the current frame (Home is not in front). Time resumes where it stopped. */
  paused?: boolean;
  /** Drives the colour crossfade and gates audio-reactivity to this track's own audio. */
  trackId?: TrackId;
  /** Whether that track is actually playing right now (vs. loaded/paused). */
  playing?: boolean;
};

/**
 * Late Night Flow as a living particle wave (approved "Particle Wave B" at
 * 1.90×): WebGL in a canvas the size of the banner image. One engine per
 * mount; it pauses itself off screen, in a hidden tab and under Reduce Motion
 * (one still particle frame), and releases its GPU resources on unmount.
 * No React state changes per frame.
 */
export function ParticleWaveArtwork({ uri, paused = false, trackId, playing = false }: ParticleWaveArtworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<ParticleWave | null>(null);
  const [fallback, setFallback] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const trackIdRef = useRef(trackId);
  trackIdRef.current = trackId;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const tintRef = useRef<RGB>(trackId ? hexToRgb01(paletteForTrack(getTrackById(trackId)).accent) : DEFAULT_TINT);
  const lastReactiveMsRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getReactive = (): ReactiveInput => {
      const now = performance.now();
      const dt = lastReactiveMsRef.current === 0 ? 16 : Math.min(now - lastReactiveMsRef.current, 100);
      lastReactiveMsRef.current = now;

      const track = trackIdRef.current ? getTrackById(trackIdRef.current) : undefined;
      const targetHex = track ? paletteForTrack(track).accent : undefined;
      if (targetHex) tintRef.current = lerpRgb(tintRef.current, hexToRgb01(targetHex), dt);

      const active = playingRef.current && hasDemoAudio(trackIdRef.current);
      const analyser = getSharedAnalyser();
      const bands = analyser ? analyser.tick(now, active) : { bass: 0, mid: 0, high: 0 };
      return { tint: tintRef.current, ...bands };
    };
    const wave = new ParticleWave(canvas, { density: APPROVED_DENSITY, speed: APPROVED_SPEED, paused: pausedRef.current }, () => setFallback(true), getReactive);
    waveRef.current = wave;
    return () => {
      wave.destroy();
      waveRef.current = null;
    };
  }, []);

  useEffect(() => {
    waveRef.current?.set({ paused });
  }, [paused]);

  if (fallback) return <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
  return (
    <View style={[StyleSheet.absoluteFill, { borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg, overflow: 'hidden' }]} pointerEvents="none">
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg }}
      />
    </View>
  );
}
