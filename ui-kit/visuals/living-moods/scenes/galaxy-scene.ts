import { bindPositionAttribute, createFullscreenTriangle, program } from '../gl-utils';
import type { PointerInput } from '../types';
import { WebGLSceneController } from '../webgl-scene-controller';

/** Minimal vertex shader — like `meta-balls-scene.ts`/`orb-scene.ts`, the
 * fragment shader builds its own UV from `gl_FragCoord`, so no `varying`
 * needs to cross the rasterizer. */
const VERTEX_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Loop bound for the per-layer depth sweep — must be a compile-time
 * constant in GLSL ES 1.00 (the dialect this version-less shader runs as
 * even under a WebGL2 context, same as `liquid-chrome-scene.ts`/
 * `orb-scene.ts`). `uLayers` (a real uniform, tuned per card/expanded like
 * `liquid-chrome-scene.ts`'s `CARD_TUNING`/`EXPANDED_TUNING`) breaks the
 * loop early, the same pattern reactbits.dev's own Galaxy reference uses for
 * its `uLayers`/`MAX_LAYERS` pair. */
const MAX_LAYERS = 6;

/** Fragment shader adapts reactbits.dev's Galaxy — a single-pass particle
 * field (3x3 jittered-cell stars per layer, swept through `uDepth` for a
 * near/far parallax, pointer/idle repulsion via a `pushCells`/`spread`
 * falloff) — with deliberate departures from the reference, since the brief
 * explicitly warns against "visually noisy starfields":
 * (1) the reference's multi-program `PALETTE`/`REPEL`/`WARP` `#define`
 * variant system (compiled on demand, swapped per interaction state) is
 * dropped — this scene always wants repulsion (`uRepelAt`/`uRepelStrength`
 * are blended idle-vs-active in TS instead, see `onFrame`), never wants the
 * click-triggered `WARP` stretch (no click input to trigger it from, and the
 * brief asks for calm/cinematic, not a warp-speed burst), and never wants
 * `starColors`/light-mode — one fixed shader variant halves the mental
 * surface area here with no loss the brief cares about;
 * (2) the reference's awkward atan-based per-star hue derivation (random
 * base RGB → hue extracted via `atan`, then globally rotated by
 * `uHueShift`) is replaced by directly sampling HSV around `uHueShift` with
 * small per-star jitter — the same "varied but cohesive" effect, but the
 * hue family (coral/amber, not generic blue-white) is then a single
 * uniform to tune and confirm live, not an emergent side effect of unrelated
 * hashed numbers;
 * (3) the reference's second 45°-rotated flare-ray pass is dropped — one
 * ray pass on only the largest few stars already reads as a flare without
 * doubling that cost on every cell;
 * (4) a slow overall field rotation (`uAngle`, this scene's own addition,
 * not in the reference) stands in for the brief's "camera-like framing" ask
 * instead of the reference's static `uRotation` tilt — a slowly turning
 * frame is what makes the parallax read as cinematic drift rather than a
 * fixed vantage point with stars merely scrolling toward camera. */
const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform float uDepth;
uniform float uAngle;
uniform float uDensity;
uniform int uLayers;
uniform float uGlow;
uniform float uHueShift;
uniform float uSaturation;
uniform float uTwinkleIntensity;
uniform float uTwinkleTime;
uniform vec2 uRepelAt;
uniform float uRepelStrength;
uniform vec3 uBgCenter;
uniform vec3 uBgEdge;

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  return 2.0 * tri(x) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare, float invReach) {
  float d = max(length(uv), 0.0008);
  float m = uGlow / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 900.0));
  m += rays * flare * 0.6;
  m *= 1.0 - smoothstep(0.2, 1.0, d * invReach);
  return m;
}

vec3 StarLayer(vec2 uv, vec2 repelAt, float pushCells, float spread) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float flareSize = smoothstep(0.92, 1.0, size);

      vec2 pad = (vec2(tri(seed * 34.0 + uDepth * 1.3), tri(seed * 38.0 + uDepth * 1.7)) - 0.5) * 0.12;

      vec2 away = si + 0.5 + pad - repelAt;
      float dist = length(away);
      float q = dist * spread;
      float cells = pushCells * exp(-q * q);
      float moved = cells * inversesqrt(1.0 + cells * cells * 2.78);
      vec2 shift = away * (moved / max(dist, 0.0001));
      float invReach = 1.0 / max(1.0 - moved, 0.05);

      float star = Star(gv - offset - pad - shift, flareSize, invReach);
      float twinklePhase = trisn(uTwinkleTime + seed * 6.2831) * 0.5 + 1.0;
      float twinkle = mix(1.0, twinklePhase, uTwinkleIntensity);

      float hueJitter = (Hash21(si + 9.0) - 0.5) * 0.12;
      float hue = fract(uHueShift / 360.0 + hueJitter);
      float sat = clamp(uSaturation * (0.65 + Hash21(si + 11.0) * 0.35), 0.0, 1.0);
      float val = 0.6 + size * 0.4;
      vec3 base = hsv2rgb(vec3(hue, sat, val));

      col += star * twinkle * size * base;
    }
  }
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  mat2 rot = mat2(ca, -sa, sa, ca);
  uv = rot * uv;
  vec2 repelAt = rot * uRepelAt;

  vec3 col = vec3(0.0);
  float layers = float(uLayers);
  for (int k = 0; k < ${MAX_LAYERS}; k++) {
    if (k >= uLayers) break;
    float i = float(k) / layers;
    float depthFrac = fract(i + uDepth);
    float scale = mix(20.0 * uDensity, 0.6 * uDensity, depthFrac);
    float fade = depthFrac * (1.0 - smoothstep(0.85, 1.0, depthFrac));
    vec2 offset = vec2(i * 523.71);
    float spread = 1.0 / (scale * 0.2);
    float pushCells = uRepelStrength * scale * 0.05;
    col += StarLayer(uv * scale + offset, repelAt * scale + offset, pushCells, spread) * fade;
  }

  float alpha = clamp(smoothstep(0.0, 0.32, length(col)), 0.0, 1.0);
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  float vign = 1.0 - smoothstep(0.05, 0.95, length(screenUv - 0.5));
  vec3 bg = mix(uBgEdge, uBgCenter, vign);
  gl_FragColor = vec4(mix(bg, col, alpha), 1.0);
}
`;

/** Background matches this card's own placeholder gradient in
 * `dev-living-moods.tsx` (`['#0a0e16', '#162038']`) — a cool, near-black
 * deep-space navy, deliberately distinct from the other three scenes' warm
 * canvas tones, so the stars' warm coral/amber coloring (below) reads as a
 * clear foreground/background contrast rather than blending into the
 * backdrop. */
const BG_CENTER: readonly [number, number, number] = [0.0863, 0.1255, 0.2196]; // #162038
const BG_EDGE: readonly [number, number, number] = [0.0392, 0.0549, 0.0863]; // #0a0e16

/** Star hue family — tuned toward Mmusic's coral/amber accent range (the
 * app's primary `#FF4B4B` sits at hue ~0°, its tertiary `#FF7A59` at ~14°,
 * its amber `#F5A623` at ~36°) rather than the reference's generic
 * blue-white starfield. 18° centers the per-star ±~22° jitter (see the
 * shader's `hueJitter`) between coral and amber, so most stars land
 * somewhere in that family rather than drifting toward yellow or magenta.
 * Saturation is deliberately below the reference's own typical range —
 * confirmed live — so the color reads as a warm tint on each star's glow
 * rather than solid saturated dots, which is what kept an early pass
 * reading as "a bag of candy" instead of starlight. */
const HUE_SHIFT = 18;
const SATURATION = 0.58;

/** Controlled twinkle — the brief's explicit "avoid visually noisy
 * starfields" direction applies as much to flicker as to density, so this
 * sits below the reference's own default (0.3) for a calmer, more composed
 * shimmer. */
const TWINKLE_INTENSITY = 0.22;
const TWINKLE_SPEED = 0.5;

/** Device-pixel canvas width above which the scene treats itself as the
 * expanded (near-fullscreen) card rather than the grid thumbnail — same
 * signal the other three scenes use, since there is no explicit "expanded"
 * flag from the host. Measured live against this scene's own card/expanded
 * canvases (identical grid/expanded layout to the other three scenes):
 * grid-card width is 207 (DPR 1) / 414 (DPR 2); the expanded view's own
 * DPR-1 minimum is 480 — the old 500 sat above that minimum, so a
 * non-Retina desktop's expanded view never crossed it and stayed on
 * CARD_TUNING. 450 sits in the gap between the card maximum (414) and the
 * expanded minimum (480), same as `liquid-chrome-scene.ts`'s own threshold.
 * This is only correct while this web build's fixed mobile-frame column
 * width (which both bounds derive from) stays at its current value. */
const EXPANDED_WIDTH_PX = 450;

/** Card tuning stays deliberately sparse: fewer layers and a lower density
 * multiplier than the reference's own default (`density: 1`) — the direct
 * answer to "favor a lower uDensity... for a composed, cinematic field
 * rather than the reference's potentially denser default". The expanded
 * view can afford one more layer (more visible depth-of-field without
 * reading as clutter, since the larger canvas gives each star more room)
 * and a touch more glow, since it fills the viewport rather than a small
 * card. */
const CARD_TUNING = { layers: 3, density: 0.55, glow: 0.024 };
const EXPANDED_TUNING = { layers: 4, density: 0.62, glow: 0.03 };

/** `uDepth` advances at this rate (field-sweep "units" per second) — the
 * source of the brief's "subtle parallax", deliberately slow so layers
 * drift past the focal point rather than flying toward camera. `uAngle`
 * advances the whole field's slow rotation — the "camera-like framing"
 * drift that makes the depth sweep read as cinematic rather than a static
 * vantage point. */
const DEPTH_SPEED = 0.022;
const ANGLE_SPEED = 0.014;

/** Idle organic movement: a slowly orbiting repulsion point (standing in
 * for the reference's `uAutoCenterRepulsion` — confirmed in the fetched
 * source to be a standalone idle-motion driver, distinct from pointer
 * repulsion) gently parts nearby stars as it sweeps past them, at a strength
 * far below the pointer's own. This is what keeps the field visibly alive
 * even with no pointer/touch present, without it reading as a second,
 * competing interaction. */
const IDLE_ORBIT_RADIUS = 0.22;
const IDLE_ORBIT_SPEED = 0.1; // rad/s
const IDLE_REPEL_STRENGTH = 0.4;
const ACTIVE_REPEL_STRENGTH = 2.2;

/** Exponential ease time constants (seconds). `awake` rises faster than it
 * falls — same convention as `orb-scene.ts` — so the pointer repulsion
 * response feels immediate but settles back to the idle drift gracefully
 * rather than snapping, per the brief's "gentle, not jarring" ask. The
 * repulsion point itself glides toward its target (idle orbit or pointer)
 * rather than teleporting between the two states. */
const AWAKE_RISE_TAU = 0.25;
const AWAKE_FALL_TAU = 0.5;
const REPEL_POSITION_TAU = 0.28;

export class GalaxyScene extends WebGLSceneController {
  /** No field initializers below — `WebGLSceneController`'s constructor
   * calls `onInit` (then `onResize`) synchronously from inside `super()`,
   * before this subclass's own `= value` initializers would run. A default
   * initializer here would silently overwrite whatever `onInit` just
   * assigned the moment `super()` returns. */
  private prog!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private uniforms!: Record<string, WebGLUniformLocation | null>;
  private tuning!: typeof CARD_TUNING;
  private aspect!: number;
  private depth!: number;
  private angle!: number;
  private awake!: number;
  private repelX!: number;
  private repelY!: number;
  private idlePhase!: number;

  protected onInit(gl: WebGL2RenderingContext): void {
    const prog = program(gl, VERTEX_SRC, FRAGMENT_SRC);
    const buffer = createFullscreenTriangle(gl);
    bindPositionAttribute(gl, prog, buffer);
    this.prog = prog;
    this.buffer = buffer;
    this.tuning = CARD_TUNING;
    this.aspect = 1;
    this.depth = 0;
    this.angle = 0;
    this.awake = 0;
    this.repelX = IDLE_ORBIT_RADIUS;
    this.repelY = 0;
    this.idlePhase = 0;

    this.uniforms = {
      uResolution: gl.getUniformLocation(prog, 'uResolution'),
      uDepth: gl.getUniformLocation(prog, 'uDepth'),
      uAngle: gl.getUniformLocation(prog, 'uAngle'),
      uDensity: gl.getUniformLocation(prog, 'uDensity'),
      uLayers: gl.getUniformLocation(prog, 'uLayers'),
      uGlow: gl.getUniformLocation(prog, 'uGlow'),
      uHueShift: gl.getUniformLocation(prog, 'uHueShift'),
      uSaturation: gl.getUniformLocation(prog, 'uSaturation'),
      uTwinkleIntensity: gl.getUniformLocation(prog, 'uTwinkleIntensity'),
      uTwinkleTime: gl.getUniformLocation(prog, 'uTwinkleTime'),
      uRepelAt: gl.getUniformLocation(prog, 'uRepelAt'),
      uRepelStrength: gl.getUniformLocation(prog, 'uRepelStrength'),
      uBgCenter: gl.getUniformLocation(prog, 'uBgCenter'),
      uBgEdge: gl.getUniformLocation(prog, 'uBgEdge'),
    };

    gl.useProgram(prog);
    gl.uniform3f(this.uniforms.uBgCenter, ...BG_CENTER);
    gl.uniform3f(this.uniforms.uBgEdge, ...BG_EDGE);
    gl.uniform1f(this.uniforms.uHueShift, HUE_SHIFT);
    gl.uniform1f(this.uniforms.uSaturation, SATURATION);
    gl.uniform1f(this.uniforms.uTwinkleIntensity, TWINKLE_INTENSITY);
    this.applyTuning(gl);
  }

  protected onResize(gl: WebGL2RenderingContext, width: number, height: number): void {
    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.uResolution, width, height);
    this.aspect = width / height;
    const nextTuning = width >= EXPANDED_WIDTH_PX ? EXPANDED_TUNING : CARD_TUNING;
    if (nextTuning !== this.tuning) {
      this.tuning = nextTuning;
      this.applyTuning(gl);
    }
  }

  protected onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void {
    const ease = (tau: number) => (dt > 0 ? 1 - Math.exp(-dt / tau) : 1);

    this.depth += dt * DEPTH_SPEED;
    this.angle += dt * ANGLE_SPEED;
    this.idlePhase += dt * IDLE_ORBIT_SPEED;

    const awakeEase = ease(pointer.active ? AWAKE_RISE_TAU : AWAKE_FALL_TAU);
    this.awake += ((pointer.active ? 1 : 0) - this.awake) * awakeEase;

    const idleX = Math.cos(this.idlePhase) * IDLE_ORBIT_RADIUS;
    const idleY = Math.sin(this.idlePhase) * IDLE_ORBIT_RADIUS;
    const pointerX = (pointer.x - 0.5) * this.aspect;
    const pointerY = 0.5 - pointer.y;
    const targetX = idleX + (pointerX - idleX) * this.awake;
    const targetY = idleY + (pointerY - idleY) * this.awake;
    const positionEase = ease(REPEL_POSITION_TAU);
    this.repelX += (targetX - this.repelX) * positionEase;
    this.repelY += (targetY - this.repelY) * positionEase;

    const repelStrength = IDLE_REPEL_STRENGTH + (ACTIVE_REPEL_STRENGTH - IDLE_REPEL_STRENGTH) * this.awake;

    gl.useProgram(this.prog);
    gl.uniform1f(this.uniforms.uDepth, this.depth);
    gl.uniform1f(this.uniforms.uAngle, this.angle);
    gl.uniform1f(this.uniforms.uTwinkleTime, time * TWINKLE_SPEED);
    gl.uniform2f(this.uniforms.uRepelAt, this.repelX, this.repelY);
    gl.uniform1f(this.uniforms.uRepelStrength, repelStrength);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  protected onDispose(gl: WebGL2RenderingContext): void {
    gl.deleteProgram(this.prog);
    gl.deleteBuffer(this.buffer);
  }

  private applyTuning(gl: WebGL2RenderingContext) {
    gl.uniform1f(this.uniforms.uDensity, this.tuning.density);
    gl.uniform1i(this.uniforms.uLayers, this.tuning.layers);
    gl.uniform1f(this.uniforms.uGlow, this.tuning.glow);
  }
}
