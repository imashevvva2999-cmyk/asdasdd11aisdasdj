import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { WebGLSceneController } from './webgl-scene-controller';

export type SceneEngineCtor = new (canvas: HTMLCanvasElement, onFallback: () => void) => WebGLSceneController;

export type LivingMoodSceneProps = {
  /** The concrete scene class to mount (from Tasks 2-5). */
  engine: SceneEngineCtor;
  /** Only mounts a live WebGL context while true — the lazy-mount half of
   * "never run four expensive WebGL scenes simultaneously". */
  active: boolean;
  /** Shown instead of the canvas when WebGL is unavailable, fails, or a
   * lost context isn't restored in time — a plain gradient, no WebGL. */
  fallbackColors: [string, string];
  style?: ViewStyle;
};

/**
 * Mounts at most one Living Moods WebGL scene at a time. `active` controls
 * the canvas's existence, not just its visibility — an inactive card never
 * holds a live `WebGLSceneController` instance, so its GPU context doesn't
 * exist until the user actually hovers/opens it.
 */
export function LivingMoodScene({ engine: Engine, active, fallbackColors, style }: LivingMoodSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<WebGLSceneController | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFallback(false);
    const controller = new Engine(canvas, () => setFallback(true));
    controllerRef.current = controller;
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [active, Engine]);

  const showFallback = !active || fallback;
  return (
    <View style={[styles.container, style]}>
      {showFallback ? (
        <View
          style={[
            styles.fallback,
            // web-only CSS gradient, this file never runs on native (RN's
            // ViewStyle type doesn't model backgroundImage, hence the cast)
            { backgroundImage: `linear-gradient(145deg, ${fallbackColors[0]}, ${fallbackColors[1]})` } as unknown as ViewStyle,
          ]}
        />
      ) : (
        // raw DOM canvas on the web build only
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  fallback: { flex: 1 },
});
