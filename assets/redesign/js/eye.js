// The Glass Eye: a hand-blown Krosno glass eye whose iris is a turning map of Europe.
import * as THREE from 'three';
import { DOTS } from './europe-dots.js';
import { makeRenderer, envFor, compileScene, fit, makeLoop, pointer, clamp, lerp, smooth, rng, isSmall } from './util.js';

const KROSNO = [21.77, 49.69];

let irisCanvas, mapCanvas;
function irisTexture() {
  if (irisCanvas) return canvasTex(irisCanvas);
  const S = 1024, c = irisCanvas = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = S / 2, rand = rng(7);
  const TAU = Math.PI * 2;
  g.translate(R, R);
  // stroma base: deep blue outside, warm hazel around the pupil (central heterochromia)
  const base = g.createRadialGradient(0, 0, R * .12, 0, 0, R);
  base.addColorStop(0, '#2a1a0c'); base.addColorStop(.2, '#7a5424'); base.addColorStop(.34, '#8a6a3a');
  base.addColorStop(.45, '#3f6f9e'); base.addColorStop(.7, '#2f6aa8'); base.addColorStop(.88, '#1d4a7c'); base.addColorStop(1, '#0a1a2c');
  g.fillStyle = base; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  // speckle grain (batched into a few paths so the canvas work stays cheap)
  [['rgba(4,12,24,.14)', 4500], ['rgba(170,210,240,.07)', 4500]].forEach(([col, n]) => {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i < n; i++) { const a = rand() * TAU, r = R * (.15 + rand() * .85); g.rect(Math.cos(a) * r, Math.sin(a) * r, 1 + rand() * 2, 1 + rand() * 2); }
    g.fill();
  });
  // radial stroma fibres, wavy, light and dark; one path per colour bucket
  const fibre = (n, r0a, r0b, r1a, r1b, col, w) => {
    const buckets = 6;
    for (let k = 0; k < buckets; k++) {
      g.strokeStyle = col(rand); g.lineWidth = w * (.6 + k / buckets * .9);
      g.beginPath();
      for (let i = 0; i < n / buckets; i++) {
        const a = rand() * TAU, r0 = R * (r0a + rand() * r0b), r1 = R * (r1a + rand() * r1b);
        const steps = 5, wob = (rand() - .5) * .08, f = 1 + rand();
        for (let s = 0; s <= steps; s++) {
          const t = s / steps, rr = r0 + (r1 - r0) * t, aa = a + Math.sin(t * Math.PI * f) * wob;
          s ? g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : g.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
      }
      g.stroke();
    }
  };
  fibre(2600, .14, .1, .55, .43, q => `hsla(${205 + q() * 20}, 70%, ${55 + q() * 30}%, ${.05 + q() * .16})`, 1.1);
  fibre(900, .14, .06, .3, .16, q => `hsla(${32 + q() * 14}, 75%, ${55 + q() * 25}%, ${.08 + q() * .2})`, 1.3);
  fibre(1200, .2, .2, .5, .45, q => `rgba(2,10,22,${.08 + q() * .2})`, 1.4);
  // crypts: dark lens-shaped pits in the stroma
  for (let i = 0; i < 46; i++) {
    const a = rand() * TAU, r = R * (.4 + rand() * .42), l = R * (.03 + rand() * .06), w = l * (.25 + rand() * .3);
    g.save(); g.rotate(a); g.translate(r, 0);
    const cg = g.createRadialGradient(0, 0, 0, 0, 0, l);
    cg.addColorStop(0, 'rgba(3,10,20,.75)'); cg.addColorStop(1, 'rgba(3,10,20,0)');
    g.fillStyle = cg; g.scale(1, w / l); g.beginPath(); g.arc(0, 0, l, 0, TAU); g.fill();
    g.restore();
  }
  // collarette: a jagged pale ridge
  const ring = R * .4;
  g.strokeStyle = 'rgba(225, 205, 160, .35)'; g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i <= 180; i++) { const a = i / 180 * TAU, r = ring * (1 + Math.sin(a * 23) * .03 + (rand() - .5) * .04); i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.stroke();
  // Europe's twelve stars as golden flecks on the collarette
  g.fillStyle = 'rgba(255, 204, 0, .8)';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU - Math.PI / 2;
    star(g, Math.cos(a) * ring, Math.sin(a) * ring, 11, 4.6);
  }
  // contraction furrows
  [.72, .8, .88].forEach(k => { g.strokeStyle = 'rgba(2,10,22,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke(); });
  // pupillary ruff
  g.strokeStyle = 'rgba(40, 22, 10, .9)'; g.lineWidth = R * .03; g.beginPath(); g.arc(0, 0, R * .16, 0, TAU); g.stroke();
  // limbal ring
  const lim = g.createRadialGradient(0, 0, R * .82, 0, 0, R);
  lim.addColorStop(0, 'rgba(0,0,0,0)'); lim.addColorStop(.7, 'rgba(4,14,26,.7)'); lim.addColorStop(1, 'rgba(2,8,16,.97)');
  g.fillStyle = lim; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  return canvasTex(c);
}

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function star(g, x, y, r1, r2) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = i / 10 * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath(); g.fill();
}

function mapTexture() {
  if (mapCanvas) return canvasTex(mapCanvas);
  const S = 1024, c = mapCanvas = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = S / 2, k = R / 30;
  const cl = Math.cos(50 * Math.PI / 180);
  for (let i = 0; i < DOTS.length; i += 3) {
    const x = (DOTS[i] - KROSNO[0]) * cl * k, y = -(DOTS[i + 1] - KROSNO[1]) * k;
    const d = Math.hypot(x, y) / R;
    if (d > .97) continue;
    const partner = DOTS[i + 2] > 0;
    g.fillStyle = partner ? 'rgba(160, 225, 255, .95)' : 'rgba(120, 190, 255, .45)';
    g.beginPath(); g.arc(R + x, R + y, partner ? 2.6 : 1.8, 0, Math.PI * 2); g.fill();
  }
  // Krosno spark (sits right at the pupil edge when it is small)
  const s = g.createRadialGradient(R, R, 0, R, R, 22);
  s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(116,180,255,0)');
  g.fillStyle = s; g.fillRect(R - 22, R - 22, 44, 44);
  return canvasTex(c);
}

const eyeVert = /* glsl */`
varying vec3 vPos; varying vec3 vN;
void main(){ vPos = position; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const eyeFrag = /* glsl */`
uniform sampler2D uIris; uniform sampler2D uMap; uniform float uTime; uniform float uPupil; uniform float uIrisAngle;
uniform vec3 uCam; uniform vec3 uLight;
varying vec3 vPos; varying vec3 vN;
float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float vein(vec3 p, float s, float sharp){
  vec3 w = p * s + vec3(noise(p * s * .7), noise(p * s * .7 + 7.1), noise(p * s * .7 + 3.3)) * 1.6;
  float n = noise(w) * .65 + noise(w * 2.1) * .35;
  return pow(1.0 - abs(n * 2.0 - 1.0), sharp);
}
void main(){
  vec3 p = normalize(vPos);
  float ang = acos(clamp(p.z, -1.0, 1.0));
  float sI = sin(uIrisAngle), zL = cos(uIrisAngle);
  // sclera: warm white, pinker towards the corners, with branching vessels coming from the back
  vec3 sclera = mix(vec3(.84, .82, .79), vec3(.78, .6, .58), smoothstep(.75, 1.7, ang) * (.55 + .45 * abs(p.x)));
  float vMask = smoothstep(.62, 1.45, ang);
  float v = vein(p, 3.2, 18.0) * .75 + vein(p + 4.0, 7.5, 26.0) * .5;
  sclera = mix(sclera, vec3(.58, .1, .1), clamp(v * vMask * 1.4, 0.0, 1.0) * .7);
  sclera *= .94 + .06 * noise(p * 30.0);
  vec3 col = sclera;
  float rr0 = length(p.xy) / sI;
  if (p.z > 0.0 && rr0 < 1.12) {
    // refract the view ray through the cornea and hit the recessed iris plane
    vec3 d = normalize(p - uCam);
    vec3 nc = normalize(p - vec3(0.0, 0.0, .322));
    vec3 rd = refract(d, nc, 1.0 / 1.376);
    float zi = zL - .07;
    vec3 q = p + rd * ((zi - p.z) / min(rd.z, -.05));
    vec2 uv = q.xy / sI;
    float rr = length(uv);
    // the stroma squeezes and stretches as the pupil changes size
    float k = clamp((rr - uPupil) / max(.001, 1.0 - uPupil), 0.0, 1.0);
    vec2 dir = rr > 0.0 ? uv / rr : vec2(0.0);
    vec2 tuv = dir * mix(.17, 1.0, k);
    vec3 iris = texture2D(uIris, tuv * .5 + .5).rgb;
    float c = cos(uTime * .06), s = sin(uTime * .06);
    vec4 m = texture2D(uMap, (mat2(c, -s, s, c) * uv) * .5 + .5);
    iris += m.rgb * m.a * .35 * smoothstep(.15, .5, k);
    // depth: shadowed under the limbus, lit by the caustic on the far side
    iris *= .5 + .42 * smoothstep(1.0, .55, rr);
    iris *= 1.0 + .35 * max(0.0, dot(dir, -normalize(uLight.xy + 1e-4))) * smoothstep(.3, 1.0, rr);
    float pupil = 1.0 - smoothstep(uPupil - .012, uPupil + .018, rr);
    iris = mix(iris, vec3(.004, .005, .008), pupil);
    float limb = smoothstep(.93, 1.06, rr0);
    vec3 limbal = mix(iris, vec3(.12, .17, .24), smoothstep(.9, 1.0, rr0));
    col = mix(limbal, sclera, limb);
  }
  // lighting: soft wrap diffuse plus the shadow the eyelids cast
  float diff = .5 + .5 * clamp((dot(vN, normalize(uLight)) + .4) / 1.4, 0.0, 1.0);
  float lidShade = 1.0 - .38 * smoothstep(.2, .75, vN.y) - .18 * smoothstep(.4, .9, -vN.y);
  gl_FragColor = vec4(col * diff * lidShade, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// A single curled lash that tapers to a point (shared by all instances)
function lashGeo(len) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(len * .6, len * .08, 0), new THREE.Vector3(len, len * .55, 0));
  const seg = 8, rad = 5, g = new THREE.TubeGeometry(curve, seg, .009, rad, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    for (let j = 0; j <= rad; j++) {
      const idx = i * (rad + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(1 - .85 * i / seg).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function createEye(canvas, { mode = 'hero' } = {}) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 100);
  camera.position.set(0, 0, mode === 'hero' ? 6.2 : 5.4);

  const root = new THREE.Group(); scene.add(root);
  const ball = new THREE.Group(); root.add(ball);

  const uniforms = {
    uIris: { value: irisTexture() }, uMap: { value: mapTexture() },
    uTime: { value: 0 }, uPupil: { value: .3 }, uIrisAngle: { value: .62 },
    uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3(-.35, .55, .75) }
  };
  const seg = isSmall() ? [64, 40] : [96, 64];
  const inner = new THREE.Mesh(new THREE.SphereGeometry(1, ...seg), new THREE.ShaderMaterial({ uniforms, vertexShader: eyeVert, fragmentShader: eyeFrag }));
  const inv = new THREE.Matrix4();
  inner.onBeforeRender = (r, s, cam) => { uniforms.uCam.value.copy(cam.position).applyMatrix4(inv.copy(inner.matrixWorld).invert()); };
  ball.add(inner);
  // Wet surfaces: reflection-only layers (additive, so no costly transmission pass). The cornea bulges out of the ball.
  const wet = (rough, env) => new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: rough * .5, envMapIntensity: env, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const film = new THREE.Mesh(new THREE.SphereGeometry(1.004, ...seg), wet(.16, .55));
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(.758, 64, 24, 0, Math.PI * 2, 0, .88), wet(.02, 2.2));
  cornea.rotation.x = Math.PI / 2; cornea.position.z = .322;
  ball.add(film, cornea);

  // Soft dark eyelids with a rounded margin, a faint glass rim and curled lashes
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1822, roughness: .6, clearcoat: .25, clearcoatRoughness: .4, sheen: .6, sheenColor: 0x2e4a66, sheenRoughness: .5, envMapIntensity: .18, side: THREE.DoubleSide });
  // same features as the lid, so it reuses the lid's shader program
  const marginMat = lidMat.clone(); marginMat.color.set(0x1a2a36); marginMat.roughness = .35; marginMat.clearcoat = .6; marginMat.envMapIntensity = .4;
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x74b4ff, toneMapped: false, transparent: true, opacity: .55 });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x040608, roughness: .55 });
  const LR = 1.12;
  const mkLid = (top) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(LR, seg[0], 32, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2), lidMat);
    const margin = new THREE.Mesh(new THREE.TorusGeometry(LR, .026, 10, 120), marginMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(LR + .03, .006, 6, 120), rimMat);
    margin.rotation.x = rim.rotation.x = Math.PI / 2;
    rim.position.y = top ? -.012 : .012;
    const n = top ? 64 : 34, lr = rng(top ? 3 : 5), up = top ? 1 : -1;
    const lashes = new THREE.InstancedMesh(lashGeo(top ? .27 : .14), lashMat, n);
    const m4 = new THREE.Matrix4(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) * 2 - 1, phi = f * 1.15 + (lr() - .5) * .03;
      // local x points out of the eye, local y curls away from the lid opening
      bx.set(Math.sin(phi), (lr() - .3) * .25 * up, Math.cos(phi)).normalize();
      by.set(0, up, 0); bz.crossVectors(bx, by).normalize(); by.crossVectors(bz, bx);
      q.setFromRotationMatrix(m4.makeBasis(bx, by, bz));
      s.setScalar((1 - f * f * .55) * (.75 + lr() * .4));
      p.set(Math.sin(phi) * (LR + .02), -.01 * up, Math.cos(phi) * (LR + .02));
      lashes.setMatrixAt(i, m4.compose(p, q, s));
    }
    g.add(m, margin, rim, lashes);
    return g;
  };
  const topLid = mkLid(true), botLid = mkLid(false);
  root.add(topLid, botLid);

  // Floating glass shards + dust
  const shards = new THREE.Group(); scene.add(shards);
  const rand = rng(11);
  const shardMat = new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, metalness: .2, roughness: .04, transparent: true, opacity: .35, clearcoat: 1, envMapIntensity: 3, emissive: 0x0d2a4a, flatShading: true });
  const nShards = mode === 'hero' ? (isSmall() ? 26 : 46) : 14;
  for (let i = 0; i < nShards; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(.05 + rand() * .14, 0), shardMat);
    const r = 1.8 + rand() * 2.6, a = rand() * Math.PI * 2, y = (rand() - .5) * 3.2;
    s.userData = { r, a, y, sp: (.05 + rand() * .12) * (rand() < .5 ? -1 : 1), rot: new THREE.Vector3(rand(), rand(), rand()) };
    shards.add(s);
  }
  const dustGeo = new THREE.BufferGeometry(), nd = 500, dp = new Float32Array(nd * 3);
  for (let i = 0; i < nd; i++) { dp[i * 3] = (rand() - .5) * 16; dp[i * 3 + 1] = (rand() - .5) * 10; dp[i * 3 + 2] = (rand() - .5) * 8 - 2; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x74b4ff, size: .025, transparent: true, opacity: .6, depthWrite: false }));
  scene.add(dust);

  const key = new THREE.PointLight(0x74b4ff, 12, 12); key.position.set(-2.5, 2, 3); scene.add(key);
  const glint = new THREE.DirectionalLight(0xffffff, 2.2); glint.position.set(-1.6, 2.2, 4); scene.add(glint);

  // state
  let progress = 0, sleep = 0, sleepTarget = 0, visible = false, t = 0;
  let blink = 0, blinkT = 0, nextBlink = 2 + Math.random() * 3;
  let wanderT = 0, wander = new THREE.Vector2();
  const gaze = new THREE.Vector2(), gazeTarget = new THREE.Vector2();
  let pupilKick = 0;
  canvas.addEventListener('pointerdown', () => { pupilKick = 1; blinkT = 0; blink = 0; nextBlink = 0; });

  // compile shaders in parallel instead of freezing the page on the first frame
  let ready = false;
  compileScene(renderer, scene, camera).then(() => { ready = true; if (!loop.running) loop.once(); });

  const loop = makeLoop((dt, now) => {
    if (!ready) return;
    t += dt;
    sleep += (sleepTarget - sleep) * Math.min(1, dt * 1.6);
    fit(renderer, camera, canvas);
    uniforms.uTime.value = t;
    const aspect = camera.aspect;

    // gaze: cursor, or wander when idle
    const idle = performance.now() - pointer.last > 3500;
    wanderT -= dt;
    if (wanderT < 0) { wanderT = .6 + Math.random() * 1.8; wander.set((Math.random() - .5) * 1.4, (Math.random() - .5) * .8); }
    let tx = idle ? wander.x : pointer.x, ty = idle ? wander.y : pointer.y;
    if (mode === 'footer') {
      const r = canvas.getBoundingClientRect();
      if (!idle) { tx = (pointer.cx - (r.left + r.width / 2)) / (window.innerWidth / 2); ty = (pointer.cy - (r.top + r.height / 2)) / (window.innerHeight / 2); }
    }
    const follow = mode === 'hero' ? 1 - smooth(0, .3, progress) : 1 - sleep;
    gazeTarget.set(clamp(tx, -1.2, 1.2) * .6 * follow, clamp(ty, -1.2, 1.2) * .42 * follow);
    gaze.lerp(gazeTarget, 1 - Math.pow(.0005, dt));
    ball.rotation.y = gaze.x; ball.rotation.x = gaze.y;

    // blink
    nextBlink -= dt;
    if (nextBlink < 0 && blinkT === 0) blinkT = .001;
    if (blinkT > 0) {
      blinkT += dt;
      blink = blinkT < .09 ? blinkT / .09 : Math.max(0, 1 - (blinkT - .09) / .16);
      if (blinkT > .25) { blinkT = 0; blink = 0; nextBlink = 2.5 + Math.random() * 4; if (Math.random() < .2) nextBlink = .25; }
    }

    // dive
    const p = progress;
    const dive = smooth(.05, 1, p);
    const open = lerp(1, 1.35, smooth(0, .6, p)) * (1 - blink) * (1 - sleep * .92);
    topLid.rotation.x = -open * .6 - gaze.y * .3;
    botLid.rotation.x = open * .46 - gaze.y * .18;
    pupilKick = Math.max(0, pupilKick - dt * 1.4);
    const breathe = Math.sin(t * 1.3) * .012;
    uniforms.uPupil.value = mode === 'hero'
      ? lerp(.27 + breathe + pupilKick * .12, 1.15, smooth(.35, .95, p))
      : .25 + breathe + pupilKick * .1;

    if (mode === 'hero') {
      // the reflections fade so the dive ends in the dark of the pupil
      const wetK = 1 - smooth(.2, .65, p);
      cornea.material.envMapIntensity = 2.2 * wetK; film.material.envMapIntensity = .55 * wetK;
      const xOff = aspect > 1.1 ? Math.min(2.3, 1.08 * aspect) : 0, yOff = aspect > 1.1 ? .15 : .6;
      root.position.x = lerp(xOff, 0, smooth(0, .45, p));
      root.position.y = lerp(yOff, 0, smooth(0, .45, p));
      camera.position.z = lerp(aspect < .8 ? Math.min(11, 5.2 / aspect) : 7.4, 1.22, Math.pow(dive, 1.6));
      camera.position.x = lerp(pointer.x * .25, 0, dive); camera.position.y = lerp(-pointer.y * .15, 0, dive);
      camera.lookAt(0, 0, 0);
    } else {
      camera.lookAt(0, 0, 0);
    }

    shards.children.forEach(s => {
      const u = s.userData; u.a += u.sp * dt;
      s.position.set(Math.cos(u.a) * u.r + root.position.x, u.y + Math.sin(t * .5 + u.r) * .15, Math.sin(u.a) * u.r * .6);
      s.rotation.x += u.rot.x * dt; s.rotation.y += u.rot.y * dt;
    });
    dust.rotation.y = t * .01;
    renderer.render(scene, camera);
  });

  return {
    setProgress(v) { progress = v; if (!loop.running) loop.once(); },
    setSleep(v) { sleepTarget = v; },
    setVisible(v) { visible = v; loop.set(v); },
    blink() { blinkT = .001; },
    renderer
  };
}
