'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useVisibleAnimationFrame } from '@/hooks/useVisibleAnimationFrame';

export type CloudShaderProps = {
  className?: string;
  children?: React.ReactNode;
  /** Animation speed multiplier. 1 = default drift. */
  speed?: number;
  /** Number of clouds (1-6). */
  count?: number;
  /** Cloud tint color (hex or rgb string). */
  cloudColor?: string;
  /** Sky color at the top (hex or rgb string). */
  skyTopColor?: string;
  /** Sky color at the bottom (hex or rgb string). */
  skyBottomColor?: string;
  /**
   * Device-pixel-ratio ceiling. A full-viewport backdrop rarely needs retina
   * sharpness for soft cloud forms, and every extra pixel is multiplied by the
   * noise layers.
   */
  maxDpr?: number;
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Cloud shader (supplied component). Each cloud is an asymmetric envelope
// (dome top, flat base) filled with domain-warped billow noise. A second density
// sample above the pixel approximates self-shadowing. Clouds drift horizontally
// and wrap around.
const FRAG = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;
uniform float u_count;
uniform vec3 u_cloud;
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.03 + 19.19;
    amp *= 0.5;
  }
  return sum;
}

// billow noise: sharp puffy ridges, like cauliflower cloud tops
float billow(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * (1.0 - abs(2.0 * vnoise(p) - 1.0));
    p = R * p * 2.11 + 13.37;
    amp *= 0.5;
  }
  return sum;
}

// raw density for one cloud at point p
float cloudDensity(vec2 p, vec2 c, vec2 r, float seed, float t) {
  vec2 q = p - c;

  // envelope: dome above the center, flat base below
  float ry = q.y > 0.0 ? r.y : r.y * 0.42;
  float env = 1.0 - length(vec2(q.x / r.x, q.y / ry));
  if (env < -0.35) return 0.0;

  // domain-warped billow detail, moves with the cloud, evolves slowly
  vec2 dp = q * (2.4 / r.x) + seed;
  dp += 0.6 * vec2(
    fbm(dp * 1.4 + t * 0.04),
    fbm(dp * 1.4 + 7.7 - t * 0.03)
  );
  float detail = billow(dp * 1.6);

  return env + (detail - 0.62) * 0.62;
}

// shades one cloud and blends it over the current color
vec3 shadeCloud(vec3 color, vec3 sky, vec2 p, vec2 c, vec2 r, float seed, float t, float dist) {
  float d = cloudDensity(p, c, r, seed, t);
  if (d < 0.02) return color;

  // sample density toward the sun (straight up) for self-shadowing
  float dUp = cloudDensity(p + vec2(0.0, r.y * 0.55), c, r, seed, t);
  float occl = clamp((dUp - d) * 1.1 + d * 0.55, 0.0, 1.0);

  vec3 lit = u_cloud * 1.04;
  vec3 shadow = mix(u_cloud * 0.60, sky, 0.38);
  vec3 cloudCol = mix(lit, shadow, occl * 0.85);

  float alpha = smoothstep(0.02, 0.38, d);

  // silver lining on thin edges
  float rim = smoothstep(0.02, 0.14, d) * (1.0 - smoothstep(0.14, 0.40, d));
  cloudCol += rim * 0.10;

  // atmospheric perspective: far clouds fade into the sky
  cloudCol = mix(cloudCol, sky, dist * 0.35);
  alpha *= mix(1.0, 0.8, dist);

  return mix(color, cloudCol, alpha);
}

// one drifting cloud: horizontal wrap + gentle vertical bob
vec3 cloudPass(vec3 color, vec3 sky, vec2 p, float aspect, float t,
               float spd, float phase, float y, vec2 r, float seed, float dist) {
  float cx = mix(-r.x - 0.25, aspect + r.x + 0.25, fract(t * spd + phase));
  float cy = y + sin(t * 0.05 + phase * 6.2831) * 0.012;
  return shadeCloud(color, sky, p, vec2(cx, cy), r, seed, t, dist);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 sky = mix(u_skyBottom, u_skyTop, v_uv.y);
  vec3 color = sky;

  // faint haze band near the horizon
  color = mix(color, u_skyBottom * 1.06, smoothstep(0.35, 0.0, v_uv.y) * 0.5);

  // soft sun glow, upper area
  vec2 sunPos = vec2(aspect * 0.78, 0.92);
  float sunDist = length(p - sunPos);
  color += vec3(1.0, 0.95, 0.82) * exp(-sunDist * sunDist * 5.0) * 0.28;

  // thin cirrus streaks, stretched horizontally, high in the sky
  float cirrusBand = smoothstep(0.55, 0.8, v_uv.y) * (1.0 - smoothstep(0.9, 1.0, v_uv.y));
  if (cirrusBand > 0.01) {
    float streak = fbm(vec2(p.x * 1.6 - t * 0.006, p.y * 12.0));
    float wisp = smoothstep(0.52, 0.78, streak) * cirrusBand;
    color = mix(color, u_cloud * 0.98, wisp * 0.35);
  }

  // far layer: small, high, slow
  if (u_count > 5.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.006, 0.10, 0.84, vec2(0.20, 0.10), 43.7, 1.0);
  }
  if (u_count > 4.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.008, 0.62, 0.73, vec2(0.24, 0.12), 71.3, 0.85);
  }

  // middle layer
  if (u_count > 3.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.011, 0.33, 0.60, vec2(0.34, 0.16), 17.3, 0.55);
  }
  if (u_count > 2.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.013, 0.80, 0.47, vec2(0.30, 0.15), 29.9, 0.45);
  }

  // near layer: big, low, fast
  if (u_count > 1.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.016, 0.05, 0.35, vec2(0.46, 0.20), 91.1, 0.15);
  }
  color = cloudPass(color, sky, p, aspect, t, 0.020, 0.48, 0.20, vec2(0.56, 0.24), 57.2, 0.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

function parseHex(color: string): [number, number, number] {
  const value = color.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) / 255,
        parseInt(hex[1] + hex[1], 16) / 255,
        parseInt(hex[2] + hex[2], 16) / 255,
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const rgb = value.match(/[\d.]+/g);
  if (rgb && rgb.length >= 3) {
    return [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255];
  }
  return [0.95, 0.95, 0.95];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    console.warn('[CloudShader] could not create shader');
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Reported rather than swallowed: the caller renders its own fallback.
    console.warn('[CloudShader] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const CloudShader = ({
  className,
  children,
  speed = 1,
  count = 6,
  cloudColor = '#fbf8f2',
  skyTopColor = '#3876ba',
  skyBottomColor = '#8cbfe8',
  maxDpr = 2,
}: CloudShaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const motionRef = useRef(reducedMotion);
  motionRef.current = reducedMotion;
  /** Set by the GL effect below; the shared loop calls through it. */
  const frameRef = useRef<((now: number) => void) | null>(null);
  /** Cleared on unmount so a frame cannot touch deleted GL resources. */
  const runningRef = useRef(true);
  const paramsRef = useRef({
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
    maxDpr,
  });

  // Props are read through the ref inside the render loop rather than captured
  // by the effect, so changing a colour or density never re-creates the GL
  // context.
  paramsRef.current = {
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
    maxDpr,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // `alpha: true` on purpose: the shader writes opaque pixels, but until the
    // first frame lands the canvas stays transparent. With `alpha: false` a
    // failed compile would leave an opaque black rectangle behind the whole app.
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) {
      console.warn('[CloudShader] WebGL unavailable — falling back to the static background');
      return;
    }

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[CloudShader] program link failed:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      res: gl.getUniformLocation(program, 'u_res'),
      time: gl.getUniformLocation(program, 'u_time'),
      count: gl.getUniformLocation(program, 'u_count'),
      cloud: gl.getUniformLocation(program, 'u_cloud'),
      skyTop: gl.getUniformLocation(program, 'u_skyTop'),
      skyBottom: gl.getUniformLocation(program, 'u_skyBottom'),
    };

    runningRef.current = true;
    let elapsed = 0;
    let last = 0;
    let painted = false;
    let dirty = true;

    //
    // Adaptive quality.
    //
    // This is a full-viewport shader: on a software or weak GPU it can cost more
    // than the rest of the app combined, and it is the least important thing on
    // screen. So it measures how long frames actually take and steps itself down
    // until the frame budget is met — fewer cloud layers first (cheapest to lose
    // visually), then resolution, then frame rate. It never steps back up, so a
    // busy moment elsewhere in the app cannot make it oscillate.
    //
    let degrade = 0; // 0 full · 1 fewer clouds · 2 half resolution · 3 low frame rate
    let budget = 0;
    let samples = 0;
    let previous = 0;
    let lastRender = 0;
    // Frames during hydration and first paint are janky on every machine; measuring
    // them would degrade the ambient layer for no reason.
    let warmup = 60;
    const MAX_DEGRADE = 3;
    const FRAME_BUDGET_MS = 33; // below ~30fps the ambient layer is not paying for itself

    const settings = () => ({
      count: Math.max(2, Math.min(6, paramsRef.current.count) - (degrade >= 1 ? 2 : 0)),
      dpr: degrade >= 2 ? 1 : Math.min(paramsRef.current.maxDpr, 2),
      interval: degrade >= 3 ? 1000 / 15 : 0,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, settings().dpr);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const w = Math.max(1, Math.floor(width * dpr));
      const h = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc.res, w, h);
      dirty = true;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (now: number) => {
      if (!runningRef.current) return;
      const p = paramsRef.current;
      // Accumulate instead of measuring from a start time, so pausing while the
      // tab is hidden does not make the clouds jump when it comes back.
      if (last !== 0 && !motionRef.current) elapsed += ((now - last) / 1000) * p.speed;
      last = now;
      const cloud = parseHex(p.cloudColor);
      const skyTop = parseHex(p.skyTopColor);
      const skyBottom = parseHex(p.skyBottomColor);

      gl.uniform1f(loc.time, elapsed);
      gl.uniform1f(loc.count, settings().count);
      gl.uniform3f(loc.cloud, cloud[0], cloud[1], cloud[2]);
      gl.uniform3f(loc.skyTop, skyTop[0], skyTop[1], skyTop[2]);
      gl.uniform3f(loc.skyBottom, skyBottom[0], skyBottom[1], skyBottom[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      dirty = false;
      if (!painted) {
        painted = true;
        canvas.style.opacity = '1';
      }
    };

    const assess = () => {
      const average = budget / samples;
      budget = 0;
      samples = 0;
      if (average <= FRAME_BUDGET_MS || degrade >= MAX_DEGRADE) return;
      degrade += 1;
      if (degrade >= 2) resize();
      console.info(
        `[CloudShader] frames averaging ${average.toFixed(1)}ms — ambient quality step ${degrade}/${MAX_DEGRADE}`
      );
    };

    /**
     * One frame: skip work when nothing changed, hold the frame budget while the
     * GPU is keeping up, and hand the drawing itself to `render`. The loop and
     * visibility policy live in `useVisibleAnimationFrame`, shared with the inline
     * canvas text.
     */
    const frame = (now: number) => {
      // Under reduced motion the sky never moves, so only draw when something
      // actually changed (a resize) — a static layer should cost nothing to sit
      // there while the rest of the app gets the GPU.
      if (!dirty && motionRef.current) return;
      if (settings().interval !== 0 && now - lastRender < settings().interval) return;

      if (warmup > 0) warmup -= 1;
      // A long gap means the tab was hidden or the main thread stalled, not that
      // the shader is slow — measuring it would degrade the layer for no reason.
      else if (previous !== 0 && now - previous < 200) {
        budget += now - previous;
        samples += 1;
      }
      previous = now;
      if (samples >= 90) assess();

      lastRender = now;
      render(now);
    };

    frameRef.current = frame;

    return () => {
      runningRef.current = false;
      frameRef.current = null;
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  // Declared after the GL effect on purpose: effects run in order, so the context
  // and program exist before the shared loop paints its first frame.
  useVisibleAnimationFrame((now) => frameRef.current?.(now));

  return (
    <div className={cn('relative h-full min-h-80 w-full overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700"
      />
      {children ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
};
