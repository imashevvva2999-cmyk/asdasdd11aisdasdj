import { bindPositionAttribute, createFullscreenTriangle, program } from '../gl-utils';
import type { PointerInput } from '../types';
import { WebGLSceneController } from '../webgl-scene-controller';

/** Vertex shader is WebGL1-style ESSL 1.00 (`attribute`/`varying`), which a
 * WebGL2 context still accepts with no `#version` pragma — adapted from
 * reactbits.dev's LiquidChrome reference, with `vUv` derived from the single
 * `aPosition` attribute this plan's `createFullscreenTriangle` provides
 * instead of the reference's separate `position`/`uv` buffers. */
const VERTEX_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Fragment shader keeps the reference's domain-warp + pointer-ripple math,
 * re-art-directed for Mmusic: the mirror-chrome body flows between coral
 * (`uColorA`) and amber (`uColorB`) instead of a single neutral gray, the
 * pointer ripple tints toward coral-orange (`uColorC`) so the interaction
 * reads as its own warm glow rather than a generic distortion, and the warp
 * iteration count / supersampling are uniform-driven so a card-sized surface
 * can run a cheaper pass than the expanded view. */
const FRAGMENT_SRC = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform vec2 uMouse;
uniform int uWarpIterations;
uniform int uSupersample;
varying vec2 vUv;

// GLSL ES 1.00 (the dialect a version-less shader runs as, even under a
// WebGL2 context) requires for-loop bounds to be compile-time constants, so
// uWarpIterations cannot sit in a loop condition. Two fixed-bound loops
// selected by a uniform-driven if give the same card-vs-expanded cost
// trade-off within that restriction.
vec2 warp(vec2 uv) {
    if (uWarpIterations > 6) {
        for (int i = 1; i < 11; i++) {
            float fi = float(i);
            uv.x += uAmplitude / fi * cos(fi * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
            uv.y += uAmplitude / fi * cos(fi * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
        }
    } else {
        for (int i = 1; i < 7; i++) {
            float fi = float(i);
            uv.x += uAmplitude / fi * cos(fi * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
            uv.y += uAmplitude / fi * cos(fi * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
        }
    }
    return uv;
}

vec3 renderImage(vec2 uvCoord) {
    vec2 fragCoord = uvCoord * uResolution.xy;
    vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);
    uv = warp(uv);

    vec2 diff = uvCoord - uMouse;
    float dist = length(diff);
    float falloff = exp(-dist * 18.0);
    float ripple = sin(10.0 * dist - uTime * 2.2) * 0.035;
    uv += (diff / (dist + 0.0001)) * ripple * falloff;

    float flowPhase = 0.5 + 0.5 * sin(uv.x * 1.3 - uv.y * 1.1 + uTime * 0.18);
    vec3 body = mix(uColorA, uColorB, flowPhase);

    float shade = abs(sin(uTime - uv.y - uv.x));
    vec3 chrome = body / max(shade, 0.0005);
    vec3 glow = uColorC * falloff * 0.85;
    return chrome + glow;
}

void main() {
    vec3 col;
    if (uSupersample > 0) {
        vec3 sum = vec3(0.0);
        int samples = 0;
        for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
                vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                sum += renderImage(vUv + offset);
                samples++;
            }
        }
        col = sum / float(samples);
    } else {
        col = renderImage(vUv);
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

/** Mmusic palette (`ui-kit/tokens/colors.ts`). `uColorA`/
 * `uColorB` feed the `body / shade` division, so — exactly like the
 * reference's own `[0.1, 0.1, 0.1]` base — they stay at a small ambient
 * magnitude (hue preserved, scaled down ~6x from the raw hex) rather than
 * full-saturation 1.0 components: at saturation, that division blows the
 * entire surface to white instead of only its sin-crossing highlight bands.
 * `uColorC` is the pointer glow, added after the division, so it stays at
 * full saturation — it is meant to visibly bloom, not shade a body. */
const COLOR_A: readonly [number, number, number] = [0.16, 0.047, 0.047]; // #FF4B4B, scaled
const COLOR_B: readonly [number, number, number] = [0.144, 0.098, 0.021]; // #F5A623, scaled
const COLOR_C: readonly [number, number, number] = [1.0, 0.4784, 0.349]; // #FF7A59, full

/** Device-pixel canvas width above which the scene treats itself as the
 * expanded (near-fullscreen) card rather than the grid thumbnail — there is
 * no explicit "expanded" flag from the host, so size is the signal.
 * Measured against the real 4-card grid (`WebGLSceneController.resize()`
 * clamps effective DPR to 2): grid-card device-pixel width ranges ~207
 * (desktop, DPR 1) to 414 (desktop, DPR 2); the expanded view — capped by
 * this web build's fixed mobile-frame max content width — ranges 480
 * (DPR 1) to 960 (DPR 2, or an iPhone's DPR 3 clamped to 2). 500 sat above
 * the expanded view's own DPR-1 minimum (480), so a non-Retina desktop
 * expanded view never crossed it and stayed on CARD_TUNING. 450 sits in the
 * gap between the card maximum (414) and the expanded minimum (480). */
const EXPANDED_WIDTH_PX = 450;

/** Idle/calm tuning for the card-grid thumbnail: lower amplitude and
 * frequency so the surface reads as a slow, composed metallic drift, with a
 * cheaper single-sample draw and fewer warp iterations since supersampling
 * at that size buys little visible anti-aliasing. */
const CARD_TUNING = { amplitude: 0.24, frequencyX: 2.2, frequencyY: 1.6, timeScale: 0.6, warpIterations: 6, supersample: 0 };

/** More dramatic tuning for the expanded view: higher amplitude/frequency
 * and full supersampling, since the surface fills the viewport and the
 * extra cost is worth the smoother edges. */
const EXPANDED_TUNING = { amplitude: 0.42, frequencyX: 3.4, frequencyY: 2.6, timeScale: 1.0, warpIterations: 10, supersample: 1 };

/** Mouse-ease time constant (seconds) — the pointer target is approached
 * exponentially rather than snapped to, so the ripple's origin always feels
 * like it is gliding into place. */
const MOUSE_EASE_TAU = 0.22;

export class LiquidChromeScene extends WebGLSceneController {
  /** No field initializers below — `WebGLSceneController`'s constructor
   * calls `onInit` (and possibly `onResize`/`onFrame`) synchronously from
   * inside `super()`, which runs before this subclass's own field
   * initializers would execute. A `= value` initializer here would silently
   * overwrite whatever `onInit` just assigned the moment `super()` returns.
   * Everything is assigned explicitly inside `onInit` instead. */
  private prog!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private uniforms!: Record<string, WebGLUniformLocation | null>;
  private tuning!: typeof CARD_TUNING;
  private mouseX!: number;
  private mouseY!: number;

  protected onInit(gl: WebGL2RenderingContext): void {
    const prog = program(gl, VERTEX_SRC, FRAGMENT_SRC);
    const buffer = createFullscreenTriangle(gl);
    bindPositionAttribute(gl, prog, buffer);
    this.prog = prog;
    this.buffer = buffer;
    this.tuning = CARD_TUNING;
    this.mouseX = 0.5;
    this.mouseY = 0.5;

    this.uniforms = {
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uResolution: gl.getUniformLocation(prog, 'uResolution'),
      uColorA: gl.getUniformLocation(prog, 'uColorA'),
      uColorB: gl.getUniformLocation(prog, 'uColorB'),
      uColorC: gl.getUniformLocation(prog, 'uColorC'),
      uAmplitude: gl.getUniformLocation(prog, 'uAmplitude'),
      uFrequencyX: gl.getUniformLocation(prog, 'uFrequencyX'),
      uFrequencyY: gl.getUniformLocation(prog, 'uFrequencyY'),
      uMouse: gl.getUniformLocation(prog, 'uMouse'),
      uWarpIterations: gl.getUniformLocation(prog, 'uWarpIterations'),
      uSupersample: gl.getUniformLocation(prog, 'uSupersample'),
    };

    gl.useProgram(prog);
    gl.uniform3f(this.uniforms.uColorA, ...COLOR_A);
    gl.uniform3f(this.uniforms.uColorB, ...COLOR_B);
    gl.uniform3f(this.uniforms.uColorC, ...COLOR_C);
    this.applyTuning(gl);
  }

  protected onResize(gl: WebGL2RenderingContext, width: number, height: number): void {
    gl.useProgram(this.prog);
    gl.uniform3f(this.uniforms.uResolution, width, height, width / height);
    const nextTuning = width >= EXPANDED_WIDTH_PX ? EXPANDED_TUNING : CARD_TUNING;
    if (nextTuning !== this.tuning) {
      this.tuning = nextTuning;
      this.applyTuning(gl);
    }
  }

  protected onFrame(gl: WebGL2RenderingContext, dt: number, time: number, pointer: PointerInput): void {
    const targetX = pointer.active ? pointer.x : 0.5;
    const targetY = pointer.active ? 1 - pointer.y : 0.5;
    const ease = dt > 0 ? 1 - Math.exp(-dt / MOUSE_EASE_TAU) : 1;
    this.mouseX += (targetX - this.mouseX) * ease;
    this.mouseY += (targetY - this.mouseY) * ease;

    gl.useProgram(this.prog);
    gl.uniform1f(this.uniforms.uTime, time * this.tuning.timeScale);
    gl.uniform2f(this.uniforms.uMouse, this.mouseX, this.mouseY);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  protected onDispose(gl: WebGL2RenderingContext): void {
    gl.deleteProgram(this.prog);
    gl.deleteBuffer(this.buffer);
  }

  private applyTuning(gl: WebGL2RenderingContext) {
    gl.uniform1f(this.uniforms.uAmplitude, this.tuning.amplitude);
    gl.uniform1f(this.uniforms.uFrequencyX, this.tuning.frequencyX);
    gl.uniform1f(this.uniforms.uFrequencyY, this.tuning.frequencyY);
    gl.uniform1i(this.uniforms.uWarpIterations, this.tuning.warpIterations);
    gl.uniform1i(this.uniforms.uSupersample, this.tuning.supersample);
  }
}
