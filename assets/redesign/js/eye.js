// The Glass Eye: a hand-blown Krosno glass eye whose iris is a turning map of Europe.
import * as THREE from 'three';
import { DOTS } from './europe-dots.js';
import { makeRenderer, envFor, fit, makeLoop, pointer, clamp, lerp, smooth, rng, isSmall } from './util.js';

const KROSNO = [21.77, 49.69];

function irisTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = S / 2, rand = rng(7);
  g.translate(R, R);
  const base = g.createRadialGradient(0, 0, R * .15, 0, 0, R);
  base.addColorStop(0, '#0b2a52'); base.addColorStop(.35, '#1d5fae'); base.addColorStop(.7, '#2e73c2');
  base.addColorStop(.9, '#173f72'); base.addColorStop(1, '#06121f');
  g.fillStyle = base; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  // fibres
  for (let i = 0; i < 1400; i++) {
    const a = rand() * Math.PI * 2, r0 = R * (.2 + rand() * .2), r1 = R * (.55 + rand() * .42);
    const hue = 200 + rand() * 25, l = 45 + rand() * 35;
    g.strokeStyle = `hsla(${hue}, 80%, ${l}%, ${.08 + rand() * .22})`;
    g.lineWidth = .6 + rand() * 1.8;
    g.beginPath();
    const wob = (rand() - .5) * .15;
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.quadraticCurveTo(Math.cos(a + wob) * (r0 + r1) / 2, Math.sin(a + wob) * (r0 + r1) / 2, Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
  // collarette: golden ring of twelve stars, Europe's circle
  const ring = R * .36;
  g.strokeStyle = 'rgba(255, 204, 0, .25)'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, ring, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ffcc00';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    star(g, Math.cos(a) * ring, Math.sin(a) * ring, 15, 6.5);
  }
  // limbal ring
  const lim = g.createRadialGradient(0, 0, R * .86, 0, 0, R);
  lim.addColorStop(0, 'rgba(0,0,0,0)'); lim.addColorStop(1, 'rgba(2,8,16,.95)');
  g.fillStyle = lim; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
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
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const eyeVert = /* glsl */`
varying vec3 vPos; varying vec3 vN;
void main(){ vPos = position; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const eyeFrag = /* glsl */`
uniform sampler2D uIris; uniform sampler2D uMap; uniform float uTime; uniform float uPupil; uniform float uIrisAngle;
varying vec3 vPos; varying vec3 vN;
void main(){
  vec3 p = normalize(vPos);
  float ang = acos(clamp(p.z, -1.0, 1.0));
  vec3 sclera = mix(vec3(.94,.96,1.0), vec3(.42,.58,.82), smoothstep(.35, 2.4, ang));
  float veins = smoothstep(.55, 1.0, sin(p.x*40.0+sin(p.y*23.0)*2.0) * sin(p.y*37.0+p.z*11.0)) * smoothstep(.8, 1.6, ang) * .12;
  sclera = mix(sclera, vec3(.55,.68,.95), veins);
  vec3 col = sclera;
  if (p.z > 0.0) {
    vec2 uv = p.xy / sin(uIrisAngle);
    float rr = length(uv);
    if (rr < 1.08) {
      vec3 iris = texture2D(uIris, uv * .5 + .5).rgb;
      float c = cos(uTime * .06), s = sin(uTime * .06);
      vec2 muv = mat2(c, -s, s, c) * uv;
      vec4 m = texture2D(uMap, muv * .5 + .5);
      iris = iris * .75 + m.rgb * m.a * 1.15;
      float pupil = 1.0 - smoothstep(uPupil - .015, uPupil + .02, rr);
      iris = mix(iris, vec3(.003, .006, .012), pupil);
      col = mix(sclera, iris, 1.0 - smoothstep(.985, 1.04, rr));
    }
  }
  float diff = .6 + .4 * max(dot(vN, normalize(vec3(.3, .6, .8))), 0.0);
  gl_FragColor = vec4(col * diff, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

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
    uTime: { value: 0 }, uPupil: { value: .3 }, uIrisAngle: { value: .62 }
  };
  const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ uniforms, vertexShader: eyeVert, fragmentShader: eyeFrag }));
  ball.add(inner);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(1.035, 96, 64), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transmission: 1, thickness: .35, roughness: .03, ior: 1.38, clearcoat: 1, clearcoatRoughness: .02,
    envMapIntensity: 1.4, specularIntensity: 1
  }));
  ball.add(cornea);

  // Dark glass eyelids with a glowing rim
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0x0b1a26, metalness: 0, roughness: .32, clearcoat: .8, clearcoatRoughness: .15, envMapIntensity: .28, side: THREE.DoubleSide });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x74b4ff, toneMapped: false });
  const mkLid = (top) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 96, 48, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2), lidMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, .018, 12, 160), rimMat);
    rim.rotation.x = Math.PI / 2;
    g.add(m, rim);
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

  // state
  let progress = 0, sleep = 0, sleepTarget = 0, visible = false, t = 0;
  let blink = 0, blinkT = 0, nextBlink = 2 + Math.random() * 3;
  let wanderT = 0, wander = new THREE.Vector2();
  const gaze = new THREE.Vector2(), gazeTarget = new THREE.Vector2();
  let pupilKick = 0;
  canvas.addEventListener('pointerdown', () => { pupilKick = 1; blinkT = 0; blink = 0; nextBlink = 0; });

  const loop = makeLoop((dt, now) => {
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
