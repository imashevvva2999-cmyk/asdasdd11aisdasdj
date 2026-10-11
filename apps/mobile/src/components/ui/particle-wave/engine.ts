// Late Night Flow — particle wave renderer (approved "Particle Wave B").
//
// WebGL 1 point sprites. Every particle's position is computed in the vertex
// shader from fixed, deterministic attributes and one time uniform, so the CPU
// does no per-particle work per frame and React never re-renders.
//
// Silhouette: 24 strands (ribbons) of particles follow procedural curves
// inside a two-lobed envelope measured from the approved v2 artwork (left lobe
// ~35 %, neck ~53 %, right lobe ~71 %, thin glowing tips). Strands have their
// own frequency, phase, speed and depth, so they braid and cross like the glass
// strands of the artwork. Motion: ribbon flow along the strands (Composing),
// slow uneven expansion (Breathing), an occasional travelling pulse (Listening).
//
// The shaders and particle parameters below are the approved preview's,
// unchanged. Covered by scripts/verify-particle-wave.mjs.

export type WaveOptions = { density: number; speed: number; paused: boolean };

/** Live, per-frame-updated values that don't go through `set()` — see `ParticleWave`'s `getReactive`. */
export type ReactiveInput = { tint: [number, number, number]; bass: number; mid: number; high: number };

/** The approved palette's own peach, as the shader's default — a no-op tint when nothing reactive is wired (native, tests, first frame). */
export const DEFAULT_TINT: [number, number, number] = [1, 0.76, 0.64];

/** The approved configuration: preview default density, speed set to 1.90×. */
export const APPROVED_SPEED = 1.9;
export const APPROVED_DENSITY = 1;

/** Rendering quality, lowered step by step only when frames stay slow. */
export type Quality = { dprCap: number; density: number; slow: number };
export const INITIAL_QUALITY: Quality = { dprCap: 2, density: APPROVED_DENSITY, slow: 0 };
const SLOW_FRAME_MS = 22;
const SLOW_FRAMES_TO_STEP = 46;
const MIN_DENSITY = 0.55;

/** One frame's effect on quality: sharpness goes first (2× → 1.5× → 1×), then
 * particle density (1 → 0.75 → 0.55). Only sustained slowness counts. */
export function nextQuality(q: Quality, frameMs: number): Quality {
  const slow = frameMs > SLOW_FRAME_MS ? q.slow + 1 : Math.max(0, q.slow - 1);
  if (slow < SLOW_FRAMES_TO_STEP) return { ...q, slow };
  if (q.dprCap > 1) return { dprCap: q.dprCap > 1.5 ? 1.5 : 1, density: q.density, slow: 0 };
  if (q.density > MIN_DENSITY) return { dprCap: 1, density: q.density > 0.75 ? 0.75 : MIN_DENSITY, slow: 0 };
  return { ...q, slow: 0 };
}


// Artwork space: the approved JPG is 512 × 279; the banner shows it with `cover`.
const ART_W = 512;
const ART_H = 279;
export const BASE_STRAND_PARTICLES = 11000;
const STRANDS = 24;
const HAZE = 520;
const DUST = 140;
export const GHOSTS = 3;
const STILL_TIME = 11.4;
const FLOATS = 14; // per vertex: a0 (4) a1 (4) a2 (4) a3 (2)

const VERT = `
precision highp float;
attribute vec4 a0; // u0, ribbon offset, size, twinkle seed
attribute vec4 a1; // phase, cycles, speed, amplitude
attribute vec4 a2; // depth, flow, phase2, colour mix
attribute vec2 a3; // ghost index, kind (0 strand, 1 shard, 2 haze, 3 dust)
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uCover; // artwork px -> canvas (device) px: scale, offset x, offset y
uniform vec3 uTint;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
varying vec4 vColor;
varying float vKind;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

const float TAU = 6.28318530718;
float gauss(float x, float w) { float d = x / w; return exp(-d * d); }

// Two-lobed envelope of the artwork, breathing and leaning between its lobes.
float envelope(float u, float t) {
  float taper = pow(clamp(sin(3.14159265 * u), 0.0, 1.0), 0.7);
  float left = (1.0 + 0.12 * sin(t * 0.13)) * gauss(u - 0.35, 0.2);
  float right = (0.86 + 0.12 * sin(t * 0.11 + 2.0)) * gauss(u - 0.71, 0.17);
  float neck = 0.42 * gauss(u - 0.53, 0.3);
  // A floor before the taper keeps thin, glowing tips like the artwork's.
  return taper * max(max(left, right), max(neck, 0.34));
}

void main() {
  float ghost = a3.x;
  float kind = a3.y;
  float t = uTime - ghost * 0.045;
  float depth = a2.x;
  vec2 art;
  float alpha;
  float size = a0.z;
  vec3 col;

  // Breathing: slow, slightly uneven expansion and contraction (~6.4 s).
  float breath = 0.84 + 0.16 * sin(TAU * t / 6.4 + 0.5 * sin(TAU * t / 17.0));
  // Listening: an occasional energy pulse travelling left → right.
  float pp = t / 6.1 + 0.12 * sin(t * 0.07);
  float pulseC = -0.25 + 1.5 * fract(pp);

  if (kind > 2.5) {
    // Dust: faint motes drifting across the whole frame.
    art = vec2(fract(a0.x + t * 0.004 * (0.5 + a2.y)) * ${ART_W}.0, fract(a1.x + 0.15 * sin(t * 0.05 + a0.w * 6.0)) * ${ART_H}.0);
    alpha = 0.10 + 0.08 * sin(t * 0.9 + a0.w * 40.0);
    col = vec3(1.0, 0.72, 0.62);
  } else {
    // Ribbon flow: particles glide along their strand (Composing).
    float u = fract(a0.x + a2.y * t);
    float env = envelope(u, t);
    float pulse = gauss(u - pulseC, 0.08);
    float amp = env * breath * (1.0 + 0.22 * pulse) * (1.0 + uBass * 0.32);
    // Each strand: own cycles, phase, speed and a phase-shifted second harmonic.
    float w1 = sin(TAU * a1.y * u - a1.z * t * (1.0 + uMid * 0.12) + a1.x);
    float w2 = sin(TAU * a1.y * 2.07 * u + 1.6 * a1.z * t * (1.0 + uMid * 0.12) + a2.z);
    float n = snoise(vec2(u * 2.3 + a1.x, t * 0.11 + a2.z));
    float y = 84.0 * amp * (a1.w * w1 + 0.15 * w2) + 3.0 * n * env;
    // Ribbon thickness: a thin band of particles across the strand, a little wider in the lobes.
    y += a0.y * (0.5 + 1.6 * env);
    float x = 56.0 + u * 402.0;
    // Parallax: near and far layers sway apart a little.
    x += (depth - 0.5) * 7.0 * sin(t * 0.21 + a2.z);
    y += (depth - 0.5) * 5.0 * sin(t * 0.17 + 1.0);
    art = vec2(x, 140.0 + y);
    // Tips dissolve (where the strands converge) instead of piling up into a hot spot.
    float tips = smoothstep(0.0, 0.22, env) * (0.55 + 0.45 * smoothstep(0.1, 0.45, env));
    alpha = tips * (0.42 + 0.5 * depth) * (0.8 + 0.2 * breath) * (1.0 + 0.9 * pulse);
    // Peach / coral / pink / warm orange, a little warmer and dimmer at the back.
    vec3 peach = vec3(1.0, 0.76, 0.64);
    vec3 coral = vec3(1.0, 0.5, 0.4);
    vec3 pink = vec3(1.0, 0.6, 0.66);
    vec3 orange = vec3(1.0, 0.6, 0.36);
    col = mix(mix(coral, peach, a2.w), mix(pink, orange, a2.w), step(0.65, fract(a2.w * 7.0)));
    col = mix(col * vec3(0.9, 0.7, 0.7), col, depth);
    if (kind > 1.5) {
      // Haze: big, faint sprites that give the strands their glow.
      // (and they fade before the tips, where every strand converges)
      alpha *= 0.06 * smoothstep(0.15, 0.5, env);
      size = 38.0;
    } else if (kind > 0.5) {
      // Shards: rare bright glints, like the crystal edges of the artwork.
      col = mix(col, vec3(1.0, 0.92, 0.86), 0.7);
      alpha *= 1.3 * (0.55 + 0.45 * sin(t * 2.3 + a0.w * 30.0)) * (1.0 + uHigh * 0.5);
      size *= 1.9 * (1.0 + uHigh * 0.15);
    }
    col = mix(col, uTint, 0.35);
  }
  // Light trails: each ghost is an earlier instant, fainter.
  alpha *= ghost < 0.5 ? 1.0 : (ghost < 1.5 ? 0.38 : 0.14);

  vec2 px = art * uCover.x + uCover.yz;
  vec2 clip = px / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  // Sizes are in artwork px, so they scale with the banner and the pixel ratio.
  gl_PointSize = max(1.0, size * (0.65 + 0.7 * depth) * uCover.x * 0.9);
  vColor = vec4(col, alpha);
  vKind = kind;
}
`;

const FRAG = `
precision mediump float;
varying vec4 vColor;
varying float vKind;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  if (d2 > 1.0) discard;
  float soft = vKind > 1.5 && vKind < 2.5 ? exp(-d2 * 2.4) : exp(-d2 * 4.2) + 0.35 * exp(-d2 * 24.0);
  gl_FragColor = vec4(vColor.rgb * vColor.a * soft, 1.0);
}
`;

// The artwork's dark backdrop: faint blue-grey light at the top centre.
const BG_VERT = `attribute vec2 p; varying vec2 v; void main() { v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const BG_FRAG = `
precision mediump float;
varying vec2 v;
void main() {
  float glow = exp(-pow(distance(v, vec2(0.5, 1.05)) / 0.75, 2.0));
  vec3 col = mix(vec3(0.012, 0.012, 0.024), vec3(0.075, 0.1, 0.135), glow);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Deterministic PRNG: the same particles on every load and every device. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Strand = { phase: number; cycles: number; speed: number; amp: number; depth: number; flow: number; phase2: number };

function makeStrands(): Strand[] {
  const rnd = mulberry32(20261009);
  return Array.from({ length: STRANDS }, () => ({
    phase: rnd() * Math.PI * 2,
    cycles: 1.55 + rnd() * 0.75,
    speed: (0.35 + rnd() * 0.45) * (rnd() < 0.5 ? -1 : 1),
    amp: 0.5 + rnd() * 0.55,
    depth: rnd(),
    flow: 0.012 + rnd() * 0.03,
    phase2: rnd() * Math.PI * 2,
  }));
}

/** Vertex data for `density` × the base count. Same seed every time, so the
 * same density always gives the same particles. */
export function buildParticles(density: number): { data: Float32Array; count: number } {
  const strands = makeStrands();
  const rnd = mulberry32(777);
  const strandCount = Math.max(200, Math.round(BASE_STRAND_PARTICLES * density));
  const total = (strandCount + HAZE + DUST) * GHOSTS;
  const data = new Float32Array(total * FLOATS);
  let o = 0;
  const particle = (kind: number) => {
    const s = strands[Math.floor(rnd() * STRANDS)]!;
    const across = (rnd() + rnd() + rnd()) / 1.5 - 1; // -1…1, centre-weighted
    const a0 = [rnd(), across, 1.1 + rnd() * 1.1, rnd()];
    const a1 = kind === 3 ? [rnd(), 0, 0, 0] : [s.phase, s.cycles, s.speed, s.amp];
    const a2 = [kind === 3 ? 0.5 : s.depth, kind === 3 ? rnd() : s.flow, s.phase2, rnd()];
    for (let g = 0; g < GHOSTS; g += 1) for (const x of [...a0, ...a1, ...a2, g, kind]) data[o++] = x;
  };
  for (let i = 0; i < strandCount; i += 1) particle(rnd() < 0.05 ? 1 : 0);
  for (let i = 0; i < HAZE; i += 1) particle(2);
  for (let i = 0; i < DUST; i += 1) particle(3);
  return { data, count: total };
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}
function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

/** If a lost WebGL context is not restored within this time, show the still artwork. */
const RESTORE_TIMEOUT_MS = 2500;

export class ParticleWave {
  private gl: WebGLRenderingContext | null = null;
  private progs: { wave: WebGLProgram; bg: WebGLProgram } | null = null;
  private buf: WebGLBuffer | null = null;
  private bgBuf: WebGLBuffer | null = null;
  private count = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private onScreen = true;
  private pageVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private reduceMotion = this.motionQuery.matches;
  private quality: Quality = INITIAL_QUALITY;
  private observer: IntersectionObserver | null = null;
  private restoreTimer = 0;
  private destroyed = false;
  private reactive: ReactiveInput = { tint: DEFAULT_TINT, bass: 0, mid: 0, high: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private opts: WaveOptions,
    private readonly onFallback: () => void,
    private readonly getReactive?: () => ReactiveInput,
  ) {
    canvas.addEventListener('webglcontextlost', this.lost);
    canvas.addEventListener('webglcontextrestored', this.restored);
    document.addEventListener('visibilitychange', this.visibility);
    this.motionQuery.addEventListener?.('change', this.motionChange);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(([e]) => {
        this.onScreen = !!e?.isIntersecting;
        this.schedule();
      });
      this.observer.observe(canvas);
    }
    if (!this.init()) onFallback();
    else this.schedule();
  }

  /** Whether the render loop is currently scheduled (for checks and debugging). */
  get running(): boolean {
    return this.raf !== 0;
  }

  set(opts: Partial<WaveOptions>) {
    if (this.destroyed) return;
    this.opts = { ...this.opts, ...opts };
    this.schedule();
  }

  /** Stops the loop, removes every listener and releases the GPU resources. */
  destroy() {
    this.destroyed = true;
    this.stop();
    clearTimeout(this.restoreTimer);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.motionQuery.removeEventListener?.('change', this.motionChange);
    this.canvas.removeEventListener('webglcontextlost', this.lost);
    this.canvas.removeEventListener('webglcontextrestored', this.restored);
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      if (this.buf) gl.deleteBuffer(this.buf);
      if (this.bgBuf) gl.deleteBuffer(this.bgBuf);
      if (this.progs) {
        gl.deleteProgram(this.progs.wave);
        gl.deleteProgram(this.progs.bg);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.progs = null;
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return false;
    try {
      this.gl = gl;
      this.progs = { wave: program(gl, VERT, FRAG), bg: program(gl, BG_VERT, BG_FRAG) };
      this.bgBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bgBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.buf = gl.createBuffer();
      this.upload();
      return true;
    } catch (err) {
      console.warn('[ParticleWave]', err);
      this.gl = null;
      return false;
    }
  }

  /** Particles for the requested density, lowered further only by adaptive quality. */
  private upload() {
    const gl = this.gl;
    if (!gl || !this.buf) return;
    const { data, count } = buildParticles(Math.min(this.opts.density, this.quality.density));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.count = count;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private draw() {
    const gl = this.gl;
    const progs = this.progs;
    if (!gl || !progs || gl.isContextLost()) return;
    this.resize();
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.useProgram(progs.bg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgBuf);
    const bp = gl.getAttribLocation(progs.bg, 'p');
    gl.enableVertexAttribArray(bp);
    gl.vertexAttribPointer(bp, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(bp);

    // `cover`: the same crop as the banner's image.
    const scale = Math.max(width / ART_W, height / ART_H);
    const offX = (width - ART_W * scale) / 2;
    const offY = (height - ART_H * scale) / 2;
    const p = progs.wave;
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const stride = FLOATS * 4;
    const attrs: [string, number, number][] = [['a0', 4, 0], ['a1', 4, 16], ['a2', 4, 32], ['a3', 2, 48]];
    const locs = attrs.map(([name, size, off]) => {
      const loc = gl.getAttribLocation(p, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
      return loc;
    });
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), this.reduceMotion ? STILL_TIME : this.time + STILL_TIME);
    gl.uniform2f(gl.getUniformLocation(p, 'uRes'), width, height);
    gl.uniform3f(gl.getUniformLocation(p, 'uCover'), scale, offX, offY);
    gl.uniform3f(gl.getUniformLocation(p, 'uTint'), ...this.reactive.tint);
    gl.uniform1f(gl.getUniformLocation(p, 'uBass'), this.reactive.bass);
    gl.uniform1f(gl.getUniformLocation(p, 'uMid'), this.reactive.mid);
    gl.uniform1f(gl.getUniformLocation(p, 'uHigh'), this.reactive.high);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, this.count);
    locs.forEach((l) => gl.disableVertexAttribArray(l));
  }

  private loop = (now: number) => {
    const ms = now - this.last;
    // Capped so a stalled frame never jumps the shape.
    const dt = Math.min(ms, 50) / 1000;
    this.last = now;
    this.time += dt * this.opts.speed;
    if (this.getReactive) this.reactive = this.getReactive();
    this.draw();
    const before = this.quality;
    this.quality = nextQuality(this.quality, ms);
    if (this.quality.density !== before.density) this.upload();
    this.raf = requestAnimationFrame(this.loop);
  };

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** One loop at most; it runs only while the wave can be seen. */
  private schedule() {
    this.stop();
    if (this.destroyed || !this.gl) return;
    const run = !this.reduceMotion && !this.opts.paused && this.onScreen && this.pageVisible;
    if (run) {
      // Time resumes where it stopped: no jump after a pause.
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else {
      this.draw();
    }
  }

  private lost = (e: Event) => {
    e.preventDefault();
    this.stop();
    clearTimeout(this.restoreTimer);
    this.restoreTimer = window.setTimeout(() => {
      if (!this.destroyed && (!this.gl || this.gl.isContextLost())) this.onFallback();
    }, RESTORE_TIMEOUT_MS);
  };

  private restored = () => {
    clearTimeout(this.restoreTimer);
    if (this.destroyed) return;
    if (this.init()) this.schedule();
    else this.onFallback();
  };

  private visibility = () => {
    this.pageVisible = document.visibilityState !== 'hidden';
    this.schedule();
  };

  private motionChange = () => {
    this.reduceMotion = this.motionQuery.matches;
    this.schedule();
  };
}
