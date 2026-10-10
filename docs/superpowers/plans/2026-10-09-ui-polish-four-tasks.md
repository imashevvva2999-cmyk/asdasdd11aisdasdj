# UI Polish — Four Approved Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four user-approved frontend polish items (audio-reactive Late Night Flow wave + Next Track button, nav-pill transitions, mood-card motion, and the corner-clipping bug) on the Mmusic web app without touching the approved shape/speed of Particle Wave B, the nav pill's size/position, or the mood cards' layout/text.

**Architecture:** All four areas are additive changes to the existing web (Expo static export) frontend. Audio reactivity is implemented with a Web Audio `AnalyserNode` tapped onto the single shared `<audio id="mmusic-audio">` element (no second player). New numeric logic (frequency-band smoothing, colour-tint lerp) lives in plain, DOM-free `src/lib/*.ts` modules so it can be unit-tested the way this repo already tests `wave-motion.ts` and `palette.ts` — via `tsx scripts/verify-*.mjs`, no React rendering needed. The mood-card motion bug turns out to be a real defect (see Task 6), not a design gap. The corner-clipping bug is a Safari/WebKit-only failure to clip a GPU-composited child (canvas/image) through an ancestor's `overflow:hidden` + `border-radius`; the fix is to also clip the child directly, which is a no-op in Chrome/native and fixes Safari.

**Tech Stack:** Expo Router web export, React Native Web, `react-native-reanimated` (web driver), raw WebGL1 (particle engine), Web Audio API (`AnalyserNode`), Zustand (`player-store.ts`). No new npm dependencies.

**Spec:** The four tasks and their acceptance criteria are the user's own message in this conversation (2026-10-09, "MMUSIC — FINAL PREMIUM UI POLISH (4 APPROVED AREAS)"), grounded against the four reference screenshots (`~/Downloads/IMG_0889.jpg`–`IMG_0892.jpg`) and the live investigation recorded below.

## Global Constraints

- Do not change Particle Wave B's shape, particle count, or `APPROVED_SPEED = 1.9` / `APPROVED_DENSITY = 1` (`scripts/verify-particle-wave.mjs` pins these — it must keep passing unmodified).
- Do not redesign any card's size, layout, text, or the nav pill's position/icons/colours.
- No new npm dependencies (no Lottie — it's unavailable in this session per the user, and isn't installed).
- Every new animation must respect `prefers-reduced-motion` (the app already uses `useReducedMotion()` from `react-native-reanimated` everywhere else).
- Tracks without real audio (`hasDemoAudio(id) === false`) must never appear to be audio-reactive — bands must read exactly 0, not a fake/simulated beat.
- Never create a second `<audio>`/player — the analyser taps the existing `#mmusic-audio` element from `platform-audio.web.ts`.
- Do not push to GitHub or deploy to Vercel. Do not touch backend code, credentials, or tool configuration.
- **Commit sequencing:** the user must visually approve the work before anything is committed. Every task below ends with a "Commit" step for traceability of what belongs together, but **none of those commits actually run during implementation** — code and tests for Tasks 1-7 land in the working tree only. Task 8 Step 4 is the user's own visual approval pass; only after they approve does Task 8 gain a final step that runs the seven deferred `git commit` commands in order (Task 1 through Task 7), giving one commit per task without ever committing unapproved work.
- `apps/mobile/package.json`'s `test` script chains every `scripts/verify-*.mjs` — any new pure-logic module gets its own verify script appended to that chain, following the existing `tsx scripts/verify-X.mjs` convention (see `scripts/verify-palettes.mjs`, `scripts/verify-home-ui.mjs`).

## Review Focus

- **Paused / no-audio tracks still look "reactive":** the two bullets "when paused, reduce audio-reactive movement gracefully" and "do not pretend tracks without audio are playing" are easy to half-implement (freeze instead of decaying, or decaying but not actually zero). Task 3's test pins bands → 0 when `playing` is false.
- **First-track colour pop:** switching from "no previous colour" to the first real palette must not flash. Task 3 seeds the tint ref at the *target* colour on mount instead of animating from a default.
- **`createMediaElementSource` called twice:** it throws if called on the same `<audio>` element a second time (e.g. Home unmounts/remounts the banner on fast tab switching). Task 1's module-level singleton guard is the test for this.
- **Reduced motion must silence all three new continuous animations independently** (particle audio-reactivity, nav-pill indicator, mood-card CSS loops) — Task 3/4/6 each check `useReducedMotion()`/the CSS media query on their own, since a shared missed check would be invisible until a reduced-motion device is tested.
- **The corner-radius fix regresses nothing on native/Chrome:** since Chrome/native already clip correctly, the fix must be provably a no-op there (same radius value, so nothing visually changes) — Task 7's step says to diff a Chrome screenshot before/after.

---

## Investigation record (already done — context for every task below)

- **Lottie:** no Lottie MCP tool is connected this session; `lottie-react-native`/`lottie-web` are not in `apps/mobile/package.json`. Task 6 uses `react-native-svg` (already a dependency, already used by `mood-visual.tsx`) + CSS, per the user's own fallback instruction.
- **Audio feasibility:** `apps/mobile/src/audio/browser-audio-engine.ts` uses one persistent `<audio id="mmusic-audio">`; `platform-audio.web.ts` resolves track sources via `expo-audio`'s `getSourceUri`, which serves the bundled asset same-origin. A `Web Audio AnalyserNode` via `createMediaElementSource` works in desktop and iOS Safari for same-origin media — no CORS blocker. Only `midnight-mirage` and `horizon` have real demo audio (`src/audio/demo-audio.ts`); everything else is `playback: 'unavailable'` and must report zero bands.
- **Mood-card animation is live-broken, not just "boring":** confirmed by polling the running dev server's DOM (`apps/mobile`'s web export at `localhost:8092`, Home → Mood & Vibe Mixes). The `MoodVisual` elements' inline `style="transform: translateY(...)"` / `style="opacity: ..."` attributes (Reanimated's web output) were read three times across a 4+ second span and were **byte-identical every time** — the `withRepeat(withTiming(...), -1, true)` loops in `src/components/ui/mood-visual.tsx` are not advancing on the web build. This matches the user's "feels too static" complaint literally. Task 6 replaces the web rendering path with CSS `@keyframes` (which don't depend on Reanimated's web driver at all) rather than trying to root-cause the Reanimated freeze.
- **Corner-clipping candidate:** `~/Downloads/IMG_0892.jpg`, zoomed into both bottom corners (`sips`/`PIL` crop), shows the large rounded-corner clip working correctly, but a second, much-less-rounded rectangular shape pokes a small triangular sliver past it — worse on the bottom-right. This is the signature of the known Safari/WebKit bug where `overflow:hidden` + `border-radius` on a parent fails to clip a GPU-composited child (`<canvas>`, or certain `<img>`/`expo-image` configurations) when that parent is *also* carrying a `transform` (which every card here does, via `PressableScale`'s `style={[animatedStyle, style]}` merge — confirmed in `src/components/ui/pressable-scale.tsx:36`, and confirmed live via DevTools that e.g. `quickTileStyles.row`'s `overflow:hidden`+`border-radius` sits on the exact same DOM node as `transform: scale(1)`). Chrome does not reproduce the bug (Blink doesn't have this failure mode), so it can't be visually re-confirmed without Safari; Task 7 applies the standard, zero-risk fix (redundant `border-radius`+`overflow:hidden` directly on the clipped child, not just the parent) to every such site in `card.tsx` and to the particle-wave canvas, which is the strongest single match (it's the only real `<canvas>` in the card system, and it's the "Late Night Flow" hero shown in the user's own first screenshot).

---

### Task 1: Pure audio-band and colour-tint math

**Files:**
- Create: `apps/mobile/src/lib/audio-bands.ts`
- Create: `apps/mobile/src/lib/particle-tint.ts`
- Test: `apps/mobile/scripts/verify-audio-reactive-wave.mjs` (covers this task's two files; Task 2 adds more checks to the same script)

**Interfaces:**
- Produces: `smoothTowards(current: number, target: number, dt: number, tauMs: number): number`, `type Bands = { bass: number; mid: number; high: number }`, `bandsFromFrequencyData(data: Uint8Array, sampleRate: number, fftSize: number): Bands`, `smoothBands(current: Bands, target: Bands, dt: number, tauMs?: number): Bands` from `audio-bands.ts`; `type RGB = [number, number, number]`, `hexToRgb01(hex: string): RGB`, `lerpRgb(current: RGB, target: RGB, dt: number, tauMs?: number): RGB` from `particle-tint.ts`. Task 2 (`audio-analyser.ts`) and Task 3 (`particle-wave-artwork.web.tsx`) consume both.

- [ ] **Step 1: Write `audio-bands.ts`**

```ts
// apps/mobile/src/lib/audio-bands.ts
export type Bands = { bass: number; mid: number; high: number };

export const ZERO_BANDS: Bands = { bass: 0, mid: 0, high: 0 };

/** Exponential smoothing toward a target, frame-rate independent. */
export function smoothTowards(current: number, target: number, dt: number, tauMs: number): number {
  const k = 1 - Math.exp(-dt / tauMs);
  return current + (target - current) * k;
}

function binAverage(data: Uint8Array, from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(data.length, to); i += 1) {
    sum += data[i]!;
    n += 1;
  }
  return n === 0 ? 0 : sum / n / 255;
}

/** Bass (20-160Hz) / mid (160Hz-2kHz) / high (2kHz-8kHz) averages, 0..1, from one AnalyserNode frame. */
export function bandsFromFrequencyData(data: Uint8Array, sampleRate: number, fftSize: number): Bands {
  const binHz = sampleRate / fftSize;
  const binFor = (hz: number) => Math.round(hz / binHz);
  return {
    bass: binAverage(data, binFor(20), binFor(160)),
    mid: binAverage(data, binFor(160), binFor(2000)),
    high: binAverage(data, binFor(2000), binFor(8000)),
  };
}

export function smoothBands(current: Bands, target: Bands, dt: number, tauMs = 120): Bands {
  return {
    bass: smoothTowards(current.bass, target.bass, dt, tauMs),
    mid: smoothTowards(current.mid, target.mid, dt, tauMs),
    high: smoothTowards(current.high, target.high, dt, tauMs),
  };
}
```

- [ ] **Step 2: Write `particle-tint.ts`**

```ts
// apps/mobile/src/lib/particle-tint.ts
export type RGB = [number, number, number];

export function hexToRgb01(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Critically-damped colour crossfade — ~1.8s to settle at the default tauMs. */
export function lerpRgb(current: RGB, target: RGB, dt: number, tauMs = 900): RGB {
  const k = 1 - Math.exp(-dt / tauMs);
  return [current[0] + (target[0] - current[0]) * k, current[1] + (target[1] - current[1]) * k, current[2] + (target[2] - current[2]) * k];
}
```

- [ ] **Step 3: Write the failing test**

```js
// apps/mobile/scripts/verify-audio-reactive-wave.mjs
#!/usr/bin/env node
/**
 * Pure math behind the audio-reactive Late Night Flow wave (Task 1 of the
 * 2026-10-09 UI polish plan): frequency-band extraction/smoothing and the
 * colour-tint crossfade. No DOM/WebGL — real modules via tsx.
 * Usage: npx tsx scripts/verify-audio-reactive-wave.mjs
 */
import { ZERO_BANDS, bandsFromFrequencyData, smoothBands, smoothTowards } from '../src/lib/audio-bands.ts';
import { hexToRgb01, lerpRgb } from '../src/lib/particle-tint.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('smoothTowards moves toward the target, never overshoots', (() => {
  const a = smoothTowards(0, 1, 16, 120);
  return a > 0 && a < 1;
})());
check('smoothTowards converges after many frames', (() => {
  let v = 0;
  for (let i = 0; i < 200; i += 1) v = smoothTowards(v, 1, 16, 120);
  return v > 0.99;
})());

const fftSize = 256;
const sampleRate = 44100;
const bins = new Uint8Array(fftSize / 2);
bins.fill(0);
for (let i = 0; i < 3; i += 1) bins[i] = 255; // low bins = bass
const bassHeavy = bandsFromFrequencyData(bins, sampleRate, fftSize);
check('a bass-heavy spectrum reads high bass, low mid/high', bassHeavy.bass > 0.8 && bassHeavy.mid < 0.1 && bassHeavy.high < 0.1);

const silence = bandsFromFrequencyData(new Uint8Array(fftSize / 2), sampleRate, fftSize);
check('silence reads all-zero bands', silence.bass === 0 && silence.mid === 0 && silence.high === 0);

check('smoothBands decays toward zero bands (pause) and does not jump', (() => {
  let current = { bass: 1, mid: 1, high: 1 };
  current = smoothBands(current, ZERO_BANDS, 16);
  return current.bass < 1 && current.bass > 0;
})());

check('hexToRgb01 parses a known colour', (() => {
  const [r, g, b] = hexToRgb01('#ff7a59');
  return Math.round(r * 255) === 0xff && Math.round(g * 255) === 0x7a && Math.round(b * 255) === 0x59;
})());

check('lerpRgb moves toward the target without overshoot, converges', (() => {
  let c = [0, 0, 0];
  for (let i = 0; i < 400; i += 1) c = lerpRgb(c, [1, 0.5, 0], 16);
  return c[0] > 0.99 && Math.abs(c[1] - 0.5) < 0.01 && c[2] < 0.01;
})());

if (failures > 0) {
  console.error(`\n${failures} audio-reactive-wave check(s) failed.`);
  process.exit(1);
}
console.log('\nAll audio-reactive-wave checks passed.');
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-audio-reactive-wave.mjs`
Expected: FAIL — `Cannot find module '../src/lib/audio-bands.ts'` (files don't exist yet; if Steps 1-2 are done first, skip ahead — this ordering note is for strict TDD only).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-audio-reactive-wave.mjs`
Expected: PASS, "All audio-reactive-wave checks passed."

- [ ] **Step 6: Add the script to the test chain**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-audio-reactive-wave.mjs` to the end of the `"test"` script's command chain (after `verify-particle-wave.mjs`, matching the existing `&&`-joined style), and add a standalone entry: `"verify:audio-reactive-wave": "tsx scripts/verify-audio-reactive-wave.mjs"`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/lib/audio-bands.ts apps/mobile/src/lib/particle-tint.ts apps/mobile/scripts/verify-audio-reactive-wave.mjs apps/mobile/package.json
git commit -m "feat(wave): pure audio-band and tint-crossfade math"
```

---

### Task 2: Web Audio analyser module

**Files:**
- Create: `apps/mobile/src/audio/audio-analyser.ts` (testable core — injectable `AnalyserLike`, mirrors `browser-audio-engine.ts`'s dependency-injection style)
- Create: `apps/mobile/src/audio/audio-analyser.web.ts` (real browser wiring: `AudioContext` singleton tapped onto `#mmusic-audio`)
- Modify: `apps/mobile/scripts/verify-audio-reactive-wave.mjs:1-2` (add the import and new checks)

**Interfaces:**
- Consumes: `smoothBands`, `bandsFromFrequencyData`, `ZERO_BANDS`, `type Bands` from `audio-bands.ts` (Task 1).
- Produces: `type AnalyserLike = { fftSize: number; frequencyBinCount: number; getByteFrequencyData(array: Uint8Array): void }`, `createAudioAnalyser(opts: { analyser: AnalyserLike; sampleRate: number }): { tick(nowMs: number, active: boolean): Bands }` from `audio-analyser.ts`; `getSharedAnalyser(): ReturnType<typeof createAudioAnalyser> | null` from `audio-analyser.web.ts`. Task 3 consumes `getSharedAnalyser`.

- [ ] **Step 1: Write the failing test (appended to `verify-audio-reactive-wave.mjs`)**

Add this import near the top (after the Task 1 imports):

```js
import { createAudioAnalyser } from '../src/audio/audio-analyser.ts';
```

Add these checks before the `if (failures > 0)` block:

```js
class FakeAnalyser {
  fftSize = 256;
  frequencyBinCount = 128;
  nextFrame = new Uint8Array(128);
  getByteFrequencyData(out) {
    out.set(this.nextFrame);
  }
}

(() => {
  const fake = new FakeAnalyser();
  const analyser = createAudioAnalyser({ analyser: fake, sampleRate: 44100 });
  fake.nextFrame.fill(255, 0, 3);
  const first = analyser.tick(0, true);
  check('createAudioAnalyser.tick smooths toward a loud bass frame, never jumps straight to 1', first.bass > 0 && first.bass < 1);
  let last = first;
  for (let i = 1; i < 60; i += 1) last = analyser.tick(i * 16, true);
  check('createAudioAnalyser.tick converges toward the sustained input', last.bass > 0.9);
  const paused = analyser.tick(last && 1000, false);
  check('createAudioAnalyser.tick decays toward zero when inactive (paused)', paused.bass < last.bass);
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-audio-reactive-wave.mjs`
Expected: FAIL — `Cannot find module '../src/audio/audio-analyser.ts'`.

- [ ] **Step 3: Write `audio-analyser.ts`**

```ts
// apps/mobile/src/audio/audio-analyser.ts
import { ZERO_BANDS, bandsFromFrequencyData, smoothBands, type Bands } from '@/lib/audio-bands';

export type AnalyserLike = {
  fftSize: number;
  frequencyBinCount: number;
  getByteFrequencyData(array: Uint8Array): void;
};

export type AudioAnalyserOptions = {
  analyser: AnalyserLike;
  sampleRate: number;
};

/**
 * Wraps a Web Audio AnalyserNode (or a fake, in tests) into smoothed
 * bass/mid/high bands. `active=false` (paused, or the track has no audio)
 * decays the bands toward zero instead of reading the frozen last frame.
 */
export function createAudioAnalyser({ analyser, sampleRate }: AudioAnalyserOptions) {
  const bins = new Uint8Array(analyser.frequencyBinCount);
  let smoothed: Bands = ZERO_BANDS;
  let lastMs = 0;

  return {
    tick(nowMs: number, active: boolean): Bands {
      const dt = lastMs === 0 ? 16 : Math.min(nowMs - lastMs, 100);
      lastMs = nowMs;
      let target: Bands = ZERO_BANDS;
      if (active) {
        analyser.getByteFrequencyData(bins);
        target = bandsFromFrequencyData(bins, sampleRate, analyser.fftSize);
      }
      smoothed = smoothBands(smoothed, target, dt);
      return smoothed;
    },
  };
}
```

- [ ] **Step 4: Write `audio-analyser.web.ts`**

```ts
// apps/mobile/src/audio/audio-analyser.web.ts
import { createAudioAnalyser } from './audio-analyser';

type Analyser = ReturnType<typeof createAudioAnalyser>;

let singleton: Analyser | null = null;
let ctx: AudioContext | null = null;

const GESTURE_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const;

/**
 * Lazily taps a Web Audio AnalyserNode onto the single shared #mmusic-audio
 * element (platform-audio.web.ts) — never a second player. `createMediaElementSource`
 * can only be called once per element ever, so this is a module-level singleton
 * that survives component remounts (Home's banner mounting/unmounting on tab
 * switches must not try to re-tap the element).
 */
export function getSharedAnalyser(): Analyser | null {
  if (singleton) return singleton;
  if (typeof window === 'undefined') return null;
  const media = document.getElementById('mmusic-audio');
  if (!(media instanceof HTMLAudioElement)) return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    const source = ctx.createMediaElementSource(media);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    // Safari mutes the element's own output once it feeds a MediaElementAudioSourceNode
    // unless that graph also reaches destination.
    analyser.connect(ctx.destination);
    singleton = createAudioAnalyser({ analyser, sampleRate: ctx.sampleRate });
    const resume = () => void ctx?.resume();
    GESTURE_EVENTS.forEach((name) => window.addEventListener(name, resume, true));
  } catch (err) {
    console.warn('[audio-analyser]', err);
    return null;
  }
  return singleton;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-audio-reactive-wave.mjs`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors from the two new files.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/audio/audio-analyser.ts apps/mobile/src/audio/audio-analyser.web.ts apps/mobile/scripts/verify-audio-reactive-wave.mjs
git commit -m "feat(wave): Web Audio analyser tapped onto the shared audio element"
```

---

### Task 3: Engine uniforms + wire the web artwork component + Next Track button

**Files:**
- Modify: `apps/mobile/src/components/ui/particle-wave/engine.ts` (shader + `WaveOptions` + `ParticleWave`)
- Modify: `apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx` (consume analyser + palette)
- Modify: `apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.tsx:6-11` (accept the same new props as no-ops, for type parity with the web file)
- Modify: `apps/mobile/src/components/ui/card.tsx` (`FeaturedBannerProps` + footer-layout JSX: Next Track button, pass `trackId`/`playing` through)
- Modify: `apps/mobile/src/app/(tabs)/home/index.tsx:94-118` (wire `next`, `currentTrackId`, `isPlaying` into the banner)
- Test: `apps/mobile/scripts/verify-particle-wave.mjs` (extend — new uniforms must not change the approved particle data/quality-step behaviour)

**Interfaces:**
- Consumes: `getSharedAnalyser` (Task 2), `hexToRgb01`/`lerpRgb` (Task 1), `paletteForTrack` + `type ArtworkPalette` from `@/lib/palette`, `usePlayerStore`'s `next: () => void`, `currentTrackId: () => TrackId | undefined`, `isPlaying: boolean`.
- Produces: `ParticleWaveArtworkProps` gains `trackId?: TrackId; playing?: boolean` (both optional, both already-existing concepts in the store — no new store API). `FeaturedBannerProps` gains `onNextPress?: () => void; trackId?: TrackId`.

- [ ] **Step 1: Write the failing test (extend `scripts/verify-particle-wave.mjs`)**

Add after the existing `nextQuality` section and before `if (failures > 0)`:

```js
import { DEFAULT_TINT } from '../src/components/ui/particle-wave/engine.ts';

check('DEFAULT_TINT is a valid 0..1 RGB triple close to the approved peach', (() => {
  const [r, g, b] = DEFAULT_TINT;
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 && r > g && g > b;
})());
```

(This import will need adding to the top of the file alongside the existing `engine.ts` import — combine into one `import { ..., DEFAULT_TINT } from '../src/components/ui/particle-wave/engine.ts';` line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-particle-wave.mjs`
Expected: FAIL — `DEFAULT_TINT` is not exported yet.

- [ ] **Step 3: Modify `engine.ts` — add the tint/band uniforms to the shader**

In the `VERT` template string, add after the existing `uniform vec3 uCover;` line (around line 60):

```glsl
uniform vec3 uTint;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
```

Change the `amp` line (bass → amplitude/energy):

```glsl
  float amp = env * breath * (1.0 + 0.22 * pulse) * (1.0 + uBass * 0.32);
```

Change the `w1`/`w2` lines (mid → ribbon movement rate):

```glsl
    float w1 = sin(TAU * a1.y * u - a1.z * t * (1.0 + uMid * 0.12) + a1.x);
    float w2 = sin(TAU * a1.y * 2.07 * u + 1.6 * a1.z * t * (1.0 + uMid * 0.12) + a2.z);
```

Change the shard-glint block (high → shimmer) — inside `} else if (kind > 0.5) {`:

```glsl
    } else if (kind > 0.5) {
      // Shards: rare bright glints, like the crystal edges of the artwork.
      col = mix(col, vec3(1.0, 0.92, 0.86), 0.7);
      alpha *= 1.3 * (0.55 + 0.45 * sin(t * 2.3 + a0.w * 30.0)) * (1.0 + uHigh * 0.5);
      size *= 1.9 * (1.0 + uHigh * 0.15);
    }
```

Add the tint crossfade right before the `// Light trails` comment (still inside the `else` branch that computes ribbon/shard/haze colour, so dust is unaffected):

```glsl
    col = mix(col, uTint, 0.35);
```

- [ ] **Step 4: Modify `engine.ts` — extend `WaveOptions`, add `DEFAULT_TINT`, add the reactive-input pull**

Change the `WaveOptions` type (near the top):

```ts
export type WaveOptions = { density: number; speed: number; paused: boolean };

/** Live, per-frame-updated values that don't go through `set()` — see `ReactiveInput`. */
export type ReactiveInput = { tint: [number, number, number]; bass: number; mid: number; high: number };

/** The approved palette's own peach, as the shader's default — a no-op tint when nothing reactive is wired (native, tests, first frame). */
export const DEFAULT_TINT: [number, number, number] = [1, 0.76, 0.64];
```

Add a `reactive` field to the class and a constructor parameter, and read it in `loop()`. Modify the constructor signature:

```ts
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private opts: WaveOptions,
    private readonly onFallback: () => void,
    private readonly getReactive?: () => ReactiveInput,
  ) {
```

Add a `reactive` field initialised to the default, just above the constructor:

```ts
  private reactive: ReactiveInput = { tint: DEFAULT_TINT, bass: 0, mid: 0, high: 0 };
```

In `loop()`, pull fresh reactive values once per frame, right before `this.draw()`:

```ts
  private loop = (now: number) => {
    const ms = now - this.last;
    const dt = Math.min(ms, 50) / 1000;
    this.last = now;
    this.time += dt * this.opts.speed;
    if (this.getReactive) this.reactive = this.getReactive();
    this.draw();
    ...
```

In `draw()`, set the four new uniforms alongside the existing `uCover`/`uRes`/`uTime` (right after that block, before `gl.enable(gl.BLEND)`):

```ts
    gl.uniform3f(gl.getUniformLocation(p, 'uTint'), ...this.reactive.tint);
    gl.uniform1f(gl.getUniformLocation(p, 'uBass'), this.reactive.bass);
    gl.uniform1f(gl.getUniformLocation(p, 'uMid'), this.reactive.mid);
    gl.uniform1f(gl.getUniformLocation(p, 'uHigh'), this.reactive.high);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-particle-wave.mjs`
Expected: PASS, including every pre-existing check (particle count/determinism/quality-step behaviour untouched).

- [ ] **Step 6: Modify `particle-wave-artwork.tsx` (native) — accept the new props as no-ops**

```ts
// apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.tsx
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import type { TrackId } from '@/mocks';

export type ParticleWaveArtworkProps = {
  uri: LocalOrRemoteImage;
  /** Web only (the particle wave pauses); ignored here. */
  paused?: boolean;
  /** Web only (audio-reactive colour); ignored here. */
  trackId?: TrackId;
  /** Web only (audio-reactive bands); ignored here. */
  playing?: boolean;
};

export function ParticleWaveArtwork({ uri }: ParticleWaveArtworkProps) {
  return <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
}
```

- [ ] **Step 7: Modify `particle-wave-artwork.web.tsx` — wire the analyser and palette**

```ts
// apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getSharedAnalyser } from '@/audio/audio-analyser.web';
import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { hasDemoAudio } from '@/audio/demo-audio';
import { paletteForTrack } from '@/lib/palette';
import { hexToRgb01, lerpRgb, type RGB } from '@/lib/particle-tint';
import type { TrackId } from '@/mocks';
import { getTrackById } from '@/mocks';

import { APPROVED_DENSITY, APPROVED_SPEED, DEFAULT_TINT, ParticleWave, type ReactiveInput } from './engine';

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
      const analyser = active ? getSharedAnalyser() : null;
      const bands = analyser ? analyser.tick(now, true) : { bass: 0, mid: 0, high: 0 };
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
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </View>
  );
}
```

- [ ] **Step 8: Modify `card.tsx` — add the Next Track button to the footer layout**

Add `IconButton` to the existing `Icon`/`AnimatedIcon` import block (near the top of `card.tsx`):

```ts
import { Icon } from './icon';
import { IconButton } from './button';
import { AnimatedIcon } from './animated-icon';
```

Extend `FeaturedBannerProps` (after the existing `active` field):

```ts
  /** 'footer' layout only — the artwork's own track, for audio-reactive colour/bands. */
  trackId?: string;
  /** 'footer' layout only — shows a secondary skip-next button next to Play/Pause. */
  onNextPress?: () => void;
```

Update the function signature to destructure the two new props:

```ts
export function FeaturedBanner({ coverUri, title, subtitle, height, layout = 'overlay', onPlayPress, onPress, animated = false, paused = false, active = false, trackId, onNextPress, style }: FeaturedBannerProps) {
```

Pass `trackId`/`playing` into `ParticleWaveArtwork` (inside the `layout === 'footer'` branch, replacing the existing call):

```tsx
              <ParticleWaveArtwork uri={coverUri} paused={paused} trackId={trackId} playing={active} />
```

Add the Next button next to the existing play button, inside `footerBannerFooter`, right after the `{onPlayPress && (...)}` block closes:

```tsx
          {onNextPress && (
            <IconButton
              variant="surface"
              icon="skip-next"
              size={44}
              accessibilityLabel="Next track"
              onPress={onNextPress}
              style={cardStyles.footerBannerNextButton}
            />
          )}
```

Add the style (inside `cardStyles`, near `footerBannerPlayButton`):

```ts
  footerBannerNextButton: {
    flexShrink: 0,
  },
```

- [ ] **Step 9: Modify `home/index.tsx` — wire `next`/`currentTrackId`/`trackId` into the banner**

Add `next` to the existing `usePlayerStore` destructuring near the top of `HomeScreen` (alongside `play`, `togglePlayPause`):

```ts
  const next = usePlayerStore((s) => s.next);
```

Update the `<FeaturedBanner>` call (inside the `{hero && (...)}` block) to pass the two new props:

```tsx
            <FeaturedBanner
              layout="footer"
              animated
              paused={!homeFocused}
              active={heroPlaying}
              title={hero.title}
              subtitle={hero.curator}
              coverUri={hero.coverUri}
              height={224}
              trackId={heroInPlayer ? currentTrackId : hero.trackIds?.[0]}
              onNextPress={heroInPlayer ? next : undefined}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: hero.id } })}
              onPlayPress={() => {
                if (heroInPlayer) {
                  togglePlayPause();
                  return;
                }
                const trackIds = hero.trackIds;
                if (trackIds && trackIds.length > 0) play(trackIds[0]!, trackIds);
              }}
            />
```

(`onNextPress` is only wired once the hero playlist is actually the thing playing — matches "Add a Next Track button... Use the existing player store and next-track logic" without offering Next on a playlist that isn't loaded into the player yet, which `next()` can't meaningfully act on.)

- [ ] **Step 10: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/src/components/ui/particle-wave/engine.ts apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.tsx apps/mobile/src/components/ui/card.tsx "apps/mobile/src/app/(tabs)/home/index.tsx" apps/mobile/scripts/verify-particle-wave.mjs
git commit -m "feat(wave): audio-reactive Particle Wave B, track-colour crossfade, Next Track button"
```

---

### Task 4: Nav-pill transitions — animated active-tab indicator + icon transition

**Files:**
- Modify: `apps/mobile/src/components/nav/floating-tab-bar.tsx`

**Interfaces:**
- Consumes: existing `pillSinkOffset` (`@/lib/stage-rules`), `expandOrigin`/`expandProgress` (`@/state/player-surface`) — unchanged, composed alongside the new indicator style.
- Produces: no new exports; purely internal animation state.

- [ ] **Step 1: Add the sliding indicator's layout tracking**

Modify `floating-tab-bar.tsx`: add `useEffect`/`useRef`/`useState` to the React import, and `useSharedValue`/`withTiming` to the reanimated import:

```ts
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
```

Inside `FloatingTabBar`, after the existing `sinkStyle` block, add:

```ts
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const layouts = useRef<Record<number, { x: number; width: number }>>({});
  const [ready, setReady] = useState(false);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
    opacity: ready ? 1 : 0,
  }));

  const measure = (index: number, x: number, width: number) => {
    layouts.current[index] = { x, width };
    if (index === state.index) {
      indicatorX.value = x;
      indicatorW.value = width;
      setReady(true);
    }
  };

  useEffect(() => {
    const box = layouts.current[state.index];
    if (!box) return;
    if (reduceMotion) {
      indicatorX.value = box.x;
      indicatorW.value = box.width;
    } else {
      indicatorX.value = withTiming(box.x, { duration: 220 });
      indicatorW.value = withTiming(box.width, { duration: 220 });
    }
  }, [state.index, reduceMotion]);
```

- [ ] **Step 2: Render the indicator and wire `onLayout` on each tab item**

Add the indicator as the first child inside `Animated.View style={[styles.pill, sinkStyle]}` (before `state.routes.map(...)`):

```tsx
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
```

Add `onLayout` to the existing `<PressableScale>` per tab item (inside the `.map`, alongside the existing props):

```tsx
              onLayout={(e) => measure(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
```

- [ ] **Step 3: Add the subtle icon transition**

Replace the existing icon line:

```tsx
              {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
```

with:

```tsx
              <TabIcon focused={focused} reduceMotion={reduceMotion}>
                {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
              </TabIcon>
```

Add the small helper component below `FloatingTabBar` (before `const styles = StyleSheet.create`):

```tsx
function TabIcon({ focused, reduceMotion, children }: { focused: boolean; reduceMotion: boolean; children: ReactNode }) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  useEffect(() => {
    scale.value = reduceMotion ? (focused ? 1 : 0.92) : withTiming(focused ? 1 : 0.92, { duration: 180 });
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 0.75 + scale.value * 0.25 }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
```

- [ ] **Step 4: Add the indicator's style**

Add to `styles` (`StyleSheet.create` at the bottom of the file), alongside `pill`/`item`:

```ts
  indicator: {
    position: 'absolute',
    left: Spacing.xs,
    top: 4,
    bottom: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
  },
```

- [ ] **Step 5: Typecheck, lint, and manual verification**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

Run the app (`cd apps/mobile && npx expo start --web --port 8092`), open Home, and tap Search then Library then Home repeatedly: the indicator should glide between tabs, icons should settle with a small scale pop, and — with the OS/browser's reduced-motion setting on — both must snap instantly with no animation. Confirm the pill's size, position, colours, and icons are pixel-identical to before (only the indicator and icon-scale are new).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/nav/floating-tab-bar.tsx
git commit -m "feat(nav): animated active-tab indicator and icon transition on the floating pill"
```

---

### Task 5: Soft content entrance animation on tab switch

**Files:**
- Create: `apps/mobile/src/hooks/use-tab-entrance.ts`
- Modify: `apps/mobile/src/app/(tabs)/home/index.tsx` (wrap the `ScrollView` in the entrance style)
- Modify: `apps/mobile/src/app/(tabs)/search/index.tsx` (same)
- Modify: `apps/mobile/src/app/(tabs)/library/index.tsx` (same)

**Interfaces:**
- Produces: `useTabEntrance(): { style: AnimatedStyle }` — call once per tab-root screen.

**Note on approach:** expo-router's `Tabs` keeps each tab's screen mounted after first visit (it hides, not unmounts), so a Reanimated `entering={...}` prop — which only fires on mount — would not replay on every switch. `useTabEntrance` instead drives a shared value from `useFocusEffect` (the same focus-tracking idiom `home/index.tsx` already uses for `homeFocused`), so it replays on every tab focus, including the browser back/forward button — preserving "browser history and navigation behavior" exactly, since no navigation/routing code is touched.

- [ ] **Step 1: Write `use-tab-entrance.ts`**

```ts
// apps/mobile/src/hooks/use-tab-entrance.ts
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Fades/slides a tab root screen's content in on every focus (not just mount —
 * expo-router's Tabs keep each screen mounted after first visit, so `entering`
 * props only fire once). Spread the returned style onto the screen's outer
 * content wrapper, e.g. `<Animated.View style={[styles.flex, useTabEntrance().style]}>`.
 */
export function useTabEntrance() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        progress.value = 1;
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, { duration: 260 });
    }, [reduceMotion, progress]),
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return { style };
}
```

- [ ] **Step 2: Wire it into `home/index.tsx`**

Add the import:

```ts
import Animated from 'react-native-reanimated';

import { useTabEntrance } from '@/hooks/use-tab-entrance';
```

Inside `HomeScreen`, call the hook (near the other hooks, e.g. right after `const { showToast, toast } = useToast();`):

```ts
  const entrance = useTabEntrance();
```

Replace the `<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>` opening tag (keep its existing children and closing `</ScrollView>` untouched) by wrapping it:

```tsx
      <Animated.View style={[styles.flex, entrance.style]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ...existing children, unchanged... */}
        </ScrollView>
      </Animated.View>
```

(`styles.flex` already exists in this file's `StyleSheet.create` — reuse it; it's `{ flex: 1 }`.)

- [ ] **Step 3: Wire it into `search/index.tsx`**

Same pattern: import `Animated` from `'react-native-reanimated'` and `useTabEntrance` from `'@/hooks/use-tab-entrance'`, call `const entrance = useTabEntrance();` near the screen's other hooks, and wrap the screen's main `ScrollView` (or outermost scrollable content directly under the top `<ThemedView surface="canvas" style={styles.flex}>`) in `<Animated.View style={[styles.flex, entrance.style]}>...</Animated.View>`. Use that file's own existing `styles.flex` if present, otherwise add `flex: { flex: 1 }` to its `StyleSheet.create`.

- [ ] **Step 4: Wire it into `library/index.tsx`**

Same pattern as Step 3.

- [ ] **Step 5: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

Run `cd apps/mobile && npx expo start --web --port 8092`, switch Home → Search → Library → Home repeatedly: each screen's content should softly fade/slide up on every arrival, not just the first. Enable reduced-motion in the OS/browser and confirm content appears instantly with no animation. Confirm no layout shift or flash of unstyled background (the `ThemedView` background must still paint immediately, only its content fades).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/hooks/use-tab-entrance.ts "apps/mobile/src/app/(tabs)/home/index.tsx" "apps/mobile/src/app/(tabs)/search/index.tsx" "apps/mobile/src/app/(tabs)/library/index.tsx"
git commit -m "feat(nav): soft content entrance animation on every tab focus"
```

---

### Task 6: Fix frozen mood-card motion on web (CSS-driven replacement)

**Files:**
- Create: `apps/mobile/src/components/ui/mood-visual.web.tsx` (CSS `@keyframes`-driven replacement; native `mood-visual.tsx` is untouched and keeps using Reanimated)
- Test: manual (see Step 4 — this is presentational motion; the existing `verify-home-ui.mjs`/other scripts don't cover `mood-visual.tsx` today and this plan doesn't add DOM testing infra for it)

**Interfaces:**
- Produces: same public shape as the existing `mood-visual.tsx` — `export type MoodVisualKind = 'moon' | 'rain' | 'energy' | 'flow'` and `export function MoodVisual({ kind, color }: { kind: MoodVisualKind; color: string })` — so `card.tsx`'s `import { MoodVisual, type MoodVisualKind } from './mood-visual'` resolves to this file on web (Metro's platform extension resolution) with zero call-site changes.

- [ ] **Step 1: Write `mood-visual.web.tsx`**

```tsx
// apps/mobile/src/components/ui/mood-visual.web.tsx
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type MoodVisualKind = 'moon' | 'rain' | 'energy' | 'flow';

const W = 64;
const H = 58;

let keyframesInjected = false;

/**
 * Web replacement for mood-visual.tsx: the Reanimated `withRepeat` loops used
 * there were confirmed (live DOM inspection, 2026-10-09) to render one frame
 * and then freeze on the web export — every element's inline transform/opacity
 * was byte-identical across a 4+ second poll. CSS @keyframes animate via the
 * browser's own compositor, independent of Reanimated's web driver, and
 * `@media (prefers-reduced-motion: reduce)` disables them natively.
 */
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes mmusic-moon-bob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
    @keyframes mmusic-twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
    @keyframes mmusic-rain-fall { 0% { transform: translateY(-${H}px); } 100% { transform: translateY(0); } }
    @keyframes mmusic-energy-pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.8; } }
    @keyframes mmusic-flow-glide { 0% { transform: translateX(0); } 100% { transform: translateX(-${W}px); } }
    @media (prefers-reduced-motion: reduce) {
      .mmusic-moon-bob, .mmusic-twinkle, .mmusic-rain-fall, .mmusic-energy-pulse, .mmusic-flow-glide { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

export function MoodVisual({ kind, color }: { kind: MoodVisualKind; color: string }) {
  useEffect(ensureKeyframes, []);
  return (
    <View pointerEvents="none" style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === 'moon' && <Moon color={color} />}
      {kind === 'rain' && <Rain color={color} />}
      {kind === 'energy' && <Energy color={color} />}
      {kind === 'flow' && <Flow color={color} />}
    </View>
  );
}

function Moon({ color }: { color: string }) {
  const id = useId();
  return (
    <>
      <div className="mmusic-moon-bob" style={{ position: 'absolute', inset: 0 }}>
        <Svg width={W} height={H}>
          <Circle cx={38} cy={30} r={14} fill={color} opacity={0.55} />
          <Circle cx={45} cy={24} r={13} fill={Colors.surface.l2} />
        </Svg>
      </div>
      <Star x={12} y={12} size={3} color={color} delay={0} id={`${id}-0`} />
      <Star x={20} y={40} size={2} color={color} delay={0.9} id={`${id}-1`} />
      <Star x={56} y={50} size={2} color={color} delay={1.7} id={`${id}-2`} />
    </>
  );
}

function Star({ x, y, size, color, delay, id }: { x: number; y: number; size: number; color: string; delay: number; id: string }) {
  return (
    <div
      key={id}
      className="mmusic-twinkle"
      style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, animationDelay: `${delay}s` }}
    />
  );
}

const RAIN_STREAKS = [
  { x: 12, y: 6 },
  { x: 24, y: 30 },
  { x: 36, y: 12 },
  { x: 48, y: 40 },
  { x: 58, y: 20 },
  { x: 18, y: 48 },
];

function Rain({ color }: { color: string }) {
  return (
    <div className="mmusic-rain-fall" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H * 2 }}>
      <Svg width={W} height={H * 2}>
        {[0, H].flatMap((offset) =>
          RAIN_STREAKS.map((streak, index) => (
            <Line key={`${offset}-${index}`} x1={streak.x} y1={streak.y + offset} x2={streak.x - 3} y2={streak.y + offset + 10} stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
          )),
        )}
      </Svg>
    </div>
  );
}

const ENERGY_STREAKS = [
  { left: 8, top: 26, delay: 0 },
  { left: 26, top: 13, delay: 0.26 },
  { left: 44, top: 0, delay: 0.52 },
];

function Energy({ color }: { color: string }) {
  return (
    <>
      {ENERGY_STREAKS.map((streak, index) => (
        <div key={index} className="mmusic-energy-pulse" style={{ position: 'absolute', left: streak.left, top: streak.top, animationDelay: `${streak.delay}s` }}>
          <Svg width={18} height={40}>
            <Polygon points="12,0 18,0 6,40 0,40" fill={color} />
          </Svg>
        </div>
      ))}
    </>
  );
}

function wavePath(baseline: number, amplitude: number): string {
  const points: string[] = [];
  for (let x = 0; x <= W * 2; x += 4) {
    const y = baseline + Math.sin((x / W) * Math.PI * 2) * amplitude;
    points.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

const WAVES = [
  { path: wavePath(20, 4), opacity: 0.35 },
  { path: wavePath(32, 6), opacity: 0.6 },
  { path: wavePath(44, 4), opacity: 0.35 },
];

function Flow({ color }: { color: string }) {
  return (
    <div className="mmusic-flow-glide" style={{ position: 'absolute', left: 0, top: 0, width: W * 2, height: H }}>
      <Svg width={W * 2} height={H}>
        {WAVES.map((wave, index) => (
          <Path key={index} d={wave.path} stroke={color} strokeWidth={1.6} fill="none" opacity={wave.opacity} strokeLinecap="round" />
        ))}
      </Svg>
    </div>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: W,
    height: H,
    overflow: 'hidden',
    opacity: 0.7,
  },
});
```

The four `animation-name`/`duration`/`timing-function`/`iteration-count` properties are declared once, in the injected `<style>` block, via matching class selectors (`.mmusic-moon-bob` etc. — add these declarations to the `style.textContent` template in `ensureKeyframes`, alongside the existing `@keyframes`):

```css
.mmusic-moon-bob { animation: mmusic-moon-bob 5s ease-in-out infinite; }
.mmusic-twinkle { animation: mmusic-twinkle 2.4s ease-in-out infinite; }
.mmusic-rain-fall { animation: mmusic-rain-fall 2.6s linear infinite; }
.mmusic-energy-pulse { animation: mmusic-energy-pulse 0.9s ease-in-out infinite; }
.mmusic-flow-glide { animation: mmusic-flow-glide 4.8s linear infinite; }
```

(Only `animation-delay` stays inline per-instance, as shown in `Star`/`Energy` above.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors. (Raw `<div>` inside a `.tsx` file targeting react-native-web is valid — the existing codebase's web-only files already render DOM elements where needed, e.g. `<canvas>` in `particle-wave-artwork.web.tsx`; if `tsc` complains about the DOM lib, confirm `apps/mobile/tsconfig.json` already includes `"dom"` in `lib` — it must, since `particle-wave-artwork.web.tsx` already uses `HTMLCanvasElement`/`document` today.)

- [ ] **Step 3: Lint**

Run: `cd apps/mobile && npx expo lint`
Expected: no new errors.

- [ ] **Step 4: Manual verification — confirm the freeze is actually fixed**

Run `cd apps/mobile && npx expo start --web --port 8092`, open Home, scroll to Mood & Vibe Mixes, and in the browser console run:

```js
const a = [...document.querySelectorAll('.mmusic-moon-bob, .mmusic-twinkle, .mmusic-rain-fall, .mmusic-energy-pulse, .mmusic-flow-glide')].map(e => getComputedStyle(e).transform + getComputedStyle(e).opacity);
await new Promise(r => setTimeout(r, 1500));
const b = [...document.querySelectorAll('.mmusic-moon-bob, .mmusic-twinkle, .mmusic-rain-fall, .mmusic-energy-pulse, .mmusic-flow-glide')].map(e => getComputedStyle(e).transform + getComputedStyle(e).opacity);
JSON.stringify(a) !== JSON.stringify(b); // must be true now
```

Expected: `true` — the moon should visibly bob, stars twinkle, rain fall, energy bolts pulse, and flow waves glide, continuously. Re-run the same check with the OS/browser's reduced-motion setting enabled and confirm the cards are static (no animation) in that mode.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/ui/mood-visual.web.tsx
git commit -m "fix(home): mood-card motion was frozen on web — replace with CSS-driven animation"
```

---

### Task 7: Fix the rounded-corner clipping bug (Safari/WebKit)

**Files:**
- Modify: `apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx` (give the canvas and its wrapper their own matching radius — strongest match, see investigation record)
- Modify: `apps/mobile/src/components/ui/card.tsx` (defensive matching radius on every `Image`-in-rounded-card site: `coverBase`, `banner`, `footerBannerImage`, `avatar`, and `quickTileStyles.cover`)

**Interfaces:** none — purely style-level; no prop/type changes.

- [ ] **Step 1: Fix the particle-wave canvas (primary target)**

Modify `particle-wave-artwork.web.tsx`'s return JSX (from Task 3's version) to carry an explicit radius matching the card system's `Radii.lg` (the value `footerBannerWrap` already uses) directly on both the wrapping `View` and the `<canvas>` itself:

```tsx
import { Radii } from '@/constants/theme';
```

```tsx
  if (fallback) return <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg, overflow: 'hidden' }]} pointerEvents="none">
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderRadius: Radii.lg }}
      />
    </View>
  );
```

(`footerBannerWrap`'s own `overflow:hidden`+`borderRadius: Radii.lg` in `card.tsx` is unchanged — this is a redundant second clip directly on the GPU-composited element, which is a no-op in Chrome/native since the radius values match exactly, and gives Safari the clip it was missing.)

- [ ] **Step 2: Fix `CoverCard`'s cover `Image` (`coverBase`)**

Modify `card.tsx`: the `Image` inside `CoverCard`'s `cover` View currently is `<Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" />`. Change its `style` to also carry the matching radius:

```tsx
      {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={[StyleSheet.absoluteFill, { borderRadius: Radii.md }]} contentFit="cover" /> : <CoverFallback seed={title} />}
```

(`Radii.md` matches `cardStyles.coverBase.borderRadius`.)

- [ ] **Step 3: Fix `FeaturedBanner`'s overlay-layout `Image` (`banner`)**

In the `layout === 'overlay'` return of `FeaturedBanner`, change:

```tsx
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} iconSize={36} />}
```

to:

```tsx
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]} contentFit="cover" /> : <CoverFallback seed={title} iconSize={36} />}
```

(`Radii.lg` matches `cardStyles.banner.borderRadius`.)

- [ ] **Step 4: Fix `FeaturedBanner`'s footer-layout plain `Image` fallback (non-animated case)**

In the `layout === 'footer'` branch, the non-animated `Image` branch currently reads:

```tsx
              <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" />
```

Change to:

```tsx
              <Image source={toImageSource(coverUri)} style={[StyleSheet.absoluteFill, { borderRadius: Radii.lg }]} contentFit="cover" />
```

- [ ] **Step 5: Fix `AvatarCard`'s circular `Image`**

The `AvatarCard` `Image` already sets `borderRadius: size / 2` inline (confirmed in the current file) — no change needed there; it already has the defensive radius pattern this task is adding everywhere else. Leave as-is.

- [ ] **Step 6: Fix `QuickTile`'s cover `Image`**

Change:

```tsx
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CoverFallback seed={title} iconSize={18} />}
```

to:

```tsx
        {coverUri && hydrated ? <Image source={toImageSource(coverUri)} style={[StyleSheet.absoluteFill, { borderRadius: Radii.DEFAULT }]} contentFit="cover" /> : <CoverFallback seed={title} iconSize={18} />}
```

(`quickTileStyles.cover` has no explicit `borderRadius` of its own — it relies on `quickTileStyles.row`'s `borderRadius: Radii.DEFAULT` + `overflow:'hidden'` on the parent; `Radii.DEFAULT` is the matching value.)

- [ ] **Step 7: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 8: Verify the fix is a no-op in Chrome (regression check)**

Run `cd apps/mobile && npx expo start --web --port 8092`, open Home, and screenshot the hero banner, Trending Now cards, and For You tiles' corners before and after this task's changes (the "before" state is whatever was captured during the plan's live investigation, described above). They must be pixel-identical in Chrome — this task only adds a second, redundant clip with the same radius value, so Chrome (which already clips correctly) shows no difference. Real confirmation that Safari's artifact is gone requires testing in Safari/an iPhone, which the user does themselves per their own workflow step 6 ("Test in iPhone-sized WebKit").

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx apps/mobile/src/components/ui/card.tsx
git commit -m "fix(cards): clip rounded-corner images/canvas directly, not just their parent (Safari overflow+radius bug)"
```

---

### Task 8: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `cd apps/mobile && npm test`
Expected: every `verify-*.mjs` script passes, including the two new/extended ones from Tasks 1-3.

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: clean.

- [ ] **Step 3: Production build**

Run: `cd apps/mobile && npm run build:web`
Expected: succeeds (same command the Vercel deploy already uses — confirms the new `.web.tsx` files and shader changes survive the Expo static export, not just the dev server).

- [ ] **Step 4: iPhone-sized WebKit smoke test**

Run `cd apps/mobile && node scripts/serve-web.mjs dist` (serves the production build), open it at an iPhone 15 viewport (390×844) the same way the prior "Complete WebKit Integration Validation" pass in project history did, and walk through:
- Home: Late Night Flow banner shows the particle wave at the same shape/speed as before; tap Play, confirm bass/mid/high visibly (subtly) animate the wave only while `midnight-mirage` or `horizon` is the playing track, and confirm Next Track advances the queue; confirm a track with no demo audio shows zero audio-reactivity (not a fake pulse).
- Mood & Vibe Mixes: all four cards show continuous, non-frozen motion (moon bob + twinkle, rain fall, energy pulse, flow glide).
- Nav pill: tap Home/Search/Library repeatedly — indicator slides, icons transition, each screen's content softly enters; confirm the URL/back button still works (browser history untouched).
- Corner-clipping: the artwork cards' bottom corners (hero banner, Trending Now, New Releases, For You) show clean rounded corners with no rectangular sliver, including in Safari specifically.

- [ ] **Step 5: Report to the user and wait**

Summarize (do not commit, do not push, do not deploy yet): files changed per task, the mood-visual freeze root-cause finding, the Web Audio feasibility confirmation, Lottie-unavailable fallback decision, test results from Steps 1-3, and the exact local URL from Step 4. Stop here and wait for the user's explicit visual approval.

- [ ] **Step 6: Run the deferred commits, only after approval**

Once (and only once) the user approves, run the seven commits that were written but not executed in Tasks 1-7, in order:

```bash
git add apps/mobile/src/lib/audio-bands.ts apps/mobile/src/lib/particle-tint.ts apps/mobile/scripts/verify-audio-reactive-wave.mjs apps/mobile/package.json
git commit -m "feat(wave): pure audio-band and tint-crossfade math"

git add apps/mobile/src/audio/audio-analyser.ts apps/mobile/src/audio/audio-analyser.web.ts apps/mobile/scripts/verify-audio-reactive-wave.mjs
git commit -m "feat(wave): Web Audio analyser tapped onto the shared audio element"

git add apps/mobile/src/components/ui/particle-wave/engine.ts apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.tsx apps/mobile/src/components/ui/card.tsx "apps/mobile/src/app/(tabs)/home/index.tsx" apps/mobile/scripts/verify-particle-wave.mjs
git commit -m "feat(wave): audio-reactive Particle Wave B, track-colour crossfade, Next Track button"

git add apps/mobile/src/components/nav/floating-tab-bar.tsx
git commit -m "feat(nav): animated active-tab indicator and icon transition on the floating pill"

git add apps/mobile/src/hooks/use-tab-entrance.ts "apps/mobile/src/app/(tabs)/home/index.tsx" "apps/mobile/src/app/(tabs)/search/index.tsx" "apps/mobile/src/app/(tabs)/library/index.tsx"
git commit -m "feat(nav): soft content entrance animation on every tab focus"

git add apps/mobile/src/components/ui/mood-visual.web.tsx
git commit -m "fix(home): mood-card motion was frozen on web — replace with CSS-driven animation"

git add apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx apps/mobile/src/components/ui/card.tsx
git commit -m "fix(cards): clip rounded-corner images/canvas directly, not just their parent (Safari overflow+radius bug)"
```

Still do not push and do not deploy — those remain separate, explicit asks per this project's standing deployment-safety rule.
