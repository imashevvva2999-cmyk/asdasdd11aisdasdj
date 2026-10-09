import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';

import { APPROVED_DENSITY, APPROVED_SPEED, ParticleWave } from './engine';

export type ParticleWaveArtworkProps = {
  /** The approved still artwork: shown if WebGL is unavailable or cannot recover. */
  uri: LocalOrRemoteImage;
  /** Freeze on the current frame (Home is not in front). Time resumes where it stopped. */
  paused?: boolean;
};

/**
 * Late Night Flow as a living particle wave (approved "Particle Wave B" at
 * 1.90×): WebGL in a canvas the size of the banner image. One engine per
 * mount; it pauses itself off screen, in a hidden tab and under Reduce Motion
 * (one still particle frame), and releases its GPU resources on unmount.
 * No React state changes per frame.
 */
export function ParticleWaveArtwork({ uri, paused = false }: ParticleWaveArtworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<ParticleWave | null>(null);
  const [fallback, setFallback] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wave = new ParticleWave(canvas, { density: APPROVED_DENSITY, speed: APPROVED_SPEED, paused: pausedRef.current }, () => setFallback(true));
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
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </View>
  );
}
