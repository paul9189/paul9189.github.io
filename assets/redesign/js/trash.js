// Trash → Treasure: a pile of junk that rebuilds itself into each project's result as you scroll.
import * as THREE from 'three';
import { makeRenderer, envFor, fit, makeLoop, pointer, clamp, lerp, easeInOut, rng, isSmall } from './util.js';

const GROUND = -1.4;

function bottleGeo() {
  const pts = [[0, 0], [.085, 0], [.095, .02], [.095, .22], [.06, .3], [.032, .34], [.032, .4], [0, .4]].map(([x, y]) => new THREE.Vector2(x, y - .2));
  return new THREE.LatheGeometry(pts, 14);
}
function fabricGeo() {
  const g = new THREE.PlaneGeometry(.24, .17, 6, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * .018 + Math.cos(p.getY(i) * 30) * .012);
  g.computeVertexNormals();
  return g;
}

const TYPES = [
  { key: 'bottle', geo: bottleGeo, n: 60, cols: ['#3ecf8e', '#2aa36b', '#7fd6ff', '#a7f0d0', '#c9a36a'], mat: () => new THREE.MeshPhysicalMaterial({ roughness: .08, metalness: 0, transparent: true, opacity: .78, clearcoat: 1, envMapIntensity: 1.6 }) },
  { key: 'can', geo: () => new THREE.CylinderGeometry(.055, .055, .2, 18), n: 70, cols: ['#ff4f5e', '#c0c8d0', '#2e73c2', '#ffb020', '#e8eef3'], mat: () => new THREE.MeshStandardMaterial({ roughness: .25, metalness: .85, envMapIntensity: 1.3 }) },
  { key: 'cap', geo: () => new THREE.CylinderGeometry(.04, .04, .022, 14), n: 110, cols: ['#ff5fae', '#ffcc00', '#3ecf8e', '#74b4ff', '#ff4757', '#ffffff', '#a77bff'], mat: () => new THREE.MeshStandardMaterial({ roughness: .4, metalness: .1 }) },
  { key: 'fabric', geo: fabricGeo, n: 95, cols: ['#ff5fae', '#a77bff', '#3b5b8f', '#f6f3ec', '#ffb020', '#2b2b2b', '#e85d75'], mat: () => new THREE.MeshStandardMaterial({ roughness: .85, side: THREE.DoubleSide }) },
  { key: 'box', geo: () => new THREE.BoxGeometry(.15, .1, .06), n: 40, cols: ['#b98a55', '#a3774a', '#d1a46f'], mat: () => new THREE.MeshStandardMaterial({ roughness: .9 }) },
  { key: 'crumple', geo: () => new THREE.IcosahedronGeometry(.075, 0), n: 60, cols: ['#e8eef3', '#c9d3db', '#9fb4c4', '#fff6d6'], mat: () => new THREE.MeshStandardMaterial({ roughness: .7, flatShading: true }) }
];

// ---------- target shapes: return [{p:Vector3, n:Vector3}] of length N ----------
function pile(N, r) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const rad = Math.sqrt(r()) * 1.7, a = r() * Math.PI * 2;
    const h = (1 - rad / 1.8) * .95 * Math.sqrt(r());
    out.push({ p: new THREE.Vector3(Math.cos(a) * rad, GROUND + .06 + h, Math.sin(a) * rad * .8), n: null });
  }
  return out;
}

function onSphere(c, rad, r) {
  const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  const n = new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a));
  return { p: c.clone().addScaledVector(n, rad), n };
}

function tree(N, r) {
  const out = [];
  const tips = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI * 2 + .3;
    tips.push(new THREE.Vector3(Math.cos(a) * (.7 + r() * .35), .55 + r() * .55, Math.sin(a) * (.55 + r() * .3)));
  }
  tips.push(new THREE.Vector3(0, 1.35, 0));
  for (let i = 0; i < N; i++) {
    const k = i / N;
    if (k < .22) { // trunk
      const y = GROUND + r() * 1.8, a = r() * Math.PI * 2, rad = .17 - (y - GROUND) * .03 + (y < GROUND + .25 ? (GROUND + .25 - y) * .6 : 0);
      out.push({ p: new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
    } else if (k < .42) { // branches
      const t = tips[(r() * tips.length) | 0], s = r();
      const start = new THREE.Vector3(0, .1 + r() * .3, 0);
      const p = start.clone().lerp(t, s); p.x += (r() - .5) * .06; p.z += (r() - .5) * .06;
      out.push({ p, n: t.clone().sub(start).normalize() });
    } else { // crown clusters
      const t = tips[(r() * tips.length) | 0];
      out.push(onSphere(t, .26 + r() * .2, r));
    }
  }
  return out;
}

function dress(N, r) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const k = i / N;
    if (k < .24) { // bodice
      const y = .5 + r() * .65, a = r() * Math.PI * 2, rad = .22 + (y - .5) * .14;
      out.push({ p: new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad * .72), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
    } else if (k < .9) { // flared skirt with a wavy hem
      const t = Math.pow(r(), .8), a = r() * Math.PI * 2;
      const y = lerp(.5, GROUND + .12, t);
      const rad = lerp(.22, 1.0, t) * (1 + .09 * Math.sin(a * 7) * t);
      out.push({ p: new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad * .85), n: new THREE.Vector3(Math.cos(a), .35, Math.sin(a)).normalize() });
    } else if (k < .95) { // neck + stand knob
      out.push(onSphere(new THREE.Vector3(0, 1.32, 0), .09 + r() * .03, r));
    } else { // belt
      const a = r() * Math.PI * 2;
      out.push({ p: new THREE.Vector3(Math.cos(a) * .25, .5, Math.sin(a) * .19), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
    }
  }
  return out;
}

function drums(N, r) {
  const kit = [
    { c: new THREE.Vector3(0, GROUND, -.25), rad: .55, h: 1.0, w: .34 }, // big bucket
    { c: new THREE.Vector3(-1.0, GROUND, .25), rad: .33, h: .62, w: .16 },
    { c: new THREE.Vector3(1.0, GROUND, .2), rad: .36, h: .55, w: .16 },
    { c: new THREE.Vector3(-.55, -.35, .6), rad: .26, h: .22, w: .1 }, // pot on stand
    { c: new THREE.Vector3(.45, -.55, .7), rad: .2, h: .3, w: .07 }
  ];
  const tot = kit.reduce((s, d) => s + d.w, 0);
  const cym = { c: new THREE.Vector3(.95, .75, -.05), rad: .42 };
  for (let i = 0, out = []; ; i++) {
    if (i >= N) return out;
    const k = i / N;
    if (k < .74) {
      let x = r() * tot, d = kit[0];
      for (const q of kit) { if (x < q.w) { d = q; break; } x -= q.w; }
      const a = r() * Math.PI * 2;
      if (r() < .7) { // side
        const y = d.c.y + r() * d.h;
        out.push({ p: new THREE.Vector3(d.c.x + Math.cos(a) * d.rad, y, d.c.z + Math.sin(a) * d.rad), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
      } else { // drum head
        const rr = Math.sqrt(r()) * d.rad;
        out.push({ p: new THREE.Vector3(d.c.x + Math.cos(a) * rr, d.c.y + d.h, d.c.z + Math.sin(a) * rr), n: new THREE.Vector3(0, 1, 0) });
      }
    } else if (k < .9) { // cymbal disc made of caps
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * cym.rad;
      const p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr * .25 + rr * .1, Math.sin(a) * rr);
      out.push({ p: p.add(cym.c), n: new THREE.Vector3(.15, 1, .1).normalize() });
    } else { // stands
      const which = r();
      const top = which < .6 ? cym.c : kit[3].c, bottom = new THREE.Vector3(top.x, GROUND, top.z);
      out.push({ p: top.clone().lerp(bottom, r()), n: new THREE.Vector3(0, 1, 0) });
    }
  }
}

export function createTrash(section) {
  const canvas = section.querySelector('.transform__canvas');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 60);
  const root = new THREE.Group(); scene.add(root);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a1208, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(3, 5, 4); scene.add(sun);
  const mood = new THREE.PointLight(0x74b4ff, 14, 9); mood.position.set(-2, 1.5, 2); scene.add(mood);

  // floor glow
  const fc = document.createElement('canvas'); fc.width = fc.height = 256;
  const fg = fc.getContext('2d'), grad = fg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(116,180,255,.35)'); grad.addColorStop(.4, 'rgba(46,115,194,.12)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  fg.fillStyle = grad; fg.fillRect(0, 0, 256, 256);
  const floorTex = new THREE.CanvasTexture(fc);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = GROUND - .01; root.add(floor);

  const scale = isSmall() ? .55 : 1;
  const r = rng(42);
  const pieces = [];
  const meshes = TYPES.map(T => {
    const count = Math.round(T.n * scale);
    const m = new THREE.InstancedMesh(T.geo(), T.mat(), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      col.set(T.cols[(r() * T.cols.length) | 0]); m.setColorAt(i, col);
      pieces.push({ mesh: m, idx: i, s: .8 + r() * .55, delay: r(), lift: .4 + r() * .9, axis: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), spin: r() * Math.PI * 2 });
    }
    m.instanceColor.needsUpdate = true;
    root.add(m);
    return m;
  });
  const N = pieces.length;

  // states: pile → tree → pile → dress → pile → drums
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const shapes = [pile(N, rng(1)), shuffle(tree(N, r)), pile(N, rng(2)), shuffle(dress(N, r)), pile(N, rng(3)), shuffle(drums(N, r))];
  const up = new THREE.Vector3(0, 1, 0);
  const states = shapes.map(sh => sh.map((t, i) => {
    const q = new THREE.Quaternion();
    if (t.n) q.setFromUnitVectors(up, t.n.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, pieces[i].spin));
    else q.setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
    return { p: t.p, q };
  }));
  const STOPS = [0, .19, .35, .55, .71, .91];
  const MOODS = ['#74b4ff', '#3ecf8e', '#74b4ff', '#ff5fae', '#74b4ff', '#ffb020'];

  const labels = [...section.querySelectorAll('.stage-label')];
  const dotEls = [...section.querySelectorAll('.transform__dots li')];
  const tip = section.querySelector('.transform__tip');
  let progress = 0, shown = 0;
  const off = new Float32Array(N * 3);

  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), tq = new THREE.Quaternion(), sc = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), gplane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(GROUND + .3)), ghit = new THREE.Vector3();
  const moodCol = new THREE.Color(), tmpCol = new THREE.Color();

  const loop = makeLoop((dt, now) => {
    fit(renderer, camera, canvas);
    shown = lerp(shown, progress, 1 - Math.pow(.002, dt));
    const p = shown;
    // which segment?
    let seg = 0;
    while (seg < STOPS.length - 2 && p > STOPS[seg + 1]) seg++;
    const a = STOPS[seg], b = STOPS[seg + 1];
    const hold = .3; // portion of each segment that holds still at the end
    const segT = clamp((p - a) / ((b - a) * (1 - hold)));
    const A = states[seg], B = states[seg + 1];
    const stateF = seg + segT;

    // pointer push (strongest when in a pile)
    const pileW = 1 - Math.min(1, Math.min(...[0, 2, 4].map(s => Math.abs(stateF - s))) * 2);
    let px = 1e9, pz = 1e9;
    if (pileW > 0 && performance.now() - pointer.last < 2000) {
      const rc = canvas.getBoundingClientRect();
      ndc.set(((pointer.cx - rc.left) / rc.width) * 2 - 1, -((pointer.cy - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(gplane, ghit)) { root.worldToLocal(ghit); px = ghit.x; pz = ghit.z; }
    }

    for (let i = 0; i < N; i++) {
      const pc = pieces[i];
      const t = easeInOut(clamp((segT - pc.delay * .35) / .65));
      pos.lerpVectors(A[i].p, B[i].p, t);
      pos.y += Math.sin(t * Math.PI) * pc.lift;
      q.slerpQuaternions(A[i].q, B[i].q, t);
      if (t > 0 && t < 1) q.multiply(tq.setFromAxisAngle(pc.axis, Math.sin(t * Math.PI) * 2.4));
      // push
      const dx = pos.x - px, dz = pos.z - pz, d2 = dx * dx + dz * dz;
      let ox = 0, oy = 0, oz = 0;
      if (d2 < .5) { const f = (1 - d2 / .5) * pileW, d = Math.sqrt(d2) + .001; ox = dx / d * f * .5; oz = dz / d * f * .5; oy = f * .35; }
      const o = i * 3;
      off[o] += (ox - off[o]) * .12; off[o + 1] += (oy - off[o + 1]) * .12; off[o + 2] += (oz - off[o + 2]) * .12;
      pos.x += off[o]; pos.y += off[o + 1]; pos.z += off[o + 2];
      sc.setScalar(pc.s);
      m4.compose(pos, q, sc);
      pc.mesh.setMatrixAt(pc.idx, m4);
    }
    meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });

    // mood light follows the stage colour
    const near = Math.round(stateF);
    moodCol.set(MOODS[near]); tmpCol.copy(mood.color).lerp(moodCol, .05); mood.color.copy(tmpCol);

    // camera orbit
    const wide = camera.aspect > 1.15;
    const ang = -.35 + p * 1.6 + pointer.x * .12 + Math.sin(now * .2) * .05;
    const dist = wide ? 6.9 : 8 / Math.max(.62, camera.aspect);
    camera.position.set(Math.sin(ang) * dist, 1.1 + pointer.y * -.2, Math.cos(ang) * dist);
    root.position.y = wide ? 0 : .55;
    camera.lookAt(0, wide ? .2 : .35, 0);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (wide) camera.setViewOffset(W, H, -W * .17, 0, W, H); else camera.clearViewOffset();
    renderer.render(scene, camera);

    // labels + dots
    labels.forEach(l => l.classList.toggle('on', Math.abs(stateF - +l.dataset.at) < .3));
    const step = [0, 1, 3, 5].reduce((best, s, k) => (Math.abs(stateF - s) < Math.abs(stateF - [0, 1, 3, 5][best]) ? k : best), 0);
    dotEls.forEach((d, k) => d.classList.toggle('on', k === step));
    tip.style.opacity = stateF > 4.7 ? 1 : 0;
  });

  return {
    setProgress(v) { progress = v; if (!loop.running) { shown = v; loop.once(); } },
    setVisible(v) { loop.set(v); }
  };
}
