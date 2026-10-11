import { bindPositionAttribute, createFullscreenTriangle, program } from '../gl-utils';
import type { PointerInput } from '../types';
import { WebGLSceneController } from '../webgl-scene-controller';

/** Minimal vertex shader — unlike `liquid-chrome-scene.ts` this scene reads
 * `gl_FragCoord` directly in the fragment shader (the reference MetaBalls
 * component does the same), so no `varying` UV needs to survive the
 * rasterizer. */
const VERTEX_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Body balls only; one extra field slot is reserved for the pointer's
 * "attraction glow" ball (`SLOTS`), which is always present in the uniform
 * array with its radius squared driven to 0 while idle — cheaper than
 * branching the loop body on an `enableMouseInteraction`-style flag. */
const BALL_COUNT = 9;
const SLOTS = BALL_COUNT + 1;
const CURSOR_SLOT = BALL_COUNT;
/** Sentinel written into a ball's `w` component so the shader knows to use
 * `uCursorColor` instead of blending `uColorA`/`uColorB` by `w` — safely out
 * of the body balls' `[0, 1]` blend-factor range. */
const CURSOR_COLOR_SENTINEL = 2.0;

/** Fragment shader ports the reference's classic metaball isosurface field
 * (sum of `radius^2 / distance^2` per ball, thresholded with a
 * gradient-based smoothstep for an anti-aliased merge edge) but drops its
 * affine squash/stretch shape matrices — not needed for this brief's
 * "ambient merging/drifting" direction, and removing them roughly halves the
 * per-pixel cost. In their place: each ball's field contribution also
 * accumulates a weighted color (depth/variety via a per-ball blend factor
 * between `uColorA`/`uColorB`, done once per ball here rather than after the
 * loop, since the same soft weight already used for anti-aliasing doubles as
 * the color-blend weight), and the field's analytic gradient is reused a
 * second time as a fake surface normal (`grad` already has to be computed
 * for the smoothstep edge, so deriving `normal.xy` from it is free) driving
 * a small diffuse+specular light — the "soft luminous gradients" and real
 * depth the brief asks for, instead of a flat single-hue fill. */
const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform vec4 uBalls[${SLOTS}];
uniform float uThreshold;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uCursorColor;
uniform vec3 uBgCenter;
uniform vec3 uBgEdge;

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) * uScale;
  float field = 0.0;
  float mass = 0.0;
  vec3 colorAccum = vec3(0.0);
  vec2 grad = vec2(0.0);

  for (int i = 0; i < ${SLOTS}; i++) {
    vec4 ball = uBalls[i];
    vec2 d = p - ball.xy;
    float dist2 = max(dot(d, d), 1e-5);
    float v = ball.z / dist2;
    field += v;
    float w = v / (1.0 + v / uThreshold);
    mass += w;
    vec3 ballColor = ball.w > 1.5 ? uCursorColor : mix(uColorA, uColorB, clamp(ball.w, 0.0, 1.0));
    colorAccum += w * ballColor;
    grad -= (2.0 * v / dist2) * d;
  }

  float slope = max(length(grad) * uScale, 1e-6);
  float alpha = clamp((field - uThreshold) / slope + 0.5, 0.0, 1.0);
  vec3 ballColor = mass > 0.0 ? colorAccum / mass : uColorA;

  vec2 nxy = clamp(-grad * 1.6, -1.0, 1.0);
  float nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
  vec3 normal = normalize(vec3(nxy, nz));
  vec3 lightDir = normalize(vec3(0.45, 0.65, 0.6));
  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(normal, halfVec), 0.0), 24.0);
  vec3 lit = ballColor * (0.58 + 0.68 * diffuse) + vec3(1.0, 0.92, 0.85) * spec * 0.45;

  vec2 uv = gl_FragCoord.xy / uResolution;
  float vign = 1.0 - smoothstep(0.05, 0.95, length(uv - 0.5));
  vec3 bg = mix(uBgEdge, uBgCenter, vign);

  gl_FragColor = vec4(mix(bg, lit, alpha), 1.0);
}
`;

/** Mmusic palette (`packages/design-tokens/src/colors.ts`), used at normal
 * (non-scaled) saturation here — unlike `liquid-chrome-scene.ts`'s `uColorA`
 * /`uColorB`, this shader's colors feed an additive diffuse/specular light
 * rather than a division, so full saturation is correct. */
const COLOR_A: readonly [number, number, number] = [1.0, 0.2941, 0.2941]; // #FF4B4B
const COLOR_B: readonly [number, number, number] = [0.9608, 0.651, 0.1373]; // #F5A623
const CURSOR_COLOR: readonly [number, number, number] = [1.0, 0.4784, 0.349]; // #FF7A59
/** Background matches this card's own placeholder gradient in
 * `dev-living-moods.tsx` (`['#1a1014', '#3a1f28']`) so the WebGL scene and
 * its fallback/loading state read as the same surface. */
const BG_CENTER: readonly [number, number, number] = [0.2275, 0.1216, 0.1569]; // #3a1f28
const BG_EDGE: readonly [number, number, number] = [0.102, 0.0627, 0.0784]; // #1a1014

/** World units spanning the canvas's full height — matches the reference's
 * own `animationSize` convention (ball positions, radii, and the pointer's
 * world-space mapping all scale from this one number). */
const ANIMATION_SIZE = 12;
const BALL_RADIUS_MIN = 0.6;
const BALL_RADIUS_MAX = 1.3;
/** Drift speed, in "phase units per second" fed to each ball's anchor
 * function — deliberately slow (combined with each ball's own `rise` and
 * the frequency multipliers in `anchor()`, a full vertical bob takes on the
 * order of 20-30s) — this is the main lever behind the brief's "no cheap
 * bouncing-ball appearance" direction, since a fast-moving anchor reads as
 * bouncy no matter how the spring below is damped. */
const DRIFT_SPEED = 0.5;
/** Spring constant pulling each ball toward its slowly-drifting anchor.
 * `DAMPING_RATIO` > 1 makes the spring overdamped — it approaches the
 * anchor without ever overshooting past it, which is what keeps the motion
 * reading as "elastic drift" rather than "bounce" (a critically/underdamped
 * spring is what produces a bounce-back wobble). */
const SPRING_K = 9;
const DAMPING_RATIO = 1.2;
/** Pointer attraction is a second, independent force added only while
 * `pointer.active` — idle motion never includes it, so the snappier pull
 * only ever shows up as the interaction response the brief asks for. */
const ATTRACT_STRENGTH = 60;
const ATTRACT_FALLOFF_RADIUS = 5;
/** Exponential ease time constants (seconds) for the pointer glow ball
 * chasing the pointer and for its radius growing in / shrinking out, so
 * both position and presence glide rather than snap. */
const CURSOR_POSITION_TAU = 0.14;
const CURSOR_PRESENCE_TAU = 0.2;
const CURSOR_MAX_RADIUS = 0.9;

const TAU = Math.PI * 2;

/** Cheap deterministic hash (sine-scramble, same family as the classic
 * "random()" GLSL one-liner) — gives every ball a fixed, non-uniform set of
 * motion/size/color parameters from just its index, with no RNG state to
 * manage or reseed on resize/restore. */
function hash(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

type Ball = {
  readonly lane: number;
  readonly rise: number;
  readonly start: number;
  readonly sway: number;
  readonly radius: number;
  readonly colorT: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function createBall(index: number): Ball {
  const lane = hash(index * 3.11 + 1) * 2 - 1;
  const rise = 0.55 + hash(index * 7.73 + 2) * 0.85;
  const start = hash(index * 11.37 + 3) * TAU;
  const sway = hash(index * 5.19 + 4) * TAU;
  const radius = BALL_RADIUS_MIN + hash(index * 13.57 + 5) * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
  const colorT = hash(index * 17.91 + 6);
  return { lane, rise, start, sway, radius, colorT, x: 0, y: 0, vx: 0, vy: 0 };
}

/** The slow "lava lamp" anchor each ball's spring chases: a gentle sideways
 * sway around a fixed lane, and a plain sine bob for the vertical travel —
 * sine's own zero-derivative at its peaks already reads as a natural
 * slowdown-and-linger at the top/bottom without needing extra easing, which
 * an earlier `pow(.., 0.6)`-shaped version overdid (it pinned most balls to
 * the extremes at any given moment, leaving the vertical middle of a tall
 * expanded view visibly empty). */
function anchor(ball: Ball, phase: number, halfWidth: number, halfHeight: number): [number, number] {
  const x = ball.lane * halfWidth * 0.72 + Math.sin(phase * ball.rise * 0.3 + ball.sway) * halfWidth * 0.12;
  const y = Math.sin(phase * ball.rise * 0.5 + ball.start) * halfHeight * 0.78;
  return [x, y];
}

export class MetaBallsScene extends WebGLSceneController {
  /** No field initializers below, for the same reason documented in
   * `liquid-chrome-scene.ts`: `WebGLSceneController`'s constructor calls
   * `onInit` (then `onResize`) from inside `super()`, before this
   * subclass's own `= value` initializers would run — any such initializer
   * here would silently overwrite what `onInit`/`onResize` just set. */
  private prog!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private uniforms!: Record<string, WebGLUniformLocation | null>;
  private balls!: Ball[];
  private ballData!: Float32Array;
  private cursorX!: number;
  private cursorY!: number;
  private cursorPresence!: number;
  private halfWidth!: number;
  private halfHeight!: number;
  private scale!: number;

  protected onInit(gl: WebGL2RenderingContext): void {
    const prog = program(gl, VERTEX_SRC, FRAGMENT_SRC);
    const buffer = createFullscreenTriangle(gl);
    bindPositionAttribute(gl, prog, buffer);
    this.prog = prog;
    this.buffer = buffer;
    this.balls = Array.from({ length: BALL_COUNT }, (_, index) => createBall(index));
    this.ballData = new Float32Array(SLOTS * 4);
    this.ballData[CURSOR_SLOT * 4 + 3] = CURSOR_COLOR_SENTINEL;
    this.cursorX = 0;
    this.cursorY = 0;
    this.cursorPresence = 0;
    this.halfWidth = ANIMATION_SIZE / 2;
    this.halfHeight = ANIMATION_SIZE / 2;
    this.scale = 1;

    this.uniforms = {
      uResolution: gl.getUniformLocation(prog, 'uResolution'),
      uScale: gl.getUniformLocation(prog, 'uScale'),
      uBalls: gl.getUniformLocation(prog, 'uBalls'),
      uThreshold: gl.getUniformLocation(prog, 'uThreshold'),
      uColorA: gl.getUniformLocation(prog, 'uColorA'),
      uColorB: gl.getUniformLocation(prog, 'uColorB'),
      uCursorColor: gl.getUniformLocation(prog, 'uCursorColor'),
      uBgCenter: gl.getUniformLocation(prog, 'uBgCenter'),
      uBgEdge: gl.getUniformLocation(prog, 'uBgEdge'),
    };

    gl.useProgram(prog);
    gl.uniform1f(this.uniforms.uThreshold, 1.0);
    gl.uniform3f(this.uniforms.uColorA, ...COLOR_A);
    gl.uniform3f(this.uniforms.uColorB, ...COLOR_B);
    gl.uniform3f(this.uniforms.uCursorColor, ...CURSOR_COLOR);
    gl.uniform3f(this.uniforms.uBgCenter, ...BG_CENTER);
    gl.uniform3f(this.uniforms.uBgEdge, ...BG_EDGE);

    // A static reduced-motion/pre-resize frame should still show the balls
    // spread across their anchors rather than stacked at the origin.
    for (const ball of this.balls) {
      const [x, y] = anchor(ball, 0, this.halfWidth, this.halfHeight);
      ball.x = x;
      ball.y = y;
    }
  }

  protected onResize(gl: WebGL2RenderingContext, width: number, height: number): void {
    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.uResolution, width, height);
    this.scale = ANIMATION_SIZE / height;
    gl.uniform1f(this.uniforms.uScale, this.scale);
    this.halfHeight = ANIMATION_SIZE / 2;
    this.halfWidth = (ANIMATION_SIZE * width) / height / 2;
  }

  protected onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void {
    const phase = time * DRIFT_SPEED;
    const halfWidth = this.halfWidth;
    const halfHeight = this.halfHeight;

    const pointerWorldX = (pointer.x - 0.5) * 2 * halfWidth;
    const pointerWorldY = (0.5 - pointer.y) * 2 * halfHeight;

    if (dt <= 0) {
      // Reduced-motion / offscreen single frame: snap to a composed static
      // layout instead of animating, and hide the pointer glow.
      for (const ball of this.balls) {
        const [x, y] = anchor(ball, phase, halfWidth, halfHeight);
        ball.x = x;
        ball.y = y;
        ball.vx = 0;
        ball.vy = 0;
      }
      this.cursorPresence = 0;
    } else {
      const damping = 2 * Math.sqrt(SPRING_K) * DAMPING_RATIO;
      for (const ball of this.balls) {
        const [ax, ay] = anchor(ball, phase, halfWidth, halfHeight);
        ball.vx += (SPRING_K * (ax - ball.x) - damping * ball.vx) * dt;
        ball.vy += (SPRING_K * (ay - ball.y) - damping * ball.vy) * dt;
        if (pointer.active) {
          const dx = pointerWorldX - ball.x;
          const dy = pointerWorldY - ball.y;
          const distance = Math.hypot(dx, dy) || 1e-4;
          const force = ATTRACT_STRENGTH * Math.exp(-distance / ATTRACT_FALLOFF_RADIUS);
          ball.vx += (dx / distance) * force * dt;
          ball.vy += (dy / distance) * force * dt;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
      }

      const presenceEase = 1 - Math.exp(-dt / CURSOR_PRESENCE_TAU);
      this.cursorPresence += ((pointer.active ? 1 : 0) - this.cursorPresence) * presenceEase;
      const positionEase = 1 - Math.exp(-dt / CURSOR_POSITION_TAU);
      this.cursorX += (pointerWorldX - this.cursorX) * positionEase;
      this.cursorY += (pointerWorldY - this.cursorY) * positionEase;
    }

    const data = this.ballData;
    for (let i = 0; i < BALL_COUNT; i++) {
      const ball = this.balls[i];
      data[i * 4] = ball.x;
      data[i * 4 + 1] = ball.y;
      data[i * 4 + 2] = ball.radius * ball.radius;
      data[i * 4 + 3] = ball.colorT;
    }
    const cursorRadius = CURSOR_MAX_RADIUS * this.cursorPresence;
    data[CURSOR_SLOT * 4] = this.cursorX;
    data[CURSOR_SLOT * 4 + 1] = this.cursorY;
    data[CURSOR_SLOT * 4 + 2] = cursorRadius * cursorRadius;
    // data[CURSOR_SLOT * 4 + 3] stays CURSOR_COLOR_SENTINEL, set once in onInit.

    gl.useProgram(this.prog);
    gl.uniform4fv(this.uniforms.uBalls, data);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  protected onDispose(gl: WebGL2RenderingContext): void {
    gl.deleteProgram(this.prog);
    gl.deleteBuffer(this.buffer);
  }
}
