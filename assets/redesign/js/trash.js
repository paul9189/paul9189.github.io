// Trash → Treasure: a pile of junk that rebuilds itself into each project's result as you scroll.
import * as THREE from 'three';
import { makeRenderer, envFor, compileScene, fit, makeLoop, pointer, clamp, lerp, smooth, easeInOut, rng, isSmall } from './util.js';

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
  { key: 'can', geo: () => new THREE.CylinderGeometry(.055, .055, .2, 18), n: 70, cols: ['#ff4f5e', '#c0c8d0', '#2e73c2', '#ffb020', '#e8eef3'], mat: () => new THREE.MeshStandardMaterial({ roughness: .3, metalness: .5, envMapIntensity: .9 }) },
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

// ---------- built shapes: every kind of junk gets the job it suits, laid flat on the surface ----------
// Which local axis of each piece faces out of the surface, and which runs along it.
const AXES = { bottle: ['z', 'y'], can: ['z', 'y'], cap: ['y', 'x'], fabric: ['z', 'y'], box: ['z', 'x'], crumple: ['y', 'x'] };
const UNIT = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const GOLD = .6180339887;

function perp(n, spin) {
  const u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < .9 ? UNIT.y : UNIT.x).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  return u.multiplyScalar(Math.cos(spin)).addScaledVector(v, Math.sin(spin));
}

function orient(key, n, t, spin) {
  const [an, at] = AXES[key];
  n = n.clone().normalize();
  t = (t ? t.clone() : perp(n, spin)).addScaledVector(n, -(t ? t.dot(n) : 0)).normalize();
  const L = new THREE.Matrix4().makeBasis(UNIT[an], UNIT[at], new THREE.Vector3().crossVectors(UNIT[an], UNIT[at]));
  const W = new THREE.Matrix4().makeBasis(n, t, new THREE.Vector3().crossVectors(n, t));
  return new THREE.Quaternion().setFromRotationMatrix(W.multiply(L.transpose()));
}

// Surfaces map stratified (u, w) in [0,1)² to { p, n, t? }
function basis(axis) {
  const a = axis.clone().normalize(), e1 = perp(a, 0), e2 = new THREE.Vector3().crossVectors(a, e1);
  return { a, e1, e2, rad: ang => e1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(e2, Math.sin(ang)) };
}
const cylSide = (c, axis, rad, h) => { const B = basis(axis); return (u, w) => { const d = B.rad(w * Math.PI * 2); return { p: c.clone().addScaledVector(B.a, u * h).addScaledVector(d, rad), n: d, t: B.a }; }; };
const disc = (c, axis, rad, bell = 0) => { const B = basis(axis); return (u, w) => { const rr = Math.sqrt(u) * rad, d = B.rad(w * Math.PI * 2); return { p: c.clone().addScaledVector(d, rr).addScaledVector(B.a, bell * (1 - rr / rad) ** 2), n: B.a, t: d }; }; };
const hoop = (c, axis, rad) => { const B = basis(axis); return (u, w) => { const d = B.rad(u * Math.PI * 2); return { p: c.clone().addScaledVector(d, rad), n: d, t: B.a }; }; };
function segs(list) {
  const lens = list.map(([a, b]) => a.distanceTo(b)), tot = lens.reduce((s, l) => s + l, 0);
  return (u, w) => {
    let x = u * tot, i = 0;
    while (i < lens.length - 1 && x > lens[i]) { x -= lens[i]; i++; }
    const [a, b] = list[i], t = b.clone().sub(a).normalize();
    return { p: a.clone().lerp(b, x / lens[i]), n: perp(t, w * Math.PI * 2), t };
  };
}
// Surface of revolution around the y axis; front (+z) is squashed by zf. off pushes it outward.
function rev(y0, y1, rOf, zf, off = 0) {
  const at = (y, a) => { const r = rOf(y, a) + off; return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * zf); };
  return (u, w) => {
    const y = lerp(y0, y1, u), a = w * Math.PI * 2, e = .01;
    const p = at(y, a), down = at(y - e, a).sub(at(y + e, a)).normalize(), side = at(y, a + e).sub(at(y, a - e));
    const n = new THREE.Vector3().crossVectors(down, side).normalize();
    if (n.x * p.x + n.z * p.z < 0) n.negate();
    return { p, n, t: down };
  };
}

// Distribute each kind of piece over its surfaces (weights), evenly, and spin the whole build to face the camera.
function build(pieces, plan, r, face) {
  const out = new Array(pieces.length), rot = new THREE.Quaternion().setFromAxisAngle(UNIT.y, face);
  for (const key in plan) {
    const idx = []; pieces.forEach((pc, i) => { if (pc.key === key) idx.push(i); });
    const surfs = plan[key], wsum = surfs.reduce((s, x) => s + x[1], 0);
    let start = 0;
    surfs.forEach(([fn, wgt, opt = {}], k) => {
      const end = k === surfs.length - 1 ? idx.length : Math.min(idx.length, start + Math.round(idx.length * wgt / wsum));
      const c = end - start;
      for (let j = 0; j < c; j++) {
        const i = idx[start + j], u = (j + .3 + r() * .4) / c, w = (j * GOLD + r() * .04) % 1;
        const s = fn(u, w, r);
        const p = s.p.applyQuaternion(rot), n = s.n.clone().applyQuaternion(rot), t = s.t ? s.t.clone().applyQuaternion(rot) : null;
        out[i] = { p, q: orient(key, n, t, r() * Math.PI * 2), s: opt.s || 1, c: opt.c, k: opt.k };
      }
      start = end;
    });
  }
  return out;
}

function dress(pieces, r) {
  const WAIST = .32, HEM = -.82, TOP = .97;
  const skirtR = (y, a) => { const t = (WAIST - y) / (WAIST - HEM); return (.2 + .1 * Math.min(1, t / .12) + .6 * t ** 1.2) * (1 + .07 * Math.sin(a * 9 + t * 2) * t); };
  const bodiceR = y => .2 + .075 * smooth(WAIST, .72, y) - .025 * smooth(.8, TOP, y);
  const skirt = off => rev(WAIST, HEM, skirtR, .86, off);
  const bodice = off => rev(WAIST, TOP - .03, bodiceR, .74, off);
  // sweetheart neckline: the top edge dips at the centre front
  const neckline = (u, w) => { const a = w * Math.PI * 2, y = TOP - .07 * Math.max(0, Math.sin(a)) ** 6, r0 = bodiceR(y) + .015; return { p: new THREE.Vector3(Math.cos(a) * r0, y, Math.sin(a) * r0 * .74), n: new THREE.Vector3(Math.cos(a), .4, Math.sin(a)).normalize(), t: new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)) }; };
  // papier-mâché dress form: shoulders, neck, finial
  const form = (u, w) => {
    const a = w * Math.PI * 2;
    if (u < .7) { const k = u / .7, y = TOP + .16 * Math.sin(k * Math.PI / 2), rr = lerp(.27, .08, k ** 1.6); return { p: new THREE.Vector3(Math.cos(a) * rr * 1.15, y, Math.sin(a) * rr * .7), n: new THREE.Vector3(Math.cos(a), .9 * k + .2, Math.sin(a)).normalize() }; }
    const k = (u - .7) / .3; return { p: new THREE.Vector3(Math.cos(a) * .075, TOP + .16 + k * .16, Math.sin(a) * .075), n: new THREE.Vector3(Math.cos(a), k * .8, Math.sin(a)).normalize() };
  };
  const hem = (u, w) => { const a = u * Math.PI * 2, r0 = skirtR(HEM, a) + .02; return { p: new THREE.Vector3(Math.cos(a) * r0, HEM + .02 + (w - .5) * .06, Math.sin(a) * r0 * .86), n: new THREE.Vector3(Math.cos(a), -.5, Math.sin(a)).normalize() }; };
  const belt = (u, w) => { const a = u * Math.PI * 2, y = WAIST + (w < .5 ? -.025 : .025), r0 = bodiceR(WAIST) + .03; return { p: new THREE.Vector3(Math.cos(a) * r0, y, Math.sin(a) * r0 * .74), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a) / .74).normalize() }; };
  const feet = [0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + Math.PI / 2; return new THREE.Vector3(Math.cos(a) * .48, GROUND + .03, Math.sin(a) * .48); });
  const hub = new THREE.Vector3(0, GROUND + .22, 0);
  const stand = segs([[new THREE.Vector3(0, GROUND + .05, 0), new THREE.Vector3(0, .3, 0)], ...feet.map(f => [hub, f])]);
  return build(pieces, {
    fabric: [[skirt(0), 4.4, { s: 1.3 }], [bodice(.005), 1.1, { s: 1.05 }]],
    bottle: [[rev(-.3, HEM + .1, skirtR, .86, .04), .3, { s: .8 }], [skirt(-.08), 1]],
    cap: [[belt, 1, { s: 1.15 }], [neckline, .55], [bodice(.025), .5, { s: .8 }], [skirt(.04), 1.3, { s: .85 }]],
    crumple: [[form, 1.1, { s: .8 }], [hem, 1, { s: 1.1 }]],
    can: [[stand, .55], [skirt(-.09), 1]],
    box: [[skirt(-.12), 1], [bodice(-.04), .4]]
  }, r, .4);
}

function drums(pieces, r) {
  const G = GROUND, up = UNIT.y, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bass = { c: V(0, G + .46, -.36), axis: V(0, 0, 1), rad: .44, h: .42 };
  const toms = [{ c: V(-.27, G + 1.0, -.08), rad: .18, h: .2 }, { c: V(.27, G + 1.0, -.08), rad: .19, h: .21 }];
  const tomAxis = V(0, .92, .4).normalize();
  const floor = { c: V(.8, G + .3, .12), rad: .3, h: .4 };
  const snare = { c: V(-.74, G + .62, .32), axis: V(.12, 1, .1).normalize(), rad: .26, h: .15 };
  const hat = V(-1.18, G + 1.0, .02), crash = V(-.6, G + 1.8, -.42), ride = V(.9, G + 1.42, -.28);
  const crashAxis = V(.25, 1, .35).normalize(), rideAxis = V(-.2, 1, .3).normalize();
  const tomTop = t => t.c.clone().addScaledVector(tomAxis, t.h);
  const snareTop = snare.c.clone().addScaledVector(snare.axis, snare.h);
  const bassFront = bass.c.clone().addScaledVector(bass.axis, bass.h);
  const tripod = (top, foot, h) => [0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + .5; return [V(top.x, G + h, top.z), V(top.x + Math.cos(a) * foot, G + .02, top.z + Math.sin(a) * foot)]; });
  const stands = segs([
    [V(hat.x, G, hat.z), hat], ...tripod(hat, .3, .32),
    [V(crash.x, G + .35, crash.z), crash], ...tripod(crash, .32, .35),
    [V(ride.x, G + .35, ride.z), ride], ...tripod(ride, .32, .35),
    [V(snare.c.x, G + .3, snare.c.z), snare.c], ...tripod(snare.c, .26, .3),
    ...[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + .3; const d = V(Math.cos(a) * floor.rad, 0, Math.sin(a) * floor.rad); return [floor.c.clone().add(d).setY(G + .5), floor.c.clone().add(d.multiplyScalar(1.15)).setY(G + .02)]; }),
    [bass.c.clone().add(V(-.3, -.2, .3)), V(-.48, G + .02, .1)], [bass.c.clone().add(V(.3, -.2, .3)), V(.48, G + .02, .1)],
    [bass.c.clone().add(V(0, .4, .1)), toms[0].c], [bass.c.clone().add(V(0, .4, .1)), toms[1].c]
  ]);
  const sticks = segs([[snareTop.clone().add(V(-.18, .03, .1)), snareTop.clone().add(V(.2, .05, -.12))], [snareTop.clone().add(V(-.15, .05, -.14)), snareTop.clone().add(V(.22, .03, .08))]]);
  const SHELL = { c: '#a50f24', k: .85 }, HEAD = { c: '#f2efe6', k: .88 }, BRASS = { c: '#d9a640', k: .88 }, CHROME = { c: '#d5dde4', k: .6 };
  const rug = (u, w) => { const a = w * Math.PI * 2, rr = Math.sqrt(u); return { p: V(Math.cos(a) * rr * 1.45, G + .015 + r() * .01, Math.sin(a) * rr * 1.0), n: up.clone() }; };
  return build(pieces, {
    can: [[cylSide(bass.c, bass.axis, bass.rad, bass.h), 2.6, SHELL], [cylSide(floor.c, up, floor.rad, floor.h), 1.2, SHELL], [cylSide(snare.c, snare.axis, snare.rad, snare.h), .7, CHROME]],
    box: [[cylSide(toms[0].c, tomAxis, toms[0].rad, toms[0].h), 1, SHELL], [cylSide(toms[1].c, tomAxis, toms[1].rad, toms[1].h), 1, SHELL]],
    crumple: [[cylSide(bass.c, bass.axis, bass.rad * .78, bass.h), 1.6, { c: '#3a1418', k: .7 }], [cylSide(floor.c, up, floor.rad * .72, floor.h), 1, { c: '#3a1418', k: .7 }]],
    cap: [[disc(crash, crashAxis, .38, .05), 1.1, { ...BRASS, s: 1.6 }], [disc(ride, rideAxis, .42, .06), 1.3, { ...BRASS, s: 1.6 }],
      [disc(hat, up, .27, .03), .55, { ...BRASS, s: 1.5 }], [disc(hat.clone().setY(hat.y - .05), up.clone().negate(), .27, .03), .55, { ...BRASS, s: 1.5 }],
      [hoop(bassFront, bass.axis, bass.rad + .02), .6, CHROME], [hoop(snareTop, snare.axis, snare.rad + .015), .35, CHROME]],
    bottle: [[stands, 1, { ...CHROME, s: .75 }], [sticks, .16, { c: '#e3c79a', k: .7, s: .7 }]],
    // fabric skins sit inside each hoop (patches are ~.12 across, so pull them in from the rim)
    fabric: [[disc(bassFront, bass.axis, bass.rad - .12), 1, HEAD], [disc(snareTop, snare.axis, snare.rad - .1), .4, { ...HEAD, s: .85 }],
      [disc(tomTop(toms[0]), tomAxis, toms[0].rad - .08), .16, { ...HEAD, s: .7 }], [disc(tomTop(toms[1]), tomAxis, toms[1].rad - .08), .16, { ...HEAD, s: .7 }],
      [disc(floor.c.clone().setY(floor.c.y + floor.h), up, floor.rad - .1), .4, { ...HEAD, s: .85 }], [rug, 4.2, { c: '#2c3550', k: .35, s: 1.4 }]]
  }, r, .42);
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
      pieces.push({ mesh: m, idx: i, key: T.key, col: col.clone(), s: .8 + r() * .55, delay: r(), lift: .4 + r() * .9, axis: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), spin: r() * Math.PI * 2 });
    }
    m.instanceColor.needsUpdate = true;
    root.add(m);
    return m;
  });
  const N = pieces.length;

  // states: pile → tree → pile → dress → pile → drums
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const shapes = [pile(N, rng(1)), shuffle(tree(N, r)), pile(N, rng(2)), dress(pieces, r), pile(N, rng(3)), drums(pieces, r)];
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  const states = shapes.map(sh => sh.map((t, i) => {
    // built shapes may also tint a piece (e.g. caps turning brass on a cymbal) and resize it
    const c = t.c ? pieces[i].col.clone().lerp(tint.set(t.c), t.k) : pieces[i].col;
    if (t.q) return { p: t.p, q: t.q, s: t.s, c };
    const q = new THREE.Quaternion();
    if (t.n) q.setFromUnitVectors(up, t.n.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, pieces[i].spin));
    else q.setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
    return { p: t.p, q, s: 1, c };
  }));
  const STOPS = [0, .19, .35, .55, .71, .91];

  const labels = [...section.querySelectorAll('.stage-label')];
  const dotEls = [...section.querySelectorAll('.transform__dots li')];
  const tip = section.querySelector('.transform__tip');
  let progress = 0, shown = 0;
  const off = new Float32Array(N * 3);

  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), tq = new THREE.Quaternion(), sc = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), gplane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(GROUND + .3)), ghit = new THREE.Vector3();
  const tmpCol = new THREE.Color();

  // compile shaders in parallel instead of freezing the page on the first frame
  let ready = false;
  compileScene(renderer, scene, camera).then(() => { ready = true; if (!loop.running) loop.once(); });

  const loop = makeLoop((dt, now) => {
    if (!ready) return;
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
      sc.setScalar(pc.s * lerp(A[i].s, B[i].s, t));
      m4.compose(pos, q, sc);
      pc.mesh.setMatrixAt(pc.idx, m4);
      pc.mesh.setColorAt(pc.idx, tmpCol.copy(A[i].c).lerp(B[i].c, t));
    }
    meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });


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
