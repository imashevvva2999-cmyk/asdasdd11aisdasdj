import { bindPositionAttribute, createFullscreenTriangle, program } from '../gl-utils';
import type { PointerInput } from '../types';
import { WebGLSceneController, type SceneRenderer } from '../webgl-scene-controller';

/** Minimal vertex shader — like `meta-balls-scene.ts`, the fragment shader
 * builds its own UV from `gl_FragCoord`, so no `varying` needs to cross the
 * rasterizer. */
const VERTEX_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Fragment shader ports reactbits.dev's Orb `draw()` — simplex-noise-warped
 * radial boundary (`r0`/`n0`), inverse-distance/inverse-square light helpers
 * (`light1`/`light2`) building the boundary glow/bloom, and an orbiting
 * highlight with a comet `trail` — with three deliberate simplifications
 * from the reference, since this prototype has no need for what they cost:
 * (1) the reference's `uBackground`-driven dark/light branch is dropped —
 * our backdrop is always near-black, so only its "darkCol" branch can ever
 * be visible, and the "lightCol" branch (plus the `bgLuminance` plumbing
 * that picks between them) is dead weight here; (2) `uTilt`'s 3D
 * plane-projection and `uRotation` are both dropped — the brief calls
 * `uTilt` optional since this prototype requests no device-orientation
 * permission, and the per-pixel `toPlane` ray/plane intersection is exactly
 * the kind of cost this, "the most math-dense of the four" scenes, can do
 * without; (3) the click-triggered `uEcho` ripple is dropped — `PointerInput`
 * only carries continuous position + `active`, no click event, so there is
 * nothing to trigger it from. What's kept is exactly what the brief asks
 * for: organic internal movement (`n0`/`r0`/`uSwirl`/`uOrbit`), a pointer
 * "reach" distortion, and layered glow/bloom/highlight depth. */
const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform vec2 uReach;
uniform float uWobble;
uniform float uGlow;
uniform float uBleed;
uniform float uHighlight;
uniform float uSwirl;
uniform float uOrbit;
uniform float uTrail;
uniform float uAwake;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBgCenter;
uniform vec3 uBgEdge;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float rawLen = length(uv);
  vec2 dir = rawLen > 0.0001 ? uv / rawLen : vec2(1.0, 0.0);
  float reachAmount = length(uReach);
  vec2 reachDir = reachAmount > 0.00001 ? uReach / reachAmount : vec2(1.0, 0.0);
  float facing = exp((dot(dir, reachDir) - 1.0) * 3.2);
  float len = max(rawLen - reachAmount * facing * smoothstep(0.25, 0.65, rawLen), 0.0);
  uv = dir * len;
  float ang = atan(dir.y, dir.x);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  float near = facing * uAwake;

  float n0 = snoise3(vec3(uv * 0.65, uTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(0.8 - 0.06 * uWobble, 0.8 + 0.06 * uWobble, n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0 / uGlow, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float reach = max(uBleed, 0.04);
  float innerFade = smoothstep(r0 * (1.0 - 0.2 * reach), r0 * (1.0 - 0.05 * reach), len);
  v0 *= innerFade;
  float body = smoothstep(0.8 - 0.2 * reach, 0.8, len);
  float cl = cos(ang + uSwirl) * 0.5 + 0.5;

  vec2 pos = vec2(cos(uOrbit), sin(uOrbit)) * r0;
  float d = distance(uv, pos);
  vec2 head = vec2(cos(uOrbit), sin(uOrbit));
  float lag = atan(head.x * dir.y - head.y * dir.x, dot(dir, head));
  float trail = uTrail > 0.0 ? smoothstep(0.0, 0.35, lag) * exp(-max(lag, 0.0) * 2.6 / uTrail) : 0.0;
  float v1 = (light2(1.2, 6.0, d) + trail * 0.5) * uHighlight;
  v1 *= light1(1.0, 50.0, d0);
  float band = v0 * smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len) * body;
  float heat = pow(clamp(band / 0.82, 0.0, 1.0), 3.0);
  float bloom = light2(1.0, 160.0 / uGlow, max(len - r0, 0.0)) * smoothstep(0.4, 0.0, len - r0) * step(r0, len);

  float v2 = smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len);
  float v3 = body;

  vec3 colBase = mix(uColor1, uColor2, cl);
  vec3 rimCol = mix(uColor3, colBase, v0);
  rimCol = (rimCol + v1) * v2 * v3 * (1.0 + near * 0.5) + mix(colBase, vec3(1.0), 0.25) * heat * (0.25 + near * 0.35);
  rimCol = clamp(rimCol + colBase * bloom * 0.12, 0.0, 1.0);

  // The reference's own terms above all gate on \`body\` (zero for the whole
  // interior, len < r0), so the rim alone renders as a hollow ring on a flat
  // backdrop — reading as a "flat circle", not the brief's "cinematic
  // energy core" with "layered luminous depth". This second, independent
  // noise layer (a different frequency/phase than the boundary's own n0, so
  // it drifts on its own rhythm rather than echoing the rim's wobble) fills
  // the interior with a soft, slowly roiling colored haze — real volumetric
  // depth and a second axis of "organic internal movement", not just a
  // thicker ring.
  float n1 = snoise3(vec3(uv * 1.05 + vec2(4.0, -2.3), uTime * 0.3)) * 0.5 + 0.5;
  float core = (1.0 - smoothstep(r0 * 0.1, r0 * 0.95, len)) * mix(0.16, 0.46, n1);
  vec3 coreCol = colBase * core * (0.42 + near * 0.3);

  vec3 finalCol = clamp(rimCol + coreCol, 0.0, 1.0);
  float alpha = max(max(finalCol.r, finalCol.g), finalCol.b);
  return vec4(finalCol / (alpha + 1e-5), alpha);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
  uv *= uScale;
  vec4 col = draw(uv);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float alpha = clamp(col.a + dither, 0.0, 1.0);
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  float vign = 1.0 - smoothstep(0.05, 0.95, length(screenUv - 0.5));
  vec3 bg = mix(uBgEdge, uBgCenter, vign);
  // The reference premultiplies by alpha*alpha for a sharp, crisp rim edge
  // against an arbitrary page background. That squaring is fine for the
  // bright rim (alpha near 1) but crushes the dimmer interior core glow
  // (alpha ~0.2-0.5) to near-invisible — exactly the "flat circle" look this
  // scene needs to avoid. A single alpha keeps the rim's soft falloff while
  // letting the interior haze actually read as volumetric depth.
  vec3 premultiplied = col.rgb * alpha;
  gl_FragColor = vec4(premultiplied + bg * (1.0 - alpha), 1.0);
}
`;

/** Mmusic palette (`ui-kit/tokens/colors.ts`). `uColor1`/
 * `uColor2` are the coral-to-coral-orange gradient the orbiting highlight and
 * boundary band swirl between (`colBase` in the shader); `uColor3` is the
 * near-black canvas tone the boundary fades toward at its darkest, so the
 * core's own body — not just its glow — reads as belonging to the app
 * instead of a generic purple/cyan demo plasma ball. */
const COLOR_1: readonly [number, number, number] = [1.0, 0.2941, 0.2941]; // #FF4B4B primary
const COLOR_2: readonly [number, number, number] = [1.0, 0.4784, 0.349]; // #FF7A59 tertiary
const COLOR_3: readonly [number, number, number] = [0.0392, 0.0392, 0.0471]; // #0A0A0C canvas

/** This card's own placeholder gradient in `dev-living-moods.tsx`
 * (`['#120a16', '#2a1638']`), reused as a radial vignette behind the orb —
 * the same "WebGL scene and its fallback read as the same surface"
 * convention `meta-balls-scene.ts` establishes with `uBgCenter`/`uBgEdge`.
 * Unlike the reactbits.dev reference (which blends a transparent,
 * premultiplied-alpha result into whatever sits behind the canvas), this
 * shader composites the orb onto this vignette itself and always outputs
 * alpha 1 — the canvas fully covers its card/expanded container (see
 * `living-mood-scene.web.tsx`), so there is nothing else behind it to
 * composite against. */
const BG_CENTER: readonly [number, number, number] = [0.1647, 0.0863, 0.2196]; // #2a1638
const BG_EDGE: readonly [number, number, number] = [0.0706, 0.0392, 0.0863]; // #120a16

/** Idle tuning stays deliberately restrained — the brief's "elegant glow
 * without excessive brightness" and "subtle energy pulses" — favoring a
 * tight boundary glow, a softer bloom, and a faint highlight trail. Active
 * tuning (eased in by `awake` while the pointer is engaged) is where the
 * reference's own brighter defaults live, so the premium/calm read is the
 * default state and the interaction is the one moment it opens up. */
const IDLE_GLOW = 0.62;
const IDLE_BLEED = 0.55;
const IDLE_HIGHLIGHT = 0.5;
const ACTIVE_GLOW = 1.1;
const ACTIVE_BLEED = 1.0;
const ACTIVE_HIGHLIGHT = 1.4;

/** Boundary noise strength and comet-trail length — constant regardless of
 * interaction state, since they shape the core's organic identity rather
 * than its brightness. */
const WOBBLE = 1.2;
const TRAIL = 0.6;

/** Boundary-noise time scale — slow enough that the wobble reads as a
 * breathing/organic surface rather than a shimmer. */
const TIME_SCALE = 0.55;

/** How far the boundary stretches toward the pointer, in the shader's own
 * UV units (the boundary itself sits at radius ~0.8) — eased toward this
 * target while the pointer is active, and back toward zero (a centered,
 * calm idle boundary) otherwise. */
const REACH_STRENGTH = 0.16;
const REACH_TAU = 0.22;

/** `awake` is the 0-1 interaction-intensity blend driving the idle/active
 * tuning above and the shader's own `near` glow boost — it rises faster
 * than it falls, so the response feels immediate but the settle-back reads
 * as a graceful fade rather than a snap. */
const AWAKE_RISE_TAU = 0.3;
const AWAKE_FALL_TAU = 0.45;

/** The orbiting highlight autonomously revolves at idle (the brief's
 * "organic internal movement" without a tilt/gyroscope input) and eases
 * toward the pointer's direction from center while active, so the core's
 * brightest point visibly chases the touch rather than only the boundary
 * stretching toward it. */
const ORBIT_IDLE_SPEED = 0.16; // rad/s
const ORBIT_FOLLOW_TAU = 0.18;

/** Slow color-swirl advance (`cl` in the shader, the coral/coral-orange
 * blend around the ring) — mildly quickened while engaged for a touch more
 * life during the interaction response. */
const SWIRL_SPEED = 0.12;

/** Device-pixel canvas width above which the scene treats itself as the
 * expanded (near-fullscreen) card rather than the grid thumbnail — same
 * signal `liquid-chrome-scene.ts` uses, since there is no explicit
 * "expanded" flag from the host. Measured live against this scene's own
 * card/expanded canvases (identical grid/expanded layout to the other three
 * scenes): grid-card width is 207 (DPR 1) / 414 (DPR 2); the expanded
 * view's own DPR-1 minimum is 480 — the old 500 sat above that minimum, so
 * a non-Retina desktop's expanded view never crossed it and stayed on
 * CARD_SCALE. 450 sits in the gap between the card maximum (414) and the
 * expanded minimum (480), same as `liquid-chrome-scene.ts`'s own threshold.
 * This is only correct while this web build's fixed mobile-frame column
 * width (which both bounds derive from) stays at its current value. */
const EXPANDED_WIDTH_PX = 450;

/** `uScale` divides the UV before the boundary (radius ~0.8) is evaluated —
 * a smaller value zooms in. The thumbnail card wants the core filling more
 * of its small square; the expanded view wants it centered with breathing
 * room around it. */
const CARD_SCALE = 0.82;
const EXPANDED_SCALE = 1.1;

export class OrbRenderer implements SceneRenderer {
  /** Everything is assigned in `onInit` (then `onResize`), so the state
   * always starts fresh with the GL context that built it. */
  private prog!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private uniforms!: Record<string, WebGLUniformLocation | null>;
  private scale!: number;
  private reachX!: number;
  private reachY!: number;
  private awake!: number;
  private orbit!: number;
  private swirl!: number;

  onInit(gl: WebGL2RenderingContext): void {
    const prog = program(gl, VERTEX_SRC, FRAGMENT_SRC);
    const buffer = createFullscreenTriangle(gl);
    bindPositionAttribute(gl, prog, buffer);
    this.prog = prog;
    this.buffer = buffer;
    this.scale = CARD_SCALE;
    this.reachX = 0;
    this.reachY = 0;
    this.awake = 0;
    this.orbit = 0;
    this.swirl = 0;

    this.uniforms = {
      uResolution: gl.getUniformLocation(prog, 'uResolution'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uScale: gl.getUniformLocation(prog, 'uScale'),
      uReach: gl.getUniformLocation(prog, 'uReach'),
      uWobble: gl.getUniformLocation(prog, 'uWobble'),
      uGlow: gl.getUniformLocation(prog, 'uGlow'),
      uBleed: gl.getUniformLocation(prog, 'uBleed'),
      uHighlight: gl.getUniformLocation(prog, 'uHighlight'),
      uSwirl: gl.getUniformLocation(prog, 'uSwirl'),
      uOrbit: gl.getUniformLocation(prog, 'uOrbit'),
      uTrail: gl.getUniformLocation(prog, 'uTrail'),
      uAwake: gl.getUniformLocation(prog, 'uAwake'),
      uColor1: gl.getUniformLocation(prog, 'uColor1'),
      uColor2: gl.getUniformLocation(prog, 'uColor2'),
      uColor3: gl.getUniformLocation(prog, 'uColor3'),
      uBgCenter: gl.getUniformLocation(prog, 'uBgCenter'),
      uBgEdge: gl.getUniformLocation(prog, 'uBgEdge'),
    };

    gl.useProgram(prog);
    gl.uniform3f(this.uniforms.uColor1, ...COLOR_1);
    gl.uniform3f(this.uniforms.uColor2, ...COLOR_2);
    gl.uniform3f(this.uniforms.uColor3, ...COLOR_3);
    gl.uniform3f(this.uniforms.uBgCenter, ...BG_CENTER);
    gl.uniform3f(this.uniforms.uBgEdge, ...BG_EDGE);
    gl.uniform1f(this.uniforms.uWobble, WOBBLE);
    gl.uniform1f(this.uniforms.uTrail, TRAIL);
    gl.uniform1f(this.uniforms.uScale, this.scale);
  }

  onResize(gl: WebGL2RenderingContext, width: number, height: number): void {
    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.uResolution, width, height);
    this.scale = width >= EXPANDED_WIDTH_PX ? EXPANDED_SCALE : CARD_SCALE;
    gl.uniform1f(this.uniforms.uScale, this.scale);
  }

  onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void {
    const ease = (tau: number) => (dt > 0 ? 1 - Math.exp(-dt / tau) : 1);

    const px = pointer.active ? (pointer.x - 0.5) * 2 : 0;
    const py = pointer.active ? (0.5 - pointer.y) * 2 : 0;
    const pointerDistance = Math.hypot(px, py);
    const reachAmount = pointer.active ? Math.min(pointerDistance, 1) * REACH_STRENGTH : 0;
    const targetReachX = pointerDistance > 1e-4 ? (px / pointerDistance) * reachAmount : 0;
    const targetReachY = pointerDistance > 1e-4 ? (py / pointerDistance) * reachAmount : 0;
    const reachEase = ease(REACH_TAU);
    this.reachX += (targetReachX - this.reachX) * reachEase;
    this.reachY += (targetReachY - this.reachY) * reachEase;

    const awakeEase = ease(pointer.active ? AWAKE_RISE_TAU : AWAKE_FALL_TAU);
    this.awake += ((pointer.active ? 1 : 0) - this.awake) * awakeEase;

    if (pointer.active && pointerDistance > 1e-4) {
      const targetOrbit = Math.atan2(py, px);
      const delta = Math.atan2(Math.sin(targetOrbit - this.orbit), Math.cos(targetOrbit - this.orbit));
      this.orbit += delta * ease(ORBIT_FOLLOW_TAU);
    } else {
      this.orbit += dt * ORBIT_IDLE_SPEED;
    }
    this.orbit = Math.atan2(Math.sin(this.orbit), Math.cos(this.orbit));

    this.swirl += dt * SWIRL_SPEED * (1 + this.awake * 0.4);

    const glow = IDLE_GLOW + (ACTIVE_GLOW - IDLE_GLOW) * this.awake;
    const bleed = IDLE_BLEED + (ACTIVE_BLEED - IDLE_BLEED) * this.awake;
    const highlight = IDLE_HIGHLIGHT + (ACTIVE_HIGHLIGHT - IDLE_HIGHLIGHT) * this.awake;

    gl.useProgram(this.prog);
    gl.uniform1f(this.uniforms.uTime, time * TIME_SCALE);
    gl.uniform2f(this.uniforms.uReach, this.reachX, this.reachY);
    gl.uniform1f(this.uniforms.uGlow, glow);
    gl.uniform1f(this.uniforms.uBleed, bleed);
    gl.uniform1f(this.uniforms.uHighlight, highlight);
    gl.uniform1f(this.uniforms.uSwirl, this.swirl);
    gl.uniform1f(this.uniforms.uOrbit, this.orbit);
    gl.uniform1f(this.uniforms.uAwake, this.awake);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  onDispose(gl: WebGL2RenderingContext): void {
    gl.deleteProgram(this.prog);
    gl.deleteBuffer(this.buffer);
  }
}

/** The website's canvas-driven Orb; the native app runs `Renderer` through expo-gl. */
export class OrbScene extends WebGLSceneController {
  static readonly Renderer = OrbRenderer;

  constructor(canvas: HTMLCanvasElement, onFallback: () => void) {
    super(canvas, onFallback, new OrbRenderer());
  }
}
