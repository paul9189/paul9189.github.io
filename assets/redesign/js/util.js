import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const isSmall = () => window.innerWidth < 760;
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export function makeRenderer(canvas, { alpha = true } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  return r;
}

export function envFor(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pm.dispose();
  return tex;
}

/** Keep renderer + camera sized to the canvas' CSS box. Returns true if it changed. */
export function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
  if (!w || !h) return false;
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }
  return false;
}

/** A requestAnimationFrame loop that only runs while `visible` is true. */
export function makeLoop(tick) {
  let raf = 0, running = false, last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt, now / 1000);
    if (running) raf = requestAnimationFrame(frame);
  };
  return {
    set(on) {
      if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!on && running) { running = false; cancelAnimationFrame(raf); }
    },
    once() { tick(0, performance.now() / 1000); },
    get running() { return running; }
  };
}

/** Call cb(true/false) as the element enters/leaves the viewport (with margin). */
export function onVisible(el, cb, margin = '15%') {
  const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: `${margin} 0px ${margin} 0px` });
  io.observe(el);
  return io;
}

/** Shared pointer state in normalized device coordinates. */
export const pointer = { x: 0, y: 0, cx: -999, cy: -999, last: 0, down: false };
window.addEventListener('pointermove', e => {
  pointer.cx = e.clientX; pointer.cy = e.clientY;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.last = performance.now();
}, { passive: true });
window.addEventListener('pointerdown', () => { pointer.down = true; pointer.last = performance.now(); }, { passive: true });
window.addEventListener('pointerup', () => { pointer.down = false; }, { passive: true });

/** Seeded random so layouts are stable between visits. */
export function rng(seed = 1) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
