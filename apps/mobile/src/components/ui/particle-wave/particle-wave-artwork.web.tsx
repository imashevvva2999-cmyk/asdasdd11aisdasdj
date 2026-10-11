import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getSharedAnalyser } from '@/audio/audio-analyser.web';
import { hasDemoAudio } from '@/audio/demo-audio';
import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { Radii } from '@/constants/theme';
import { paletteForTrack } from '@/lib/palette';
import { hexToRgb01, lerpRgb, type RGB } from '@/lib/particle-tint';
import { getTrackById, type TrackId } from '@/mocks';

import { APPROVED_DENSITY, APPROVED_SPEED, DEFAULT_TINT, INITIAL_QUALITY, ParticleWave, type ReactiveInput, type WaveDiagnostics } from './engine';

/**
 * TEMPORARY, development-only diagnostics (investigation only — never
 * shown in the approved experience). Active only when the page URL has
 * `?waveDebug=1`, e.g. http://localhost:PORT/home?waveDebug=1 — the
 * default, approved render path is completely unaffected either way.
 * Remove `isWaveDebugEnabled`, the diagnostics state/overlay below, and
 * the `onDiagnostics` wiring once the investigation is resolved.
 */
function isWaveDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('waveDebug');
}

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

  // TEMPORARY diagnostics-only state (see engine.ts's WaveDiagnostics doc comment).
  const [debugEnabled] = useState(isWaveDebugEnabled);
  const [diagnostics, setDiagnostics] = useState<WaveDiagnostics | null>(null);
  const [forcedMax, setForcedMax] = useState(false);

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
    const wave = new ParticleWave(
      canvas,
      { density: APPROVED_DENSITY, speed: APPROVED_SPEED, paused: pausedRef.current },
      () => setFallback(true),
      getReactive,
      debugEnabled ? setDiagnostics : undefined,
    );
    waveRef.current = wave;
    return () => {
      wave.destroy();
      waveRef.current = null;
    };
  }, [debugEnabled]);

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
      {debugEnabled && <DiagnosticsOverlay diagnostics={diagnostics} forcedMax={forcedMax} onToggleForcedMax={() => {
        const next = !forcedMax;
        setForcedMax(next);
        waveRef.current?.setForcedQuality(next ? INITIAL_QUALITY : null);
      }} />}
    </View>
  );
}

/** TEMPORARY, development-only (?waveDebug=1) — see the doc comment at the
 * top of this file. Overrides the wave canvas's pointerEvents="none" for
 * itself only (standard CSS pointer-events behavior) so its toggle button
 * is tappable; never rendered unless debugEnabled. */
function DiagnosticsOverlay({
  diagnostics,
  forcedMax,
  onToggleForcedMax,
}: {
  diagnostics: WaveDiagnostics | null;
  forcedMax: boolean;
  onToggleForcedMax: () => void;
}) {
  return (
    <View style={diagStyles.panel} pointerEvents="auto">
      <Text style={diagStyles.text}>
        {diagnostics
          ? [
              `DPR ${diagnostics.dpr} / cap ${diagnostics.dprCap}${diagnostics.forced ? ' (forced)' : ''}`,
              `density ${diagnostics.qualityDensity.toFixed(2)} (applied ${diagnostics.appliedDensity.toFixed(2)})`,
              `${diagnostics.avgFrameMs.toFixed(1)}ms avg / ${diagnostics.fps.toFixed(0)} fps`,
              `degraded: ${diagnostics.degraded ? 'YES' : 'no'}`,
            ].join('\n')
          : 'waiting for first sample…'}
      </Text>
      <Text accessibilityRole="button" onPress={onToggleForcedMax} style={diagStyles.button}>
        {forcedMax ? 'Release forced max quality' : 'Force max quality (2× dpr, 1.0 density)'}
      </Text>
    </View>
  );
}

const diagStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    maxWidth: 260,
  },
  text: {
    color: '#9dffb0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
  button: {
    color: '#ff8a65',
    fontFamily: 'monospace',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
