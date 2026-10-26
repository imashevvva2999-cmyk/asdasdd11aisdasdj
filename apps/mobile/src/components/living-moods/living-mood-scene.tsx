import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AppState, PixelRatio, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { PointerInput } from '@mmusic/ui-kit/visuals/living-moods/types';
import type { SceneRenderer, WebGLSceneController } from '@mmusic/ui-kit/visuals/living-moods/webgl-scene-controller';

/** A scene class: the website constructs it on a canvas; native runs its `Renderer` through expo-gl. */
export type SceneEngineCtor = (new (canvas: HTMLCanvasElement, onFallback: () => void) => WebGLSceneController) & {
  Renderer: new () => SceneRenderer;
};

export type LivingMoodSceneProps = {
  /** The concrete scene class to mount. */
  engine: SceneEngineCtor;
  /** Only holds a live GL context while true (the gradient is shown otherwise). */
  active: boolean;
  /** Shown instead of the scene when GL is unavailable or the scene fails — a plain gradient. */
  fallbackColors: [string, string];
  /** Freeze on the current frame (Home is not in front). Time resumes where it stopped. */
  paused?: boolean;
  style?: ViewStyle;
};

/** The website caps the canvas at 2× (WebGLSceneController.resize): the scenes'
 * card/expanded tuning is chosen from that pixel size, so native renders at
 * the same density and scales the view up on 3× screens. */
const RENDER_RATIO = Math.min(PixelRatio.get(), 2);
const UPSCALE = PixelRatio.get() / RENDER_RATIO;

/** The website's `WebGLSceneController` loop, driven by an expo-gl context instead of a canvas. */
class NativeSceneDriver {
  private paused = false;
  private reduceMotion = false;
  private appActive = AppState.currentState === 'active';
  private pointer: PointerInput = { x: 0.5, y: 0.5, active: false };
  private gl: ExpoWebGLRenderingContext | null = null;
  private width = 0;
  private height = 0;
  private raf = 0;
  private time = 0;
  private last = 0;

  constructor(private readonly renderer: SceneRenderer) {}

  /** False if the scene's shaders cannot run on this context. */
  attach(gl: ExpoWebGLRenderingContext): boolean {
    try {
      this.renderer.onInit(gl);
      this.gl = gl;
      // A new context: its program needs the size again.
      this.width = 0;
      this.height = 0;
      this.fitBuffer();
      this.schedule();
      return true;
    } catch (err) {
      console.warn('[LivingMoods native]', err);
      this.gl = null;
      return false;
    }
  }

  /** The GL view is gone (its context with it): stop drawing. */
  detach() {
    this.stop();
    this.gl = null;
  }

  update(paused: boolean, reduceMotion: boolean) {
    this.paused = paused;
    this.reduceMotion = reduceMotion;
    this.schedule();
  }

  setAppActive(active: boolean) {
    this.appActive = active;
    this.schedule();
  }

  setPointer(pointer: PointerInput) {
    this.pointer = pointer;
  }

  destroy() {
    this.stop();
    if (this.gl) this.renderer.onDispose(this.gl);
    this.gl = null;
  }

  /** One loop at most; never draws while the app is in the background (iOS forbids GL work there). */
  private schedule() {
    this.stop();
    const gl = this.gl;
    if (!gl || !this.appActive) return;
    if (this.reduceMotion || this.paused) {
      // As on the website: one frame with dt = 0 (the scenes compose a still layout).
      this.draw(gl, 0);
      return;
    }
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const dt = this.last === 0 ? 16 : Math.min(now - this.last, 100);
    this.last = now;
    this.time += dt / 1000;
    if (this.gl) this.draw(this.gl, dt / 1000);
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(gl: ExpoWebGLRenderingContext, dt: number) {
    this.fitBuffer();
    this.renderer.onFrame(gl, dt, this.time, this.pointer);
    gl.endFrameEXP();
  }

  /** Viewport + `onResize` whenever the drawing buffer's size changes, as the website's `resize()`. */
  private fitBuffer() {
    const gl = this.gl;
    if (!gl) return;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    gl.viewport(0, 0, width, height);
    this.renderer.onResize(gl, width, height);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

/**
 * A Living Moods scene on iOS/Android: the same renderer the website runs,
 * in an expo-gl view. Touch-drag is the pointer (as on the website, where it
 * is the Pointer Events API); paused off Home, in the background and under
 * Reduce Motion (one still frame). Falls back to the gradient if the scene
 * cannot run.
 */
export function LivingMoodScene({ engine, active, fallbackColors, paused = false, style }: LivingMoodSceneProps) {
  const reduceMotion = useReducedMotion();
  const [fallback, setFallback] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [driver] = useState(() => new NativeSceneDriver(new engine.Renderer()));
  const showScene = active && !fallback && size !== null;

  useEffect(() => {
    driver.update(paused, reduceMotion);
  }, [driver, paused, reduceMotion]);

  useEffect(() => {
    if (!showScene) driver.detach();
  }, [driver, showScene]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => driver.setAppActive(state === 'active'));
    return () => subscription.remove();
  }, [driver]);

  useEffect(() => () => driver.destroy(), [driver]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const track = (e: GestureResponderEvent) => {
    if (!size || size.width === 0 || size.height === 0) return;
    driver.setPointer({ x: e.nativeEvent.locationX / size.width, y: e.nativeEvent.locationY / size.height, active: true });
  };
  const release = () => driver.setPointer({ x: 0.5, y: 0.5, active: false });

  return (
    <View
      style={[styles.container, style]}
      onLayout={onLayout}
      // Raw touch events, not the responder system: presses and scrolling stay with the card.
      onTouchStart={track}
      onTouchMove={track}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      {showScene && size ? (
        <GLView
          pointerEvents="none"
          msaaSamples={0}
          style={{
            position: 'absolute',
            width: size.width / UPSCALE,
            height: size.height / UPSCALE,
            left: (size.width - size.width / UPSCALE) / 2,
            top: (size.height - size.height / UPSCALE) / 2,
            transform: [{ scale: UPSCALE }],
          }}
          onContextCreate={(gl) => {
            if (!driver.attach(gl)) setFallback(true);
          }}
        />
      ) : (
        <LinearGradient colors={fallbackColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
