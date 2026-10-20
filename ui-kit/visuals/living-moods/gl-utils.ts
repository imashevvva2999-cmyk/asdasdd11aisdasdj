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
