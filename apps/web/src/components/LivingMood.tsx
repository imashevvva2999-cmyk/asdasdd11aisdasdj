import { useEffect, useRef, useState } from 'react';

import type { WebGLSceneController } from '@mmusic/ui-kit/visuals/living-moods/webgl-scene-controller';

export type SceneEngineCtor = new (canvas: HTMLCanvasElement, onFallback: () => void) => WebGLSceneController;

/**
 * One Living Moods WebGL scene behind a Mood & Vibes card — the website version of the app's
 * components/living-moods/living-mood-scene.web.tsx around the same ui-kit scene classes. The GPU context exists only
 * while the card is on screen (IntersectionObserver) and under normal motion; otherwise, or when WebGL fails, the
 * card keeps its approved gradient (`fallbackColors`).
 */
export function LivingMood({ engine: Engine, fallbackColors }: { engine: SceneEngineCtor; fallbackColors: [string, string] }) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [fallback, setFallback] = useState(false);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: '120px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const live = visible && !reduceMotion && !fallback;
  useEffect(() => {
    const host = hostRef.current;
    if (!live || !host) return;
    // A fresh canvas per mount, so a remount (StrictMode, scrolling back) never reuses a canvas whose context was lost.
    const canvas = document.createElement('canvas');
    host.append(canvas);
    const controller = new Engine(canvas, () => setFallback(true));
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      controller.destroy();
      canvas.remove();
    };
  }, [live, Engine]);

  return (
    <span ref={hostRef} className="living-mood" aria-hidden="true" style={{ background: `linear-gradient(145deg, ${fallbackColors[0]}, ${fallbackColors[1]})` }} />
  );
}
