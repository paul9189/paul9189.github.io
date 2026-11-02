// The Living Map: Europe as glass dots, with arcs flying from partner countries to each project.
import * as THREE from 'three';
import { DOTS, PARTNER_CODES } from './europe-dots.js';
import { makeRenderer, fit, makeLoop, pointer, clamp, lerp, isSmall } from './util.js';

export const COUNTRIES = {
  PL: ['Poland', 21.77, 49.69], HU: ['Hungary', 19.04, 47.5], LT: ['Lithuania', 25.28, 54.69], RO: ['Romania', 26.1, 44.43],
  PT: ['Portugal', -9.14, 38.72], MK: ['North Macedonia', 21.43, 42.0], SK: ['Slovakia', 17.11, 48.15], CZ: ['Czech Republic', 14.42, 50.08],
  BG: ['Bulgaria', 23.32, 42.7], TR: ['Türkiye', 32.85, 39.93], MD: ['Moldova', 28.86, 47.01], LU: ['Luxembourg', 6.13, 49.61],
  CY: ['Cyprus', 33.38, 35.19], FR: ['France', 7.75, 48.58]
};
const PLACES = { krosno: ['Krosno', 21.77, 49.69], strasbourg: ['Strasbourg', 7.75, 48.58], murzasichle: ['Murzasichle', 20.05, 49.33], opole: ['Opole', 17.93, 50.67] };

// Two accents only: brand blue for every project, EU gold for the one at the European Parliament.
const BLUE = '#74b4ff', GOLD = '#ffcc00';
export const PROJECTS = [
  { tick: 'Art Meets AI', name: 'Art Meets AI', date: '2024', place: 'Krosno, Poland', to: 'krosno', from: ['PL', 'RO', 'SK', 'CZ'], color: BLUE, meta: '28 participants. An AI-directed show for 600+ students and teachers.', link: '/aiart/aiartindex.html' },
  { tick: 'Fashion', name: 'Fashion Forward: Recycled Runway', date: '29 Mar – 6 Apr 2025', place: 'Krosno, Poland', to: 'krosno', from: ['PL', 'PT', 'MK', 'HU'], color: BLUE, meta: '28 participants. Waste turned into a catwalk.', link: 'fashionforward.html' },
  { tick: 'EcoArt', name: 'EcoArt: Turning Trash into Treasure', date: '6–14 Apr 2025', place: 'Krosno, Poland', to: 'krosno', from: ['PL', 'HU', 'LT', 'RO'], color: BLUE, meta: '28 participants. Recycling centre visit and junk sculptures.', link: 'ecoart.html' },
  { tick: 'EYE 2025', name: 'EYE 2025 @ European Parliament', date: '13–14 June 2025', place: 'Strasbourg, France', to: 'strasbourg', from: ['PL', 'LU', 'CY', 'RO'], venue: 'FR', color: GOLD, meta: 'Workshops on deepfakes and democracy, with Digital Dreamers Luxembourg, Waves of Change Cyprus and Colțul Tinerilor din Vest Romania.', link: 'eye2025.html' },
  { tick: 'Drums', name: 'Follow Your Drums!', date: '17–25 Sept 2025', place: 'Krosno, Poland', to: 'krosno', from: ['PL', 'PT', 'HU', 'RO', 'MK'], color: BLUE, meta: 'Waste turned into percussion, and one group song.', link: 'followyourdrums.html' },
  { tick: 'AI 2.0', name: 'Art Meets AI 2.0: The Next Act', date: '2025 – 2026', place: 'Krosno, Poland', to: 'krosno', from: ['PL', 'BG', 'TR', 'MD'], color: BLUE, meta: 'AI-enhanced live theatre for an audience of 1,000+.', link: 'aiart2-blog.html' },
  { tick: 'Together', name: 'Together Against Addictions', date: '2025 – 2026', place: 'Krosno & Opole, Poland', to: 'opole', from: ['PL'], color: BLUE, meta: '15 local young people, research, a Danger Zone Map and a conference for 350+.', link: 'razemprzeciwuzaleznieniom.html' },
  { tick: 'First Aid', name: 'First Aid – Don\'t Ignore!', date: '24–31 March 2026', place: 'Murzasichle, Poland', to: 'murzasichle', from: ['PL', 'HU', 'RO'], color: BLUE, meta: '33 participants. CPR, AED and forum theatre.', link: 'firstaid-blog.html' }
];

const QUOTES = {
  SK: ['This project opened my eyes to the power of creativity and technology. I never imagined AI could be used for art!', 'Lukas, Art Meets AI'],
  PL: ['EcoArt showed me how something as simple as trash can become meaningful art, and how our actions can truly make a difference for the planet.', 'Dawid, EcoArt'],
  RO: ['The fashion show was unforgettable. Turning waste into something beautiful gave me hope that change is possible.', 'Andra, Fashion Forward']
};

const K = .1, CL = Math.cos(50 * Math.PI / 180);
const proj = (lon, lat) => new THREE.Vector3((lon - 13) * CL * K, (lat - 49) * K, 0);

const dotVert = /* glsl */`
attribute float aC; attribute float aR;
uniform float uLit[15]; uniform float uAct[15]; uniform float uTime; uniform float uPR; uniform float uHover;
varying vec3 vCol; varying float vA;
uniform vec3 uActCol;
void main(){
  int i = int(aC + .5);
  float lit = i > 0 ? uLit[i] : 0.0;
  float act = i > 0 ? uAct[i] : 0.0;
  float hov = (i > 0 && abs(float(i) - uHover) < .5) ? 1.0 : 0.0;
  vec3 base = vec3(.18, .34, .55);
  vCol = mix(base, vec3(.55, .82, 1.0), lit);
  vCol = mix(vCol, uActCol, act);
  vCol += hov * .35;
  float tw = .75 + .25 * sin(uTime * 1.6 + aR * 40.0);
  vA = (.55 + .45 * max(lit, act)) * tw;
  vec4 mv = modelViewMatrix * vec4(position + vec3(0., 0., act * .03 + hov * .02), 1.0);
  gl_PointSize = (3.2 + lit * 1.4 + act * 2.2 + hov) * uPR * (4.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const dotFrag = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){ vec2 d = gl_PointCoord - .5; float r = length(d); if (r > .5) discard;
  float a = smoothstep(.5, .1, r) * vA; gl_FragColor = vec4(vCol * (1.2 - r), a); }`;

const arcVert = /* glsl */`varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const arcFrag = /* glsl */`
uniform vec3 uCol; uniform float uProg; uniform float uDim; varying float vU;
void main(){ if (vU > uProg) discard; float head = smoothstep(uProg - .12, uProg, vU) * step(uProg, .999);
  gl_FragColor = vec4(uCol * (1.0 + head * 2.0), (.35 + .65 * uDim) * (.55 + head)); }`;

export function createMap(section, onCountry) {
  const canvas = section.querySelector('.map__canvas');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 50);
  const world = new THREE.Group(); scene.add(world);
  world.rotation.x = -.78;

  // dots
  const n = DOTS.length / 3, pos = new Float32Array(n * 3), aC = new Float32Array(n), aR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = proj(DOTS[i * 3], DOTS[i * 3 + 1]);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = 0;
    aC[i] = DOTS[i * 3 + 2]; aR[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aC', new THREE.BufferAttribute(aC, 1));
  g.setAttribute('aR', new THREE.BufferAttribute(aR, 1));
  const du = {
    uLit: { value: new Array(15).fill(0) }, uAct: { value: new Array(15).fill(0) }, uTime: { value: 0 },
    uPR: { value: renderer.getPixelRatio() }, uHover: { value: -1 }, uActCol: { value: new THREE.Color('#74b4ff') }
  };
  const dots = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: du, vertexShader: dotVert, fragmentShader: dotFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.add(dots);
  const litTarget = new Array(15).fill(0), actTarget = new Array(15).fill(0);
  const codeIdx = c => PARTNER_CODES.indexOf(c);

  // glass base plate
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), new THREE.MeshBasicMaterial({ color: 0x0f2a40, transparent: true, opacity: .18, depthWrite: false }));
  plate.position.set(.1, -.1, -.02); world.add(plate);

  // arcs per project
  const arcs = PROJECTS.map(p => {
    const grp = new THREE.Group(); world.add(grp);
    const dest = PLACES[p.to];
    const b = proj(dest[1], dest[2]);
    const origins = p.from.map(c => c === 'PL' ? (p.to === 'krosno' ? null : PLACES.krosno) : [COUNTRIES[c][0], COUNTRIES[c][1], COUNTRIES[c][2]]).filter(Boolean);
    const curves = [], mats = [];
    origins.forEach(o => {
      const a = proj(o[1], o[2]);
      const d = a.distanceTo(b);
      const mid = a.clone().lerp(b, .5); mid.z = .15 + d * .38;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const mat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(p.color) }, uProg: { value: 0 }, uDim: { value: 1 } }, vertexShader: arcVert, fragmentShader: arcFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .009, 6, false), mat));
      curves.push(curve); mats.push(mat);
    });
    // travellers
    const per = 7, tp = new Float32Array(curves.length * per * 3);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const tm = new THREE.PointsMaterial({ color: p.color, size: .05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const trav = new THREE.Points(tg, tm); grp.add(trav);
    // destination ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(.05, .065, 48), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.position.copy(b); ring.position.z = .005; grp.add(ring);
    return { p, curves, mats, trav, tp, per, ring, prog: 0, dim: 1 };
  });

  // Krosno home beacon
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .5, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending }));
  beacon.rotation.x = Math.PI / 2; beacon.position.copy(proj(21.77, 49.69)); beacon.position.z = .25; world.add(beacon);

  // DOM bits
  const panel = section.querySelector('.map__panel');
  const range = section.querySelector('.map__range');
  const ticks = section.querySelector('.map__ticks');
  const N = PROJECTS.length;
  PROJECTS.forEach((p, i) => { const s = document.createElement('span'); s.textContent = p.tick; s.style.left = `${(i + .5) / N * 100}%`; ticks.appendChild(s); });
  const tickEls = [...ticks.children];
  let active = -1, progress = 0, shown = 0;

  const setPanel = i => {
    const p = PROJECTS[i];
    panel.style.setProperty('--c', p.color);
    panel.querySelector('.map__date').textContent = p.date;
    panel.querySelector('.map__title').textContent = p.name;
    panel.querySelector('.map__place').textContent = p.place;
    panel.querySelector('.map__countries').innerHTML = p.from.map(c => `<li>${COUNTRIES[c][0]}</li>`).join('');
    panel.querySelector('.map__meta').textContent = p.meta;
    const a = panel.querySelector('.map__link'); a.href = p.link;
    tickEls.forEach((t, j) => t.classList.toggle('on', j === i));
    du.uActCol.value.set(p.color);
    actTarget.fill(0);
    p.from.forEach(c => { actTarget[codeIdx(c)] = 1; });
    if (p.venue) actTarget[codeIdx(p.venue)] = 1;
  };

  const counters = { c: section.querySelector('.c-countries'), p: section.querySelector('.c-projects') };
  const updateLit = upto => {
    litTarget.fill(0);
    const set = new Set();
    PROJECTS.slice(0, upto + 1).forEach(p => { p.from.forEach(c => set.add(c)); if (p.venue) set.add(p.venue); });
    set.forEach(c => { litTarget[codeIdx(c)] = 1; });
    counters.c.textContent = set.size; counters.p.textContent = upto + 1;
  };

  // range ↔ scroll
  let dragging = false;
  range.addEventListener('input', () => {
    dragging = true;
    const v = range.value / 1000;
    if (section.offsetHeight - window.innerHeight < 50) { api.setProgress(v); return; } // reduced motion: no scroll track
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + v * (section.offsetHeight - window.innerHeight), behavior: 'instant' });
  });
  range.addEventListener('change', () => { dragging = false; });

  // country picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  const pick = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    world.updateMatrixWorld();
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(world.quaternion), world.position);
    if (!ray.ray.intersectPlane(plane, hit)) return 0;
    const local = world.worldToLocal(hit.clone());
    let best = 0, bd = .012;
    for (let i = 0; i < n; i++) {
      if (!aC[i]) continue;
      const dx = pos[i * 3] - local.x, dy = pos[i * 3 + 1] - local.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = aC[i]; }
    }
    if (!best) {
      // small countries (Luxembourg, Cyprus): snap to their capital
      for (const [code, c] of Object.entries(COUNTRIES)) {
        const v = proj(c[1], c[2]); const d = (v.x - local.x) ** 2 + (v.y - local.y) ** 2;
        if (d < .006 && d < bd + .006) { best = codeIdx(code); bd = d; }
      }
    }
    return best;
  };
  canvas.addEventListener('pointermove', e => { const c = pick(e.clientX, e.clientY); du.uHover.value = c && du.uLit.value[c] > .5 ? c : -1; canvas.style.cursor = du.uHover.value > 0 ? 'pointer' : ''; });
  canvas.addEventListener('click', e => {
    const c = pick(e.clientX, e.clientY);
    if (!c) return;
    const code = PARTNER_CODES[c];
    const projects = PROJECTS.filter(p => p.from.includes(code) || p.venue === code);
    onCountry && onCountry({ code, name: COUNTRIES[code][0], projects, quote: QUOTES[code] });
  });

  const tmp = new THREE.Vector3();
  const loop = makeLoop((dt, now) => {
    fit(renderer, camera, canvas);
    du.uTime.value = now;
    const wide = camera.aspect > 1.15;
    camera.position.set(lerp(camera.position.x, pointer.x * .2, .05), lerp(camera.position.y, -.35 - pointer.y * .12, .05), wide ? 3.75 : Math.min(8.5, 3.7 / Math.min(1, camera.aspect)));
    camera.lookAt(0, -.1, 0);
    du.uPR.value = renderer.getPixelRatio() * Math.max(1, camera.position.z / 3.75) * (wide ? 1 : .8);
    world.position.x = wide ? -.45 : -.3;
    world.position.y = wide ? 0 : .25;
    shown = lerp(shown, progress, 1 - Math.pow(.001, dt));
    const f = shown * N;
    for (let j = 0; j < 15; j++) {
      du.uLit.value[j] = lerp(du.uLit.value[j], litTarget[j], .08);
      du.uAct.value[j] = lerp(du.uAct.value[j], actTarget[j], .1);
    }
    arcs.forEach((a, j) => {
      const prog = clamp((f - j) * 1.8);
      const isAct = j === active;
      a.dim = lerp(a.dim, isAct ? 1 : .12, .08);
      a.mats.forEach(m => { m.uniforms.uProg.value = prog; m.uniforms.uDim.value = a.dim; });
      a.trav.material.opacity = prog >= 1 ? a.dim : 0;
      if (prog >= 1 && a.dim > .2) {
        let k = 0;
        a.curves.forEach((c, ci) => {
          for (let q = 0; q < a.per; q++) {
            c.getPoint((now * .22 + q / a.per + ci * .13) % 1, tmp);
            a.tp[k++] = tmp.x; a.tp[k++] = tmp.y; a.tp[k++] = tmp.z;
          }
        });
        a.trav.geometry.attributes.position.needsUpdate = true;
      }
      const s = 1 + ((now * .8 + j * .3) % 1) * 2.2;
      a.ring.scale.setScalar(isAct ? s : 1);
      a.ring.material.opacity = isAct ? (1 - (s - 1) / 2.2) * .9 : (prog >= 1 ? .25 : 0);
    });
    beacon.material.opacity = .45 + Math.sin(now * 3) * .25;
    renderer.render(scene, camera);
  });

  const api = {
    setProgress(p) {
      progress = p;
      const i = Math.min(N - 1, Math.floor(p * N));
      if (i !== active) { active = i; setPanel(i); updateLit(i); }
      if (!dragging) range.value = Math.round(p * 1000);
      range.style.setProperty('--p', `${p * 100}%`);
      if (!loop.running) loop.once();
    },
    setVisible(v) { loop.set(v); }
  };
  return api;
}
