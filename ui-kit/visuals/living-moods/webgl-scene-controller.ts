import type { PointerInput } from './types';

/** If a lost WebGL context is not restored within this time, fall back. */
const RESTORE_TIMEOUT_MS = 2500;

/**
 * The platform-neutral part of a Living Moods scene: its shader, program and
 * draw call. The web `WebGLSceneController` below drives one from a canvas;
 * the native app drives the same renderer from an expo-gl context.
 */
export interface SceneRenderer {
  /** Build shaders/program/buffers here. Throw to trigger the fallback. */
  onInit(gl: WebGL2RenderingContext): void;
  /** Called whenever the drawing-buffer size changes (after the viewport is set). */
  onResize(gl: WebGL2RenderingContext, width: number, height: number): void;
  /** Called once per scheduled frame (or once with dt=0 when paused/reduced-motion/offscreen). */
  onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void;
  /** Delete every buffer/texture/program this scene created. */
  onDispose(gl: WebGL2RenderingContext): void;
}

/**
 * Shared lifecycle for every Living Moods scene — context creation, resize/
 * DPR, context-loss/restore with a fallback timeout, `prefers-reduced-motion`
 * gating, on-screen/page-visibility gating, pointer+touch tracking (via the
 * Pointer Events API, which fires for both), and a `destroy()` cleanup
 * checklist. This generalizes the exact pattern already proven in
 * `particle-wave/engine.ts` so each concrete scene only implements its own
 * shader/program/draw call, as the `SceneRenderer` it passes in.
 */
export abstract class WebGLSceneController {
  protected gl: WebGL2RenderingContext | null = null;
  private raf = 0;
  private time = 0;
  private last = 0;
  private onScreen = true;
  private pageVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private reduceMotion = this.motionQuery.matches;
  private observer: IntersectionObserver | null = null;
  private restoreTimer = 0;
  private destroyed = false;
  private pointer: PointerInput = { x: 0.5, y: 0.5, active: false };

  constructor(
    protected readonly canvas: HTMLCanvasElement,
    private readonly onFallback: () => void,
    private readonly renderer: SceneRenderer,
  ) {
    canvas.addEventListener('webglcontextlost', this.lost);
    canvas.addEventListener('webglcontextrestored', this.restored);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    document.addEventListener('visibilitychange', this.visibility);
    this.motionQuery.addEventListener?.('change', this.motionChange);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(([entry]) => {
        this.onScreen = !!entry?.isIntersecting;
        this.schedule();
      });
      this.observer.observe(canvas);
    }
    if (!this.init()) onFallback();
    else {
      this.resize();
      this.schedule();
    }
  }

  /** Whether the render loop is currently scheduled (for checks/debugging). */
  get running(): boolean {
    return this.raf !== 0;
  }

  resize() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
      this.renderer.onResize(gl, width, height);
    }
  }

  /** Stops the loop, removes every listener, releases the GPU resources. */
  destroy() {
    this.destroyed = true;
    this.stop();
    clearTimeout(this.restoreTimer);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.motionQuery.removeEventListener?.('change', this.motionChange);
    this.canvas.removeEventListener('webglcontextlost', this.lost);
    this.canvas.removeEventListener('webglcontextrestored', this.restored);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerleave', this.pointerLeave);
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      this.renderer.onDispose(gl);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return false;
    try {
      this.gl = gl;
      this.renderer.onInit(gl);
      return true;
    } catch (err) {
      console.warn('[LivingMoods]', err);
      this.gl = null;
      return false;
    }
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private schedule() {
    this.stop();
    if (this.destroyed || !this.gl) return;
    if (this.reduceMotion || !this.onScreen || !this.pageVisible) {
      this.renderer.onFrame(this.gl, 0, this.time, this.pointer);
      return;
    }
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const dt = this.last === 0 ? 16 : Math.min(now - this.last, 100);
    this.last = now;
    this.time += dt / 1000;
    if (this.gl) this.renderer.onFrame(this.gl, dt / 1000, this.time, this.pointer);
    this.raf = requestAnimationFrame(this.loop);
  };

  private lost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.restoreTimer = window.setTimeout(() => {
      if (!this.gl || this.gl.isContextLost()) this.onFallback();
    }, RESTORE_TIMEOUT_MS);
  };

  private restored = () => {
    clearTimeout(this.restoreTimer);
    if (!this.init()) this.onFallback();
    else {
      this.resize();
      this.schedule();
    }
  };

  private visibility = () => {
    this.pageVisible = document.visibilityState !== 'hidden';
    this.schedule();
  };

  private motionChange = () => {
    this.reduceMotion = this.motionQuery.matches;
    this.schedule();
  };

  private pointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, active: true };
  };

  private pointerLeave = () => {
    this.pointer = { ...this.pointer, active: false };
  };
}
