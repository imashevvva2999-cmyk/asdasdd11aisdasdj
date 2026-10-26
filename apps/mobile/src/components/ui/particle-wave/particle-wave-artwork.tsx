import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AppState, PixelRatio, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { getSharedAnalyser } from '@/audio/audio-analyser';
import { hasDemoAudio } from '@/audio/demo-audio';
import { retainAudioSampling } from '@/audio/expo-audio-engine';
import { toImageSource } from '@/constants/artwork-sources';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Radii } from '@/constants/theme';
import { paletteForTrack } from '@/lib/palette';
import { hexToRgb01, lerpRgb, type RGB } from '@/lib/particle-tint';
import { getTrackById, type TrackId } from '@/mocks';

import {
  APPROVED_DENSITY,
  APPROVED_SPEED,
  DEFAULT_TINT,
  INITIAL_QUALITY,
  nextQuality,
  ParticleWaveRenderer,
  RIBBON_SPAN,
  type Quality,
  type ReactiveInput,
  type WaveFrame,
} from '@mmusic/ui-kit/visuals/particle-wave/engine';

export type ParticleWaveArtworkProps = {
  /** The approved still artwork: shown until the first frame, and if GL is unavailable. */
  uri: LocalOrRemoteImage;
  /** Freeze on the current frame (Home is not in front). Time resumes where it stopped. */
  paused?: boolean;
  /** Drives the colour crossfade and gates audio-reactivity to this track's own audio. */
  trackId?: TrackId;
  /** Whether that track is actually playing right now (vs. loaded/paused). */
  playing?: boolean;
  /** Ribbons' width and centre in layout points; without it the artwork is shown with `cover` (the banner). */
  frame?: LayoutFrame;
};

type LayoutFrame = { span: number; cx: number; cy: number };

type WaveInput = { paused: boolean; reduceMotion: boolean; trackId: TrackId | undefined; playing: boolean; frame: LayoutFrame | undefined };

/** The web `ParticleWave`'s loop, driven by an expo-gl context instead of a canvas. */
class NativeParticleWave {
  private input: WaveInput;
  private appActive = AppState.currentState === 'active';
  /** The view's width in points, to convert `input.frame` to drawing-buffer px. */
  private layoutWidth = 0;
  private gl: ExpoWebGLRenderingContext | null = null;
  private renderer: ParticleWaveRenderer | null = null;
  private raf = 0;
  private time = 0;
  private last = 0;
  private quality: Quality = INITIAL_QUALITY;
  private tint: RGB;
  private lastReactiveMs = 0;
  private reactive: ReactiveInput = { tint: DEFAULT_TINT, bass: 0, mid: 0, high: 0 };

  constructor(input: WaveInput) {
    this.input = input;
    this.tint = input.trackId ? hexToRgb01(paletteForTrack(getTrackById(input.trackId)).accent) : DEFAULT_TINT;
  }

  /** New props: redraws at once (also when paused or under Reduce Motion). */
  update(input: WaveInput) {
    this.input = input;
    this.schedule();
  }

  setAppActive(active: boolean) {
    this.appActive = active;
    this.schedule();
  }

  setLayoutWidth(width: number) {
    this.layoutWidth = width;
  }

  /** Same as the web: tint eases toward the track's accent; bands only while its own audio plays. */
  private nextReactive(now: number): ReactiveInput {
    const dt = this.lastReactiveMs === 0 ? 16 : Math.min(now - this.lastReactiveMs, 100);
    this.lastReactiveMs = now;
    const { trackId, playing } = this.input;
    const track = trackId ? getTrackById(trackId) : undefined;
    const targetHex = track ? paletteForTrack(track).accent : undefined;
    if (targetHex) this.tint = lerpRgb(this.tint, hexToRgb01(targetHex), dt);
    const active = playing && hasDemoAudio(trackId);
    const bands = getSharedAnalyser()?.tick(now, active) ?? { bass: 0, mid: 0, high: 0 };
    return { tint: this.tint, ...bands };
  }

  /** False if the approved shaders cannot run on this context. */
  attach(gl: ExpoWebGLRenderingContext): boolean {
    try {
      this.renderer = new ParticleWaveRenderer(gl as unknown as WebGLRenderingContext);
      this.gl = gl;
      this.renderer.upload(Math.min(APPROVED_DENSITY, this.quality.density));
      this.schedule();
      return true;
    } catch (err) {
      console.warn('[ParticleWave native]', err);
      this.renderer = null;
      this.gl = null;
      return false;
    }
  }

  /** One loop at most; never draws while the app is in the background (iOS forbids GL work there). */
  schedule() {
    this.stop();
    if (!this.renderer || !this.appActive) return;
    const { reduceMotion, paused } = this.input;
    if (!reduceMotion && !paused) {
      // Time resumes where it stopped: no jump after a pause.
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.render(reduceMotion);
    }
  }

  destroy() {
    this.stop();
    this.renderer?.dispose();
    this.renderer = null;
    this.gl = null;
  }

  private render(still: boolean) {
    const gl = this.gl;
    if (!gl || !this.renderer) return;
    this.renderer.draw(gl.drawingBufferWidth, gl.drawingBufferHeight, this.time, still, this.reactive, this.bufferFrame(gl));
    gl.endFrameEXP();
  }

  private bufferFrame(gl: ExpoWebGLRenderingContext): WaveFrame | undefined {
    const f = this.input.frame;
    if (!f) return undefined;
    const ratio = this.layoutWidth > 0 ? gl.drawingBufferWidth / this.layoutWidth : PixelRatio.get();
    return { scale: (f.span * ratio) / RIBBON_SPAN, cx: f.cx * ratio, cy: f.cy * ratio };
  }

  private frame = () => {
    const now = performance.now();
    const ms = now - this.last;
    this.last = now;
    // Capped so a stalled frame never jumps the shape.
    this.time += (Math.min(ms, 50) / 1000) * APPROVED_SPEED;
    this.reactive = this.nextReactive(now);
    this.render(false);
    // Native draws at the screen's own pixel ratio, so only the density steps of
    // the shared adaptive quality apply here.
    const before = this.quality;
    this.quality = nextQuality(before, ms);
    if (this.quality.density !== before.density) this.renderer?.upload(Math.min(APPROVED_DENSITY, this.quality.density));
    this.raf = requestAnimationFrame(this.frame);
  };

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

/**
 * Late Night Flow as a living particle wave (approved "Particle Wave B" at
 * 1.90×) on iOS/Android: the shared engine's renderer in an expo-gl view, over
 * the still artwork. Pauses with `paused`, in the background and under Reduce
 * Motion (one still particle frame). Audio-reactive through expo-audio samples
 * where the platform supports them; otherwise it keeps moving without reacting.
 */
export function ParticleWaveArtwork({ uri, paused = false, trackId, playing = false, frame }: ParticleWaveArtworkProps) {
  const reduceMotion = useReducedMotion();
  const [fallback, setFallback] = useState(false);
  // One engine per mount, created once (the GL context arrives later, in onContextCreate).
  const [wave] = useState(() => new NativeParticleWave({ paused, reduceMotion, trackId, playing, frame }));

  useEffect(() => {
    wave.update({ paused, reduceMotion, trackId, playing, frame });
  }, [wave, paused, reduceMotion, trackId, playing, frame]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => wave.setAppActive(state === 'active'));
    return () => subscription.remove();
  }, [wave]);

  useEffect(() => retainAudioSampling(), []);

  useEffect(() => () => wave.destroy(), [wave]);

  const still = <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
  if (fallback) return still;
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      pointerEvents="none"
      onLayout={(e) => wave.setLayoutWidth(e.nativeEvent.layout.width)}
    >
      {still}
      <GLView
        style={StyleSheet.absoluteFill}
        msaaSamples={0}
        onContextCreate={(gl) => {
          if (!wave.attach(gl)) setFallback(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg, overflow: 'hidden' },
});
