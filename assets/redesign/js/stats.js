// Numbers you can touch: four small physical simulations on 2D canvas.
import { clamp, onVisible, rng } from './util.js';

function setup(cv) {
  const g = cv.getContext('2d');
  const st = { g, w: 0, h: 0, mx: -1e4, my: -1e4, over: false, down: false };
  st.resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (w && (cv.width !== (w * dpr | 0) || cv.height !== (h * dpr | 0))) { cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); st.w = w; st.h = h; return true; }
    return false;
  };
  const pt = e => { const r = cv.getBoundingClientRect(); st.mx = e.clientX - r.left; st.my = e.clientY - r.top; };
  cv.addEventListener('pointermove', e => { pt(e); st.over = true; });
  cv.addEventListener('pointerdown', e => { pt(e); st.down = true; st.over = true; st.onDown && st.onDown(); });
  window.addEventListener('pointerup', () => { st.down = false; st.onUp && st.onUp(); });
  cv.addEventListener('pointerleave', () => { st.over = false; if (!st.down) { st.mx = st.my = -1e4; } });
  return st;
}

// 1000+ particles that gather into the number
function particles(cv) {
  const st = setup(cv), N = 1000, r = rng(5);
  const P = Array.from({ length: N }, () => ({ x: r(), y: r(), vx: 0, vy: 0, tx: 0, ty: 0, c: r() }));
  let formed = 0;
  const targets = () => {
    const o = document.createElement('canvas'), w = st.w, h = st.h; o.width = w; o.height = h;
    const g = o.getContext('2d'); g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(h * .42); g.font = `800 ${fs}px Unbounded, Manrope, sans-serif`;
    const tw = g.measureText('1000+').width; if (tw > w * .86) { fs = Math.floor(fs * w * .86 / tw); g.font = `800 ${fs}px Unbounded, Manrope, sans-serif`; }
    g.fillText('1000+', w / 2, h / 2);
    const d = g.getImageData(0, 0, w, h).data, pts = [];
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
    P.forEach((p, i) => { const q = pts[(i * 7919) % Math.max(1, pts.length)] || [w / 2, h / 2]; p.tx = q[0]; p.ty = q[1]; });
  };
  let init = false;
  return () => {
    const changed = st.resize(); if (!st.w) return;
    if (changed || !init) { targets(); if (!init) P.forEach(p => { p.x *= st.w; p.y *= st.h; }); init = true; }
    const { g, w, h } = st;
    formed = Math.min(1, formed + .025);
    g.clearRect(0, 0, w, h);
    for (const p of P) {
      p.vx += (p.tx - p.x) * .02 * formed; p.vy += (p.ty - p.y) * .02 * formed;
      const dx = p.x - st.mx, dy = p.y - st.my, d2 = dx * dx + dy * dy;
      if (d2 < 2500) { const f = (2500 - d2) / 2500 * 3; const d = Math.sqrt(d2) + .1; p.vx += dx / d * f; p.vy += dy / d * f; }
      p.vx *= .86; p.vy *= .86; p.x += p.vx; p.y += p.vy;
      g.fillStyle = p.c < .15 ? '#ffcc00' : p.c < .55 ? '#74b4ff' : '#2e73c2';
      g.fillRect(p.x - 1, p.y - 1, 2.2, 2.2);
    }
  };
}

// 95.1% glass vessel with sloshing liquid
function vessel(cv) {
  const st = setup(cv);
  let t = 0, tilt = 0, slosh = 0, lastScroll = scrollY, bubbles = [];
  window.addEventListener('scroll', () => { slosh = Math.min(1.5, slosh + Math.abs(scrollY - lastScroll) * .004); lastScroll = scrollY; }, { passive: true });
  return () => {
    st.resize(); if (!st.w) return; const { g, w, h } = st; t += 1 / 60;
    const target = st.over ? clamp((st.mx / w - .5) * 2, -1, 1) * .18 : 0;
    const prev = tilt; tilt += (target - tilt) * .06; slosh = Math.min(1.5, slosh * .97 + Math.abs(tilt - prev) * 6);
    g.clearRect(0, 0, w, h);
    const bx = w * .26, bw = w * .48, top = h * .14, bot = h * .86, H = bot - top;
    const level = bot - H * .951;
    g.save(); g.translate(w / 2, bot); g.rotate(tilt * .5); g.translate(-w / 2, -bot);
    // liquid
    g.save();
    g.beginPath(); g.roundRect ? g.roundRect(bx, top, bw, H, [6, 6, 26, 26]) : g.rect(bx, top, bw, H); g.clip();
    const grad = g.createLinearGradient(0, level, 0, bot); grad.addColorStop(0, '#74b4ff'); grad.addColorStop(1, '#173f72');
    g.fillStyle = grad; g.beginPath(); g.moveTo(bx - 10, bot + 10);
    for (let x = bx - 10; x <= bx + bw + 10; x += 4) {
      const k = (x - bx) / bw;
      const y = level + Math.sin(k * 7 + t * 3) * (2 + slosh * 9) + Math.sin(k * 3 - t * 2) * slosh * 6 - (k - .5) * tilt * -H * .5;
      g.lineTo(x, y);
    }
    g.lineTo(bx + bw + 10, bot + 10); g.closePath(); g.fill();
    if (Math.random() < .2) bubbles.push({ x: bx + Math.random() * bw, y: bot, r: 1 + Math.random() * 3 });
    g.fillStyle = 'rgba(255,255,255,.35)';
    bubbles = bubbles.filter(b => { b.y -= 1 + b.r * .4; b.x += Math.sin(b.y * .05) * .3; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.28); g.fill(); return b.y > level + 6; });
    g.restore();
    // glass
    g.strokeStyle = 'rgba(200,230,255,.55)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(bx, top, bw, H, [6, 6, 26, 26]) : g.rect(bx, top, bw, H); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx + 8, top + 10, 8, H - 30);
    g.strokeStyle = 'rgba(200,230,255,.35)'; g.lineWidth = 1; g.font = '600 10px JetBrains Mono, monospace'; g.fillStyle = 'rgba(200,230,255,.6)';
    [.25, .5, .75, 1].forEach(f => { const y = bot - H * f; g.beginPath(); g.moveTo(bx + bw - 14, y); g.lineTo(bx + bw, y); g.stroke(); g.fillText(`${f * 100}`, bx + bw + 6, y + 3); });
    g.restore();
  };
}

// 500,000+ reached: ripples
function ripple(cv, countEl) {
  const st = setup(cv);
  let rings = [], t = 0, lastAuto = 0, lastMove = 0, counted = 0;
  st.onDown = () => rings.push({ x: st.mx, y: st.my, r: 0, a: 1, big: true });
  return () => {
    st.resize(); if (!st.w) return; const { g, w, h } = st; t += 1 / 60;
    if (t - lastAuto > 1.4) { lastAuto = t; rings.push({ x: w / 2, y: h / 2, r: 0, a: .8 }); }
    if (st.over && t - lastMove > .25) { lastMove = t; rings.push({ x: st.mx, y: st.my, r: 0, a: .5 }); }
    g.clearRect(0, 0, w, h);
    rings = rings.filter(rg => {
      rg.r += rg.big ? 2.6 : 1.6; rg.a *= .985;
      g.strokeStyle = `rgba(116,180,255,${rg.a * clamp(1 - rg.r / (w * .75))})`; g.lineWidth = rg.big ? 2.5 : 1.5;
      g.beginPath(); g.arc(rg.x, rg.y, rg.r, 0, 6.28); g.stroke();
      return rg.r < w * .75 && rg.a > .02;
    });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 5, 0, 6.28); g.fill();
    if (counted < 1) { counted = Math.min(1, counted + .008); const e = 1 - Math.pow(1 - counted, 3); countEl.textContent = Math.round(500000 * e).toLocaleString('en-US'); }
  };
}

// 50+ partners: beads on springs, draggable
function beads(cv) {
  const st = setup(cv), N = 50, r = rng(8);
  const cols = ['#74b4ff', '#3ecf8e', '#ff5fae', '#ffb020', '#a77bff', '#ffcc00', '#ff4757'];
  let B = null, drag = -1;
  const build = () => {
    const cx = st.w / 2, cy = st.h / 2, R = Math.min(st.w, st.h) * .36;
    B = Array.from({ length: N }, (_, i) => {
      const a = i / N * Math.PI * 2, rr = R * (i % 2 ? .78 : 1);
      const ax = cx + Math.cos(a) * rr, ay = cy + Math.sin(a) * rr;
      return { x: ax + (r() - .5) * 40, y: ay + (r() - .5) * 40, px: ax, py: ay, ax, ay, c: cols[i % cols.length], s: 4 + r() * 3 };
    });
    B.forEach(b => { b.px = b.x; b.py = b.y; });
  };
  st.onDown = () => { let best = -1, bd = 900; B.forEach((b, i) => { const d = (b.x - st.mx) ** 2 + (b.y - st.my) ** 2; if (d < bd) { bd = d; best = i; } }); drag = best; };
  st.onUp = () => { drag = -1; };
  return () => {
    const changed = st.resize(); if (!st.w) return;
    if (changed || !B) build();
    const { g, w, h } = st, cx = w / 2, cy = h / 2;
    for (let i = 0; i < N; i++) {
      const b = B[i];
      if (i === drag) { b.px = b.x; b.py = b.y; b.x = st.mx; b.y = st.my; continue; }
      const vx = (b.x - b.px) * .9, vy = (b.y - b.py) * .9;
      b.px = b.x; b.py = b.y;
      b.x += vx + (b.ax - b.x) * .02; b.y += vy + (b.ay - b.y) * .02;
    }
    for (let it = 0; it < 3; it++) for (let i = 0; i < N; i++) { // neighbour springs
      const a = B[i], c = B[(i + 2) % N];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1, rest = Math.hypot(c.ax - a.ax, c.ay - a.ay);
      const f = (d - rest) / d * .25;
      if (i !== drag) { a.x += dx * f; a.y += dy * f; }
      if ((i + 2) % N !== drag) { c.x -= dx * f; c.y -= dy * f; }
    }
    g.clearRect(0, 0, w, h);
    g.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      const a = B[i], c = B[(i + 2) % N];
      g.strokeStyle = 'rgba(116,180,255,.28)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
      g.strokeStyle = 'rgba(116,180,255,.07)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(a.x, a.y); g.stroke();
    }
    for (const b of B) {
      const gr = g.createRadialGradient(b.x - b.s * .3, b.y - b.s * .3, 0, b.x, b.y, b.s);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.35, b.c); gr.addColorStop(1, 'rgba(0,0,0,.3)');
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.s, 0, 6.28); g.fill();
    }
    g.fillStyle = '#fff'; g.font = '700 11px JetBrains Mono, monospace'; g.textAlign = 'center'; g.fillText('KROSNO', cx, cy + 4);
    cv.style.cursor = drag >= 0 ? 'grabbing' : 'grab';
  };
}

export function initStats(root) {
  const makers = { particles, vessel, ripple: cv => ripple(cv, root.querySelector('.count')), beads };
  root.querySelectorAll('canvas[data-stat]').forEach(cv => {
    const draw = makers[cv.dataset.stat](cv);
    let raf = 0;
    const frame = () => { draw(); raf = requestAnimationFrame(frame); };
    onVisible(cv, v => { cancelAnimationFrame(raf); if (v) raf = requestAnimationFrame(frame); }, '0%');
  });
}
