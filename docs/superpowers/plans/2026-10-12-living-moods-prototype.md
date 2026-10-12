# Mood & Vibes — Living Moods Prototype Implementation Plan

> **STATUS: PAUSED (2026-10-12).** The user reviewed all four completed, working scenes at `/dev-living-moods` and was not satisfied with the visual result. Not approved for integration into production Mood & Vibes. Explicitly preserved as-is (code, all 9 commits, this plan, and the SDD ledger at `.superpowers/sdd/2026-10-12-living-moods-prototype/`) for a possible future redesign — nothing was deleted, reverted, reset, or modified as part of this pause. Do not resume without the user's explicit instruction.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a completely isolated, dev-only prototype route showing four distinct, cinematic WebGL animation experiences (Liquid Chrome, Meta Balls, Orb, Galaxy) as an interactive "Mood & Vibes — Living Moods" card grid, for the user's visual approval only. Nothing in the approved production app changes.

**Architecture:** A new, self-contained directory (`apps/mobile/src/components/living-moods/`) holds a shared `WebGLSceneController` abstract base class — a generalization of the exact lifecycle pattern already proven in `apps/mobile/src/components/ui/particle-wave/engine.ts` (raw WebGL, no helper library; context-loss/restore with a fallback timeout; `prefers-reduced-motion` gating via `matchMedia`; on-screen/page-visibility gating via `IntersectionObserver` + `visibilitychange`; a `destroy()` cleanup checklist) — plus shared `compile`/`program` GLSL helpers. Four concrete scene engines subclass it, each adapting (not copying) a reference implementation from reactbits.dev's open-source `backgrounds`/`animations` collection toward Mmusic's own dark-canvas + coral-accent palette and a dual card/expanded composition. A shared `<LivingMoodScene>` wrapper (web + native-fallback split, mirroring the exact `.web.tsx`/`.tsx` convention `particle-wave-artwork` already uses) lazy-mounts at most one scene's WebGL context at a time. A new route `apps/mobile/src/app/dev-living-moods.tsx` — a plain Expo Router file needing no `_layout.tsx` registration, exactly like the existing `dev-ui-kit.tsx` — hosts the four-card grid and expand/collapse UX, and is added to the same dev-only-page exclusion mechanism `dev-ui-kit.tsx` already uses (`scripts/web-postexport.mjs`'s `DEV_ONLY_PAGES` array + the matching assertion in `scripts/verify-routes.mjs`), so it is reachable locally but never present in a production export.

**Tech Stack:** Raw WebGL2 + TypeScript, zero new npm dependencies. Three of the four reference components (Orb, Galaxy, MetaBalls) already use raw WebGL2 with hand-written GLSL in their own source — matching this project's existing convention exactly. Only the reference Liquid Chrome uses a small helper library (`ogl`); this plan ports it to raw WebGL instead of adding that dependency, since its own shader is already WebGL1-style GLSL (`attribute`/`varying`/`gl_FragColor`) and trivially runs under a WebGL2 context unchanged.

**Spec:** The user's own request message ("Mmusic — Mood & Vibes — Living Moods" prototype) is the spec; its exact requirements are reproduced in Global Constraints below. No separate spec document exists.

**License note (user required a review before integrating reference code):** reactbits.dev / the `DavidHDev/react-bits` GitHub repo is licensed **MIT + Commons Clause License Condition v1.0** (confirmed by fetching `LICENSE.md` from the repo directly). It explicitly permits using, copying, modifying, and distributing the software "as part of an application, website, or product" — exactly this use — including commercially. Its one restriction: "you may not sell, sublicense, or redistribute the components themselves — whether alone, in a bundle, or as a ported version." This plan adapts the four components' rendering/composition/motion into Mmusic's own codebase (not a standalone redistribution of the components), which is squarely the permitted case. Each scene's source file gets a one-line comment crediting the reference it was adapted from.

## Global Constraints

Reproduced from the user's request, binding on every task:

- This is an exploration/visual-approval task, NOT authorization to change the approved Mmusic UI.
- Preserve the current approved interface, navigation, Dynamic Premium Player, Particle Wave, gestures, lyrics, queue, and all existing functionality — do not modify any of it.
- Do not modify the existing production Mood & Vibes components (`src/mocks/moods.ts`, `MoodCard`, `mood-visual.tsx`/`mood-visual.web.tsx` — the prototype's own files must be named distinctly, e.g. under `living-moods/`, to avoid any confusion with these).
- Do not change backend code or APIs.
- Do not commit, push, merge, reset, or deploy anything without explicit approval.
- Do not resume the paused W3 Stage 2 work.
- The prototype route must be isolated — reachable directly, locally, without changing production navigation (no link to it from any approved screen).
- Avoid: generic animated gradients, basic CSS hover scaling, simple floating circles, repetitive looping animations, excessive glassmorphism, too much text/decorative UI, effects that look like copied React Bits demos (must be art-directed and adapted, not pasted unchanged).
- Each of the four scenes needs: a unique visual identity, a distinctive motion language, beautiful idle behavior, meaningful user interaction (pointer on desktop, touch on mobile), a premium composition, smooth transitions, excellent mobile performance.
- Prototype experience: four interactive animated mood cards, an idle animation per card, a desktop hover interaction, a mobile touch interaction, a way to preview each animation expanded, smooth expand/collapse transitions, a clear way back to the four-card overview. Use Mmusic's existing typography/design language (not the approved production screens themselves).
- Technical requirements: reuse compatible existing dependencies where practical (none exist for WebGL — see Tech Stack above for why this plan adds none anyway); review source licenses (done above); prefer reusable React components; support desktop Safari/Chrome and iPhone Safari; account for WebGL performance and device pixel ratio; avoid unnecessary GPU work when offscreen; handle WebGL context loss gracefully; provide reduced-motion and non-WebGL fallbacks; clean up animation frames/listeners/GPU resources correctly; no audio playback or microphone permissions; do not connect to the existing player. Do not run all four expensive WebGL scenes simultaneously — use a lazy mount/preview strategy.
- Verification: run applicable TypeScript, lint, tests, web build checks. Test the isolated prototype at mobile and desktop viewport sizes. Do not claim physical iPhone testing unless actually performed.
- Deliverables: local prototype route/URL; a brief description of each animation; the interaction behavior for each; any dependencies added (answer: none); performance observations and limitations; verification results; confirmation approved screens/functionality are unchanged.
- **Stop after completing the isolated prototype. Wait for explicit visual approval before integrating anything into the actual Mood & Vibes section.**

## Review Focus

- Do the four scenes actually read as visually and motion-wise distinct from one another, or do two of them end up looking like the same noise shader with a different palette swapped in? (The user explicitly does not want "four ordinary React Bits examples placed in cards.") The reviewer should describe each scene's visual character in their own words as part of this check, not just confirm four files exist.
- Is at most one WebGL context genuinely alive at a time across the four cards — verified by checking the lazy-mount logic itself (not just trusting a comment that says so), e.g. by confirming unmounted/non-active cards hold no live canvas context.
- Does a simulated context-loss event actually fall back to the static/CSS placeholder within the timeout, and does `prefers-reduced-motion` actually freeze each scene to one still frame rather than silently continuing to animate?
- Does touch interaction genuinely work on a touch-emulated/mobile viewport (not just mouse interaction verified and touch assumed by symmetry)?
- Does the production web build still exclude `dev-living-moods.html` the same way it already excludes `dev-ui-kit.html` — checked directly in a built `dist/`, not just assumed from the source change?

---

### Task 1: Shared WebGL lifecycle, scene wrapper, and the isolated route shell

Pure infrastructure — no real scene visuals yet (placeholder gradient tiles stand in for the four cards). This is what Tasks 2-5 plug into.

**Files:**
- Create: `apps/mobile/src/components/living-moods/webgl-scene-controller.ts`
- Create: `apps/mobile/src/components/living-moods/gl-utils.ts`
- Create: `apps/mobile/src/components/living-moods/living-mood-scene.web.tsx`
- Create: `apps/mobile/src/components/living-moods/living-mood-scene.tsx`
- Create: `apps/mobile/src/components/living-moods/types.ts`
- Create: `apps/mobile/src/app/dev-living-moods.tsx`
- Modify: `apps/mobile/scripts/web-postexport.mjs`
- Modify: `apps/mobile/scripts/verify-routes.mjs`

**Interfaces:**
- Produces: `abstract class WebGLSceneController` with the constructor `(canvas: HTMLCanvasElement, onFallback: () => void)`, public methods `resize(): void` and `destroy(): void`, and protected abstract hooks `onInit(gl)`, `onResize(gl, width, height)`, `onFrame(gl, dt, time, pointer)`, `onDispose(gl)` — consumed by Tasks 2-5's four concrete scene classes.
- Produces: `compile(gl, type, src): WebGLShader` and `program(gl, vertexSrc, fragmentSrc): WebGLProgram` from `gl-utils.ts`, plus `createFullscreenTriangle(gl): WebGLBuffer` (the single 3-vertex oversized-triangle trick every one of these shaders uses instead of a 2-triangle quad) — consumed by Tasks 2-5.
- Produces: `export type PointerInput = { x: number; y: number; active: boolean }` from `types.ts` — consumed by Tasks 2-5's `onFrame` implementations.
- Produces: `<LivingMoodScene engine={SceneCtor} active={boolean} label={string} />` component — consumed by Task 6 when wiring the four real scenes into the card grid.
- Consumes: nothing from earlier tasks (this is the first task).

- [ ] **Step 1: Create the GL helper utilities**

Create `apps/mobile/src/components/living-moods/gl-utils.ts`:
```ts
/** Raw-WebGL shader/program helpers — same two-function pattern already
 * proven in `particle-wave/engine.ts`, reused here so every Living Moods
 * scene shares one compile path instead of four copies of it. */
export function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'shader compile failed';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

export function program(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string): WebGLProgram {
  const prog = gl.createProgram();
  if (!prog) throw new Error('Unable to create program');
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  gl.attachShader(prog, vertex);
  gl.attachShader(prog, fragment);
  gl.linkProgram(prog);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) ?? 'program link failed';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

/** A single triangle large enough to cover the whole viewport — the
 * standard full-screen-shader trick (one triangle, not two), avoiding a
 * seam down the diagonal that a two-triangle quad can show on some GPUs. */
export function createFullscreenTriangle(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Unable to create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  return buffer;
}

/** Binds `buffer` to a vertex attribute named `attribute` on `prog` as a
 * vec2 — the one draw-setup line every scene's `onInit` needs once. */
export function bindPositionAttribute(gl: WebGL2RenderingContext, prog: WebGLProgram, buffer: WebGLBuffer, attribute = 'aPosition') {
  const location = gl.getAttribLocation(prog, attribute);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}
```

- [ ] **Step 2: Create the shared types**

Create `apps/mobile/src/components/living-moods/types.ts`:
```ts
/** Pointer/touch position in [0, 1] canvas-relative space, or inactive
 * when nothing is hovering/touching — every scene's `onFrame` receives
 * this each frame so pointer and touch interaction share one code path. */
export type PointerInput = { x: number; y: number; active: boolean };
```

- [ ] **Step 3: Create the shared `WebGLSceneController` base class**

Create `apps/mobile/src/components/living-moods/webgl-scene-controller.ts`:
```ts
import type { PointerInput } from './types';

/** If a lost WebGL context is not restored within this time, fall back. */
const RESTORE_TIMEOUT_MS = 2500;

/**
 * Shared lifecycle for every Living Moods scene — context creation, resize/
 * DPR, context-loss/restore with a fallback timeout, `prefers-reduced-motion`
 * gating, on-screen/page-visibility gating, pointer+touch tracking (via the
 * Pointer Events API, which fires for both), and a `destroy()` cleanup
 * checklist. This generalizes the exact pattern already proven in
 * `particle-wave/engine.ts` so each concrete scene only implements its own
 * shader/program/draw call via the four protected hooks below.
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
      this.onResize(gl, width, height);
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
      this.onDispose(gl);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return false;
    try {
      this.gl = gl;
      this.onInit(gl);
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
      this.onFrame(this.gl, 0, this.time, this.pointer);
      return;
    }
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const dt = this.last === 0 ? 16 : Math.min(now - this.last, 100);
    this.last = now;
    this.time += dt / 1000;
    if (this.gl) this.onFrame(this.gl, dt / 1000, this.time, this.pointer);
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

  /** Build shaders/program/buffers here. Throw to trigger the fallback. */
  protected abstract onInit(gl: WebGL2RenderingContext): void;
  /** Called whenever the canvas's drawing-buffer size changes. */
  protected abstract onResize(gl: WebGL2RenderingContext, width: number, height: number): void;
  /** Called once per scheduled frame (or once with dt=0 when paused/reduced-motion/offscreen). */
  protected abstract onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void;
  /** Delete every buffer/texture/program this scene created. */
  protected abstract onDispose(gl: WebGL2RenderingContext): void;
}
```

- [ ] **Step 4: Create the web scene wrapper**

Create `apps/mobile/src/components/living-moods/living-mood-scene.web.tsx`:
```tsx
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, Engine]);

  const showFallback = !active || fallback;
  return (
    <View style={[styles.container, style]}>
      {showFallback ? (
        <View
          style={[
            styles.fallback,
            // @ts-expect-error — web-only CSS gradient, this file never runs on native
            { backgroundImage: `linear-gradient(145deg, ${fallbackColors[0]}, ${fallbackColors[1]})` },
          ]}
        />
      ) : (
        // @ts-expect-error — raw DOM canvas on the web build only
        <canvas ref={canvasRef} style={styles.canvas} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', display: 'block' },
  fallback: { flex: 1 },
});
```

- [ ] **Step 5: Create the native fallback wrapper**

Create `apps/mobile/src/components/living-moods/living-mood-scene.tsx`:
```tsx
import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { WebGLSceneController } from './webgl-scene-controller';

export type SceneEngineCtor = new (canvas: HTMLCanvasElement, onFallback: () => void) => WebGLSceneController;

export type LivingMoodSceneProps = {
  engine: SceneEngineCtor;
  active: boolean;
  fallbackColors: [string, string];
  style?: ViewStyle;
};

/** Native has no WebGL2-in-a-`<canvas>` story here (this prototype is
 * web-only per its own scope) — always renders the same gradient-style
 * placeholder the web build shows for its own non-WebGL fallback. */
export function LivingMoodScene({ fallbackColors, style }: LivingMoodSceneProps) {
  return <View style={[styles.container, { backgroundColor: fallbackColors[0] }, style]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
```

- [ ] **Step 6: Create the isolated route shell with placeholder cards**

Create `apps/mobile/src/app/dev-living-moods.tsx`:
```tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Spacing } from '@/constants/theme';

type CardId = 'liquid-chrome' | 'meta-balls' | 'orb' | 'galaxy';

const CARDS: { id: CardId; title: string; description: string; colors: [string, string] }[] = [
  { id: 'liquid-chrome', title: 'Liquid Chrome', description: 'Fluid metallic reflections', colors: ['#1a1a1f', '#3a3a42'] },
  { id: 'meta-balls', title: 'Meta Balls', description: 'Merging organic spheres', colors: ['#1a1014', '#3a1f28'] },
  { id: 'orb', title: 'Orb', description: 'A cinematic energy core', colors: ['#120a16', '#2a1638'] },
  { id: 'galaxy', title: 'Galaxy', description: 'A deep particle environment', colors: ['#0a0e16', '#162038'] },
];

/**
 * Dev-only prototype — Mood & Vibes: Living Moods (W3 exploration). NOT
 * linked from any production screen; excluded from the web export the same
 * way `dev-ui-kit.tsx` is (see `scripts/web-postexport.mjs`). The four real
 * WebGL scenes are wired in by Task 6 — this shell ships inert gradient
 * cards so the grid/expand-collapse mechanics can be reviewed on their own.
 */
export default function DevLivingMoodsScreen() {
  const [expanded, setExpanded] = useState<CardId | null>(null);
  const expandedCard = CARDS.find((c) => c.id === expanded);

  if (expandedCard) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={[styles.expandedScene, { backgroundColor: expandedCard.colors[0] }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to overview"
            onPress={() => setExpanded(null)}
            style={styles.backButton}
          >
            <ThemedText variant="label-lg">← Back</ThemedText>
          </Pressable>
          <View style={styles.expandedCaption}>
            <ThemedText variant="headline-md">{expandedCard.title}</ThemedText>
            <ThemedText variant="body-md" emphasis="medium">
              {expandedCard.description}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="display-lg-mobile" style={styles.title}>
            Living Moods
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.subtitle}>
            Four experimental mood animations — prototype only.
          </ThemedText>
          <View style={styles.grid}>
            {CARDS.map((card) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${card.title}`}
                onPress={() => setExpanded(card.id)}
                style={styles.card}
              >
                <View style={[styles.cardScene, { backgroundColor: card.colors[0] }]} />
                <View style={styles.cardCaption}>
                  <ThemedText variant="label-lg">{card.title}</ThemedText>
                  <ThemedText variant="body-sm" emphasis="medium">
                    {card.description}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg },
  title: { marginTop: Spacing.md },
  subtitle: { marginTop: -Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { width: '47%', aspectRatio: 1, borderRadius: Radii.lg, overflow: 'hidden', backgroundColor: Colors.surface.l1 },
  cardScene: { flex: 1 },
  cardCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.sm },
  expandedScene: { flex: 1 },
  backButton: { position: 'absolute', top: Spacing.margin, left: Spacing.margin, padding: Spacing.sm },
  expandedCaption: { position: 'absolute', left: Spacing.margin, bottom: Spacing.margin },
});
```

- [ ] **Step 7: Exclude the new route from the production web export**

In `apps/mobile/scripts/web-postexport.mjs`, change:
```js
const DEV_ONLY_PAGES = ['dev-ui-kit.html', '_sitemap.html'];
```
to:
```js
const DEV_ONLY_PAGES = ['dev-ui-kit.html', 'dev-living-moods.html', '_sitemap.html'];
```

In `apps/mobile/scripts/verify-routes.mjs`, change:
```js
for (const path of ['dev-ui-kit.html', '_sitemap.html']) {
```
to:
```js
for (const path of ['dev-ui-kit.html', 'dev-living-moods.html', '_sitemap.html']) {
```

- [ ] **Step 8: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass, including the updated `verify-routes.mjs` check (it now also asserts `dev-living-moods.html` is absent from `dist/`).

Run: `npm run build:web`
Expected: build succeeds; output includes `removed development page: dev-living-moods.html`.

- [ ] **Step 9: Visual check**

Serve the web build locally. Open `/dev-living-moods`. Confirm: four gradient-tile cards in a 2×2-ish grid with title/description captions, tapping a card expands it full-screen with a Back control, tapping Back returns to the grid. Check at a ~390px mobile viewport and at desktop width. Confirm `/home`, `/search`, `/library`, and the rest of the approved app are visually and behaviorally unchanged.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/src/components/living-moods apps/mobile/src/app/dev-living-moods.tsx apps/mobile/scripts/web-postexport.mjs apps/mobile/scripts/verify-routes.mjs
git commit -m "feat: Living Moods prototype shell (shared WebGL lifecycle + isolated dev route)"
```

---

### Task 2: Liquid Chrome scene

**Files:**
- Create: `apps/mobile/src/components/living-moods/scenes/liquid-chrome-scene.ts`

**Interfaces:**
- Consumes: `WebGLSceneController` (Task 1), `compile`/`program`/`createFullscreenTriangle`/`bindPositionAttribute` (Task 1), `PointerInput` (Task 1).
- Produces: `export class LiquidChromeScene extends WebGLSceneController` — consumed by Task 6's card grid wiring.

**Reference material (adapt, do not paste unchanged — see License note in this plan's header):** the reactbits.dev `backgrounds/liquid-chrome` component's fragment shader (`DavidHDev/react-bits`, `src/ts-default/Backgrounds/LiquidChrome/LiquidChrome.tsx`) is WebGL1-style GLSL (`attribute`/`varying`/`gl_FragColor`), which runs unchanged under a WebGL2 context — no `#version 300 es` porting needed for the shader body itself, only the surrounding JS (replace `ogl`'s `Renderer`/`Program`/`Mesh`/`Triangle` with this plan's `gl-utils.ts` helpers and `WebGLSceneController`'s lifecycle). Its reference vertex shader:
```glsl
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
```
(Adapt: this plan's `createFullscreenTriangle` provides one `aPosition` attribute, not separate `position`/`uv` attributes — derive `vUv` from `aPosition` directly, e.g. `vUv = aPosition * 0.5 + 0.5;`, removing the need for a second buffer.)

Its reference fragment shader (uniforms: `uTime`, `uResolution: vec3`, `uBaseColor: vec3`, `uAmplitude`, `uFrequencyX`, `uFrequencyY`, `uMouse: vec2`):
```glsl
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uBaseColor;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform vec2 uMouse;
varying vec2 vUv;

vec4 renderImage(vec2 uvCoord) {
    vec2 fragCoord = uvCoord * uResolution.xy;
    vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);
    for (float i = 1.0; i < 10.0; i++){
        uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
        uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
    }
    vec2 diff = (uvCoord - uMouse);
    float dist = length(diff);
    float falloff = exp(-dist * 20.0);
    float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
    uv += (diff / (dist + 0.0001)) * ripple * falloff;
    vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
    return vec4(color, 1.0);
}

void main() {
    vec4 col = vec4(0.0);
    int samples = 0;
    for (int i = -1; i <= 1; i++){
        for (int j = -1; j <= 1; j++){
            vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
            col += renderImage(vUv + offset);
            samples++;
        }
    }
    gl_FragColor = col / float(samples);
}
```
This is a domain-warped mirror-chrome field (nested cosine-wave distortion) plus a radial pointer-ripple and a 3×3 supersample blur for anti-aliasing. Its default `baseColor` is a neutral gray `[0.1, 0.1, 0.1]`, which combined with `color = uBaseColor / abs(sin(...))` produces a bright, eerie mercury-chrome look with no inherent hue.

**Required adaptation (this is the art-direction work — not optional, and not fully specified here on purpose, per this plan's header note that these four tasks are creative/exploratory):**
- Re-grade the palette toward Mmusic's own tokens (`@mmusic/design-tokens`: canvas `#0A0A0C`, primary `#FF4B4B`, secondary `#F5A623`, tertiary `#FF7A59`) instead of the reference's neutral gray — e.g. tint `uBaseColor` warm (coral/amber) rather than literal chrome, or drive a second color uniform that blends in with the ripple/distortion so the result reads as "molten coral metal" rather than "generic mirror," while keeping it a premium metallic reflection, not a flat gradient.
- Tune `uAmplitude`/`uFrequencyX`/`uFrequencyY` for a calmer idle state suited to a card-sized surface (the reference defaults are tuned for full-viewport viewing) and a slightly more dramatic expanded state — consider exposing these as constructor options so `onResize` or an `active`/expanded flag can re-tune them, rather than one fixed look in both contexts.
- `uMouse` must come from this plan's `PointerInput` (already in `[0,1]` space matching the reference's own mouse-uniform convention) — wire `pointer.x`, `1 - pointer.y` (the reference flips Y, confirm by reading its `handleMouseMove`/`handleTouchMove` which both do `1 - (clientY - rect.top) / rect.height`) each `onFrame`, and leave `uMouse` parked at a center-ish resting value when `pointer.active` is false, with a brief ease rather than a snap, so the idle state still looks deliberately composed.

- [ ] **Step 1: Implement `LiquidChromeScene`**

Write `apps/mobile/src/components/living-moods/scenes/liquid-chrome-scene.ts` as a `WebGLSceneController` subclass: `onInit` compiles the adapted vertex/fragment shaders above via `program()`, creates the fullscreen triangle via `createFullscreenTriangle()`, binds it via `bindPositionAttribute()`, looks up and caches every uniform location, and sets the Mmusic-adapted base color / amplitude / frequency uniforms. `onResize` updates a `uResolution` uniform (`[width, height, width/height]`, matching the reference's `vec3` convention). `onFrame` eases a cached mouse position toward `pointer.active ? [pointer.x, 1 - pointer.y] : [0.5, 0.5]`, sets `uTime`/`uMouse`, and issues `gl.drawArrays(gl.TRIANGLES, 0, 3)`. `onDispose` deletes the program and the triangle buffer.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Isolated visual check**

Temporarily wire `LiquidChromeScene` into `dev-living-moods.tsx`'s first card (via `<LivingMoodScene engine={LiquidChromeScene} active .../>` in place of its gradient placeholder) to view it directly — this wiring is provisional and will be redone properly in Task 6 alongside the other three; leave this temporary wiring in place for the task reviewer to see, noting in the report that Task 6 does the real wiring for all four. Serve the web build, open `/dev-living-moods`, confirm: a fluid metallic surface with continuous idle motion, visibly distinct Mmusic-palette coloring (not neutral chrome-gray), and pointer movement visibly perturbing the surface (a ripple that follows the cursor). Test touch on a mobile-emulated viewport too.

- [ ] **Step 4: Lint, test, build**

Run: `cd apps/mobile && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/living-moods/scenes/liquid-chrome-scene.ts apps/mobile/src/app/dev-living-moods.tsx
git commit -m "feat: Liquid Chrome Living Moods scene"
```

---

### Task 3: Meta Balls scene

**Files:**
- Create: `apps/mobile/src/components/living-moods/scenes/meta-balls-scene.ts`

**Interfaces:**
- Consumes: same Task 1 exports as Task 2.
- Produces: `export class MetaBallsScene extends WebGLSceneController` — consumed by Task 6.

**Reference material:** the reactbits.dev `animations/meta-balls` component (`src/ts-default/Animations/MetaBalls/MetaBalls.tsx`, 664 lines — not reproduced in full here; the implementer should fetch it directly: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Animations/MetaBalls/MetaBalls.tsx` — same MIT + Commons Clause license as Liquid Chrome, confirmed in this plan's header). It is already raw WebGL2 (`#version 300 es`, `getContext('webgl2', ...)`), no helper library — directly consistent with this plan's `WebGLSceneController`. Its field-rendering shader takes an array of ball positions/radii (`uniform vec4 uBalls[SLOTS]`), computes a classic metaball isosurface field per pixel (sum of `radius / distance` terms, thresholded with smoothstep for a soft merge edge), and supports three render `Variant`s (`solid`/`outline`/`contour`) and three `Motion` styles (`orbit`/`drift`/`lava`) for how the balls move over time, plus cursor-attraction when `enableMouseInteraction` is set — read its `draw()`/motion-update functions directly from the fetched source for the exact field-isosurface math and the ball-motion integration before writing the adapted version.

**Required adaptation:**
- Re-grade toward Mmusic's palette (the reference's `uColor`/`uCursorColor` uniforms) — aim for "soft luminous gradients" and real "depth and dimensionality" per the brief, not the reference's default flat single-hue fill; consider blending between `primary`/`tertiary` across the balls or by depth/size for a less uniform, more premium look.
- The brief explicitly calls for "no cheap bouncing-ball appearance" — favor the reference's `lava`-style slow drift-and-merge motion (or a custom blend) over a bouncy `orbit` feel for the idle state; reserve snappier motion, if any, for the pointer-interaction response only.
- Wire `PointerInput` into the reference's cursor-attraction mechanism (its `enableMouseInteraction`/cursor-ball uniform), active only while `pointer.active`, so idle = ambient merging/drifting, interaction = balls visibly drawn toward the pointer/touch point.

- [ ] **Step 1: Fetch the reference source for study**

Run: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Animations/MetaBalls/MetaBalls.tsx -o /tmp/meta-balls-reference.tsx` and read it in full before writing the adapted version — do not guess at the field-isosurface math from the summary above alone.

- [ ] **Step 2: Implement `MetaBallsScene`**

Write `apps/mobile/src/components/living-moods/scenes/meta-balls-scene.ts` as a `WebGLSceneController` subclass, porting the reference's WebGL2 shader setup (already raw WebGL2 — primarily a direct port of its `compile`/program/uniform-location pattern into this plan's `gl-utils.ts` helpers) and its ball-motion/field-rendering logic, with the palette and motion adaptations above. `onFrame` advances the balls' positions per the chosen motion style, applies pointer attraction when `pointer.active`, uploads the ball array uniform, sets `uTime`, and draws. `onDispose` deletes the program and buffer(s).

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Isolated visual check**

Temporarily wire into the grid's second card (same provisional-wiring approach as Task 2's Step 3). Confirm: smooth merging/separation of soft-edged spheres, natural elastic-looking motion (not bouncing), pointer/touch visibly attracting nearby balls, soft luminous Mmusic-palette coloring with visible depth, distinctly different in both palette and motion language from the Liquid Chrome scene.

- [ ] **Step 5: Lint, test, build**

Run: `cd apps/mobile && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/living-moods/scenes/meta-balls-scene.ts apps/mobile/src/app/dev-living-moods.tsx
git commit -m "feat: Meta Balls Living Moods scene"
```

---

### Task 4: Orb scene

**Files:**
- Create: `apps/mobile/src/components/living-moods/scenes/orb-scene.ts`

**Interfaces:**
- Consumes: same Task 1 exports as Task 2.
- Produces: `export class OrbScene extends WebGLSceneController` — consumed by Task 6.

**Reference material:** the reactbits.dev `backgrounds/orb` component (`src/ts-default/Backgrounds/Orb/Orb.tsx`, 614 lines — fetch directly: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Backgrounds/Orb/Orb.tsx`). Already raw WebGL2 (`#version 300 es`). Its fragment shader is a sophisticated plasma/energy-field renderer: simplex noise (`snoise3`) drives an organic, wobbling radial boundary (`r0`), two light-attenuation helper functions (`light1`/`light2`, inverse-distance and inverse-square falloff) build up glow/bloom/highlight-trail terms, an orbiting highlight (`uOrbit`) with a comet-style fading `trail`, a pointer-driven "reach" distortion (`uReach`) that pulls/stretches the boundary toward the cursor, and a `uTilt`-based 3D plane projection for a parallax-like tilt response. Uniforms include `uColor1`/`uColor2`/`uColor3` (gradient stops), `uGlow`, `uBleed`, `uWobble`, `uHighlight`, `uSwirl`, `uOrbit`, `uTrail`, `uReveal`/`uOpacity` (intro fade), `uBackground`. This is the most mathematically dense of the four references — read its full `draw()` function from the fetched source (quoted partially in this plan's header investigation but not reproduced in full here) before adapting.

**Required adaptation:**
- Map `uColor1`/`uColor2`/`uColor3` to an Mmusic-anchored gradient (e.g. `primary` → `tertiary` → a near-black `uColor3` close to `canvas`), so the core itself visually belongs to the app rather than reading as a generic plasma-ball demo.
- The brief wants "elegant glow without excessive brightness" and "subtle energy pulses" — the reference's defaults (check the fetched source's default export props) may run hotter/busier than that; favor restraint on `uGlow`/`uBleed`/`uHighlight` for the idle state, saving more intensity for the interaction response (pointer "reach") so the premium, atmospheric feel is the default, not the exception.
- Wire `PointerInput` into `uReach` (pointer displacement from center, in the same normalized-UV space the shader already expects — confirm the exact scale/sign from the fetched source's own pointer-handling code) so the energy core visibly responds to the cursor/touch, easing back to a centered, calm idle state when `pointer.active` is false.
- `uTilt` is optional — only wire it if a cheap, sensible input exists (e.g. a slow autonomous drift for idle "organic internal movement," since this prototype intentionally does not request device-orientation/gyroscope permissions — the brief's "responsive movement" requirement is satisfied by the pointer-driven `uReach` alone).

- [ ] **Step 1: Fetch the reference source for study**

Run: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Backgrounds/Orb/Orb.tsx -o /tmp/orb-reference.tsx` and read it in full, in particular its `draw()` function and its default prop values, before writing the adapted version.

- [ ] **Step 2: Implement `OrbScene`**

Write `apps/mobile/src/components/living-moods/scenes/orb-scene.ts` as a `WebGLSceneController` subclass, porting the reference's shader and uniform-upload logic with the palette/intensity/pointer adaptations above. `onFrame` advances `uTime`/`uOrbit`, eases `uReach` toward the pointer position (or back to zero) using `PointerInput`, uploads uniforms, draws. `onDispose` deletes the program and buffer.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Isolated visual check**

Temporarily wire into the grid's third card. Confirm: organic internal movement (not a static glowing disc), a restrained ambient glow at idle, visible pointer/touch response (the core's boundary or highlight reacting to cursor position), layered luminous depth rather than a flat circle, distinctly different from both prior scenes.

- [ ] **Step 5: Lint, test, build**

Run: `cd apps/mobile && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/living-moods/scenes/orb-scene.ts apps/mobile/src/app/dev-living-moods.tsx
git commit -m "feat: Orb Living Moods scene"
```

---

### Task 5: Galaxy scene

**Files:**
- Create: `apps/mobile/src/components/living-moods/scenes/galaxy-scene.ts`

**Interfaces:**
- Consumes: same Task 1 exports as Task 2.
- Produces: `export class GalaxyScene extends WebGLSceneController` — consumed by Task 6.

**Reference material:** the reactbits.dev `backgrounds/galaxy` component (`src/ts-default/Backgrounds/Galaxy/Galaxy.tsx`, 658 lines — fetch directly: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Backgrounds/Galaxy/Galaxy.tsx`). Already raw WebGL2. A single-pass particle-field fragment shader (not instanced geometry) with uniforms including `uFocal`/`uRotation` (camera-like framing), `uGloss`, `uDepth`, `uDensity`, `uHueShift`, `uSpeed`, `uMouse`, `uStarGlow`, `uFlareGain`, `uSquash`, `uSaturation`, `uMouseRepulsion`, `uTwinkleIntensity`, `uRotationAngle`, `uRepulsionStrength`, `uMouseActiveFactor`, `uAutoCenterRepulsion` — read its full shader body from the fetched source before adapting; this is the project's best starting point for "layered particle depth," since `uDepth`/`uFocal` already imply a depth-of-field-like layering rather than a flat 2D starfield.

**Required adaptation:**
- The brief explicitly warns against "visually noisy starfields" — favor a lower `uDensity` and a controlled `uTwinkleIntensity` for a composed, cinematic field rather than the reference's potentially denser default (check the fetched source's defaults), and lean on `uDepth`/`uFocal` for the requested "subtle parallax" rather than raw particle count.
- `uHueShift`/`uSaturation` should land the field in Mmusic's palette family (warm coral/amber accents against the near-black `canvas` background) rather than a generic blue/white starfield — tune `uHueShift` accordingly and confirm live rather than guessing the exact value from the shader alone.
- Wire `PointerInput` into `uMouse`/`uMouseRepulsion`/`uMouseActiveFactor` for the pointer/touch responsiveness requirement (gentle particle repulsion from the cursor, not a jarring scatter) — the reference already supports this mechanism; the adaptation work here is tuning the response to feel "smooth" and "cinematic" per the brief, not building the mechanism from scratch.
- `uAutoCenterRepulsion` (if present in the fetched source as a standalone idle-motion driver) is a reasonable source of the "organic particle movement" requirement for the idle state, distinct from pointer interaction — confirm its behavior in the fetched source before relying on it.

- [ ] **Step 1: Fetch the reference source for study**

Run: `curl -sL https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Backgrounds/Galaxy/Galaxy.tsx -o /tmp/galaxy-reference.tsx` and read it in full, in particular its fragment shader body and default prop values, before writing the adapted version.

- [ ] **Step 2: Implement `GalaxyScene`**

Write `apps/mobile/src/components/living-moods/scenes/galaxy-scene.ts` as a `WebGLSceneController` subclass, porting the reference's shader and uniform-upload logic with the density/palette/pointer-response adaptations above. `onFrame` advances `uTime`/rotation, eases `uMouse` toward the pointer position (or an idle auto-drift when inactive), uploads uniforms, draws. `onDispose` deletes the program and buffer.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Isolated visual check**

Temporarily wire into the grid's fourth card. Confirm: a layered, depth-y particle field (not a flat noisy starfield), visible subtle parallax/depth, organic idle particle movement, visible pointer/touch repulsion response, Mmusic-palette coloring, distinctly different from the other three scenes.

- [ ] **Step 5: Lint, test, build**

Run: `cd apps/mobile && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/living-moods/scenes/galaxy-scene.ts apps/mobile/src/app/dev-living-moods.tsx
git commit -m "feat: Galaxy Living Moods scene"
```

---

### Task 6: Final wiring, lazy-mount verification, and full prototype review

**Files:**
- Modify: `apps/mobile/src/app/dev-living-moods.tsx`

**Interfaces:**
- Consumes: `LivingMoodScene` (Task 1), `LiquidChromeScene`/`MetaBallsScene`/`OrbScene`/`GalaxyScene` (Tasks 2-5).
- Produces: nothing further downstream — this is the plan's last task.

- [ ] **Step 1: Replace every card's gradient placeholder with its real scene**

In `apps/mobile/src/app/dev-living-moods.tsx`, import `LivingMoodScene` and the four scene classes, and add:
```tsx
import { GalaxyScene } from '@/components/living-moods/scenes/galaxy-scene';
import { LiquidChromeScene } from '@/components/living-moods/scenes/liquid-chrome-scene';
import { MetaBallsScene } from '@/components/living-moods/scenes/meta-balls-scene';
import { OrbScene } from '@/components/living-moods/scenes/orb-scene';
import { LivingMoodScene, type SceneEngineCtor } from '@/components/living-moods/living-mood-scene';

const SCENE_BY_ID: Record<CardId, SceneEngineCtor> = {
  'liquid-chrome': LiquidChromeScene,
  'meta-balls': MetaBallsScene,
  orb: OrbScene,
  galaxy: GalaxyScene,
};
```
Replace each grid card's `<View style={[styles.cardScene, ...]} />` with `<LivingMoodScene engine={SCENE_BY_ID[card.id]} active fallbackColors={card.colors} style={styles.cardScene} />` — every grid card stays `active` (each is cheap at card size). Replace the expanded view's `<View style={styles.expandedScene} />` with `<LivingMoodScene engine={SCENE_BY_ID[expandedCard.id]} active fallbackColors={expandedCard.colors} style={styles.expandedScene} />`, and change the grid's own cards so each one's `active` becomes `card.id !== expanded` while something is expanded — wait, inverted: while a card is expanded, every GRID card underneath is unmounted (the grid itself isn't rendered at all once `expandedCard` is set, per the existing early-return structure in Task 1's Step 6 code) — so no extra `active`-toggling logic is needed beyond what's shown above: the grid's four cards only ever render (and their scenes only ever mount) while `expanded === null`, and the expanded view's one scene only ever renders while something is expanded. This already guarantees at most one scene run at full (expanded) size at a time, and at most four small ones at card size, never both simultaneously. Remove any leftover provisional single-card wiring from Tasks 2-5's Step 3 if it differs from this final structure.

- [ ] **Step 2: Verify the lazy-mount claim directly, not just by code inspection**

With the web build served, open DevTools (or equivalent) and confirm via `document.querySelectorAll('canvas').length` (or an equivalent check) that exactly one `<canvas>` element exists in the DOM whenever a card is expanded, and exactly four small ones exist in the grid view (each inexpensive at card size) — never a mix implying more than one full-size scene is simultaneously active. Note this check and its result in the report.

- [ ] **Step 3: Context-loss and reduced-motion checks**

With one scene expanded, force a context loss (e.g. `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` via the console) and confirm the scene falls back to its gradient placeholder within ~2.5s, without the app crashing or logging an uncaught error. Separately, enable `prefers-reduced-motion` (via DevTools' rendering emulation or the OS setting) and confirm each scene freezes to a single still frame rather than continuing to animate.

- [ ] **Step 4: Full verification pass**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

Run: `npm run build:web`
Expected: succeeds; `dist/dev-living-moods.html` is removed by the post-export step (confirm this file does NOT exist in `dist/` after the build, and that `npm test`'s `verify-routes.mjs` check — which also asserts this — passes).

- [ ] **Step 5: Visual check — full prototype, both viewports**

Serve the build. At both a ~390px mobile viewport and desktop width: open `/dev-living-moods`, confirm all four cards show their real, visually distinct idle animations; hover each on desktop and confirm a visible interaction response; on the mobile viewport, confirm touch-dragging across a card produces a visible interaction response; expand and collapse each of the four, confirming smooth transitions and that the Back control always works. Confirm none of this is reachable from any approved production screen (no link anywhere in `/home`, `/search`, `/library`, etc. points to `/dev-living-moods`).

- [ ] **Step 6: Compile the deliverables**

Write up (in the final report, not a new file) per the plan's Global Constraints: the local prototype URL; a one-paragraph description of each of the four animations; each one's interaction behavior (desktop hover vs. mobile touch); confirmation no new npm dependencies were added; performance observations (frame-rate impression at card size vs. expanded size, any throttling/adaptive-quality behavior if implemented, device-pixel-ratio handling); the verification results from Steps 4-5; explicit confirmation that no approved Mmusic screen, component, or behavior was modified (list every file touched across all 6 tasks, all under `living-moods/`, `dev-living-moods.tsx`, `web-postexport.mjs`, `verify-routes.mjs` — nothing else).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/app/dev-living-moods.tsx
git commit -m "feat: wire all four Living Moods scenes into the prototype grid"
```

---

## Final Report (after Task 6)

Stop here. Do not integrate anything into the production Mood & Vibes section, do not push/merge/deploy, and do not resume W3 Stage 2. Present the deliverables from Task 6 Step 6 and wait for explicit visual approval before any further action.
