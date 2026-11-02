// Project worlds: small, specific interactions for each project.
import { clamp, smooth, onVisible, rng } from './util.js';

// ---------- shared audio ----------
let ctx = null, master = null, noiseBuf = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .7; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function env(g, t, a, peak, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + decay); }
function noise(t, dur, filterType, freq, peak, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, .002, peak, dur);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + .05);
}
function tone(t, type, f0, f1, dur, peak) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * .8);
  const g = ctx.createGain(); env(g, t, .003, peak, dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
}
const SOUNDS = {
  bucket: t => { tone(t, 'sine', 150, 42, .55, .95); noise(t, .05, 'lowpass', 900, .25); },
  pot: t => { noise(t, .2, 'bandpass', 1900, .55, .8); tone(t, 'triangle', 240, 170, .12, .35); },
  bottle: t => { tone(t, 'sine', 1180, 1100, .25, .4); tone(t, 'triangle', 2350, 2300, .08, .12); },
  can: t => { noise(t, .06, 'highpass', 6500, .45); tone(t, 'square', 3200, 3000, .02, .05); },
  lid: t => { noise(t, 1.1, 'highpass', 5200, .35); [1, 1.48, 1.93, 2.62].forEach(m => tone(t, 'square', 420 * m, 410 * m, .6, .025)); },
  click: (t, hi) => { tone(t, 'square', hi ? 1800 : 1200, hi ? 1700 : 1100, .04, .2); }
};
function play(name, when = 0) { if (!audio()) return; SOUNDS[name](ctx.currentTime + when); }

// ---------- 6a Art Meets AI: curtains + an evolving narrator, typed by your scroll ----------
const NARRATOR = [
  '> HELLO, WORLD.\n> I AM THE NARRATOR.\n> LOADING THEATRE.EXE ...',
  'I direct the show now.\n28 performers. 4 countries.\nVoices, images and music, generated.',
  '600 people watched me take the stage.\nThe next act is already written.'
];
const SUBTITLES = [
  '“In the symphony of progress, AI is the instrument that amplifies human creativity.” (ChatGPT-4, credited as Director & Founder)',
  'Live action on stage, blended with AI voice modulation, deepfakes and generated images and music.',
  'The AI Narrator evolves from an old computer into an entity that takes over our freedom and rights.'
];
export function initAI(section, onForm) {
  const L = section.querySelector('.curtain--l'), R = section.querySelector('.curtain--r');
  const nar = section.querySelector('.narrator');
  const types = [...nar.querySelectorAll('.type')];
  const line = section.querySelector('.ai__line');
  let form = -1;
  return p => {
    const o = smooth(.02, .3, p);
    L.style.transform = `translateX(${-o * 96}%) scaleX(${1 - o * .35})`;
    R.style.transform = `translateX(${o * 96}%) scaleX(${1 - o * .35})`;
    const f = p < .5 ? 0 : p < .75 ? 1 : 2;
    if (f !== form) { form = f; nar.dataset.form = f; line.textContent = SUBTITLES[f]; onForm && onForm(f); }
    const local = f === 0 ? clamp((p - .2) / .25) : f === 1 ? clamp((p - .5) / .18) : clamp((p - .75) / .18);
    const txt = NARRATOR[f];
    types[f].textContent = txt.slice(0, Math.ceil(txt.length * local)) + (local < 1 ? '▌' : '');
    types[f].style.whiteSpace = 'pre-line';
  };
}

// ---------- 6b EYE 2025: Human or John Doe? ----------
const QUIZ = [
  { q: 'This project opened my eyes to the power of creativity and technology. I never imagined AI could be used for art!', a: 'human', who: 'Lukas, Slovakia (Art Meets AI)', why: 'A real participant: an honest, specific surprise.' },
  { q: 'Participating in this transformative journey empowered me to unlock my full potential and embrace the synergy between creativity and innovation.', a: 'ai', who: 'Written by an AI for this game', why: 'Tell-tale signs: stacked buzzwords (“transformative”, “synergy”, “unlock”) and no concrete detail.' },
  { q: 'The fashion show was unforgettable. Turning waste into something beautiful gave me hope that change is possible.', a: 'human', who: 'Andra, Romania (Fashion Forward)', why: 'A real participant: a specific moment, a fashion show made from waste.' },
  { q: 'As a passionate young changemaker, I truly believe this unforgettable experience will shape my future in countless meaningful ways.', a: 'ai', who: 'Written by an AI for this game', why: 'Generic praise that could describe any event. Nothing is actually said.' },
  { q: 'This experience completely changed my perspective, combining art, AI, and activism was inspiring.', a: 'human', who: 'Stefan Jieanu (Art Meets AI)', why: 'A real participant. Short and imperfect, which is very human.' },
  { q: 'Through dynamic workshops and vibrant intercultural exchange, I gained invaluable skills that will serve me in every aspect of my life.', a: 'ai', who: 'Written by an AI for this game', why: 'Brochure language: “dynamic”, “vibrant”, “invaluable”. Ask: what actually happened?' }
];
export function initQuiz(root) {
  const box = root.querySelector('.quiz');
  const qEl = box.querySelector('.quiz__q'), count = box.querySelector('.quiz__count'), rev = box.querySelector('.quiz__reveal'), next = box.querySelector('.quiz__next');
  const btns = [...box.querySelectorAll('.quiz__btns button')];
  let i = 0, score = 0;
  const show = () => {
    if (i >= QUIZ.length) {
      count.textContent = 'Result';
      qEl.textContent = `You spotted ${score} of ${QUIZ.length}. Telling people from machines keeps getting harder. That's exactly what we discussed with young Europeans in Strasbourg.`;
      rev.textContent = '';
      btns.forEach(b => { b.hidden = true; });
      next.hidden = false; next.textContent = 'Play again ↺';
      return;
    }
    btns.forEach(b => { b.hidden = false; b.disabled = false; b.classList.remove('right', 'wrong'); });
    count.textContent = `Round ${i + 1} / ${QUIZ.length}`;
    qEl.textContent = QUIZ[i].q; rev.textContent = ''; next.hidden = true; next.textContent = 'Next →';
  };
  btns.forEach(b => b.addEventListener('click', () => {
    const it = QUIZ[i], ok = b.dataset.a === it.a;
    if (ok) score++;
    b.classList.add(ok ? 'right' : 'wrong');
    btns.forEach(x => { x.disabled = true; if (x.dataset.a === it.a) x.classList.add('right'); });
    rev.innerHTML = `<b>${ok ? 'Correct.' : 'Not quite.'}</b> ${it.who}. ${it.why}`;
    if (it.a === 'ai') { box.classList.add('glitching'); setTimeout(() => box.classList.remove('glitching'), 700); }
    next.hidden = false; next.focus({ preventScroll: true });
  }));
  next.addEventListener('click', () => { if (i >= QUIZ.length) { i = 0; score = 0; } else i++; show(); });
  show();

  // hemicycle seats
  const svg = root.querySelector('.hemicycle'), r = rng(3), seats = [];
  let s = '';
  for (let row = 0; row < 11; row++) {
    const rad = 170 + row * 30, n = Math.round(rad / 9);
    for (let k = 0; k <= n; k++) {
      const a = Math.PI + (k / n) * Math.PI;
      s += `<circle cx="${(500 + Math.cos(a) * rad).toFixed(1)}" cy="${(510 + Math.sin(a) * rad).toFixed(1)}" r="3.4" fill="#2e73c2" opacity="${(.25 + r() * .5).toFixed(2)}"/>`;
    }
  }
  svg.innerHTML = s;
  svg.querySelectorAll('circle').forEach(c => seats.push(c));
  let timer = 0;
  onVisible(root, v => {
    clearInterval(timer);
    if (v) timer = setInterval(() => {
      for (let k = 0; k < 6; k++) { const c = seats[(Math.random() * seats.length) | 0]; c.setAttribute('fill', Math.random() < .3 ? '#ffcc00' : '#74b4ff'); setTimeout(() => c.setAttribute('fill', '#2e73c2'), 900); }
    }, 220);
  });
}

// ---------- 6c Follow Your Drums ----------
const PATTERN = ['bucket', 'bucket', 'pot', 'can', 'bucket', 'bucket', 'pot', 'lid'];
const GROOVE = { // 16 steps
  bucket: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  pot: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  can: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  bottle: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
  lid: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};
export function initDrums(root) {
  const pads = Object.fromEntries([...root.querySelectorAll('.pad')].map(p => [p.dataset.sound, p]));
  const pat = root.querySelector('.pattern'), pEls = [...pat.children];
  const song = root.querySelector('.song'), toggle = root.querySelector('.song__toggle');
  let pos = 0, inView = false, groove = 0, step = 0, nextT = 0, bar = 0;
  const flash = name => { const p = pads[name]; p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove('hit'), 160); };
  const hit = (name, user = true) => {
    play(name); flash(name);
    if (!user) return;
    if (PATTERN[pos] === name) { pEls[pos].classList.add('ok'); pos++; }
    else {
      if (pos > 0) { pat.classList.add('fail'); setTimeout(() => pat.classList.remove('fail'), 500); }
      pEls.forEach(e => e.classList.remove('ok'));
      pos = PATTERN[0] === name ? 1 : 0; if (pos) pEls[0].classList.add('ok');
    }
    if (pos === PATTERN.length) { pos = 0; unlock(); setTimeout(() => pEls.forEach(e => e.classList.remove('ok')), 1200); }
  };
  const schedule = () => {
    if (!groove || !ctx) return;
    const spb = 60 / 104 / 4;
    while (nextT < ctx.currentTime + .12) {
      for (const [name, steps] of Object.entries(GROOVE)) {
        if (steps[step] && (name !== 'lid' || bar % 2 === 0)) {
          SOUNDS[name](nextT);
          const d = Math.max(0, (nextT - ctx.currentTime) * 1000); setTimeout(() => flash(name), d);
        }
      }
      nextT += spb; step = (step + 1) % 16; if (!step) bar++;
    }
  };
  const startGroove = () => { if (!audio()) return; nextT = ctx.currentTime + .05; step = 0; bar = 0; clearInterval(groove); groove = setInterval(schedule, 25); toggle.textContent = 'Stop the groove'; };
  const stopGroove = () => { clearInterval(groove); groove = 0; toggle.textContent = 'Play the groove'; };
  const unlock = () => { song.hidden = false; startGroove(); };
  toggle.addEventListener('click', () => (groove ? stopGroove() : startGroove()));
  Object.values(pads).forEach(p => p.addEventListener('pointerdown', e => { e.preventDefault(); hit(p.dataset.sound); }));
  Object.values(pads).forEach(p => p.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); hit(p.dataset.sound); } }));
  const keys = { a: 'bucket', s: 'pot', d: 'bottle', f: 'can', g: 'lid' };
  window.addEventListener('keydown', e => {
    if (!inView || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
    const n = keys[e.key.toLowerCase()]; if (n) { e.preventDefault(); hit(n); }
  });
  onVisible(root, v => { inView = v; if (!v) stopGroove(); }, '0%');
}

// ---------- 6d Catwalk (horizontal scroll) ----------
export function initCatwalk(section) {
  const track = section.querySelector('.catwalk__track');
  section.querySelectorAll('.look').forEach(l => l.addEventListener('click', () => l.classList.toggle('open')));
  return p => {
    const max = Math.max(0, track.scrollWidth - window.innerWidth);
    track.style.transform = `translate3d(${-max * smooth(.04, .96, p)}px,0,0)`;
  };
}

// ---------- 6e First Aid: CPR rhythm ----------
export function initCPR(root) {
  const btn = root.querySelector('.cpr__btn'), needle = root.querySelector('.needle');
  const bpmEl = root.querySelector('.cpr__bpm b'), nEl = root.querySelector('.cpr__n'), msg = root.querySelector('.cpr__msg');
  const metro = root.querySelector('.cpr__metro input');
  let times = [], done = false, inView = false;
  const press = () => {
    btn.classList.add('down'); setTimeout(() => btn.classList.remove('down'), 90);
    const now = performance.now();
    if (done) { times = []; done = false; }
    if (times.length && now - times[times.length - 1] > 2500) times = [];
    times.push(now);
    ecgKick = 1;
    nEl.textContent = times.length;
    if (times.length < 3) { msg.textContent = 'Keep going…'; bpmEl.textContent = '—'; return; }
    const recent = times.slice(-5), avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    const bpm = Math.round(60000 / avg);
    bpmEl.textContent = bpm;
    needle.style.left = `${clamp((bpm - 60) / 100) * 100}%`;
    if (times.length >= 30) {
      done = true;
      const all = (times[times.length - 1] - times[0]) / (times.length - 1), b = Math.round(60000 / all);
      msg.innerHTML = b >= 100 && b <= 120
        ? `<b>${b} BPM on average: right in the zone.</b> That rhythm is what keeps blood moving to the brain. Now go learn it for real.`
        : `<b>${b} BPM on average.</b> ${b < 100 ? 'A bit slow. Think “Stayin’ Alive”, then go faster still.' : 'A bit fast. Steady beats frantic.'} Tap again to retry.`;
      return;
    }
    msg.textContent = bpm < 100 ? 'Faster! Aim for 100–120.' : bpm > 120 ? 'Slow down a little.' : 'Perfect rhythm. Keep going.';
  };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });

  // metronome
  let mt = 0, nextT = 0, beat = 0;
  const tick = () => { if (!ctx) return; while (nextT < ctx.currentTime + .1) { SOUNDS.click(nextT, beat % 4 === 0); nextT += 60 / 110; beat++; } };
  const setMetro = on => { clearInterval(mt); if (on && inView && audio()) { nextT = ctx.currentTime + .05; mt = setInterval(tick, 25); } };
  metro.addEventListener('change', () => setMetro(metro.checked));

  // ECG line
  const cv = root.querySelector('.ecg'), g = cv.getContext('2d');
  let ecgKick = 0, raf = 0, x = 0, lastY = 0;
  const beatShape = ph => { // ph 0..1 within a beat
    if (ph < .06) return Math.sin(ph / .06 * Math.PI) * .08;
    if (ph < .1) return -.1 * Math.sin((ph - .06) / .04 * Math.PI);
    if (ph < .14) return Math.sin((ph - .1) / .04 * Math.PI) * 1;
    if (ph < .18) return -.25 * Math.sin((ph - .14) / .04 * Math.PI);
    if (ph < .34 && ph > .24) return Math.sin((ph - .24) / .1 * Math.PI) * .18;
    return 0;
  };
  const draw = now => {
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== (w * dpr | 0)) { cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); x = 0; lastY = h * .55; }
    const speed = 180, dt = 1 / 60;
    for (let s = 0; s < 3; s++) {
      const nx = x + speed * dt / 3;
      const ph = ((now / 1000) * 110 / 60 + s / 180) % 1;
      const y = h * .55 - beatShape(ph) * h * .22 - ecgKick * Math.sin(now / 30) * h * .08;
      g.shadowBlur = 0; g.clearRect(nx + 1, 0, 40, h);
      g.strokeStyle = '#ff4757'; g.lineWidth = 2; g.shadowColor = '#ff4757'; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(x, lastY); g.lineTo(nx, y); g.stroke();
      x = nx > w ? 0 : nx; lastY = y;
    }
    ecgKick *= .9;
    raf = requestAnimationFrame(draw);
  };
  onVisible(root, v => { inView = v; cancelAnimationFrame(raf); if (v) raf = requestAnimationFrame(draw); setMetro(v && metro.checked); });
}

// ---------- 6f Together Against Addictions: calm light map + steps ----------
export function initTogether(root) {
  const svg = root.querySelector('.taa__map'), r = rng(9);
  let s = '';
  for (let i = 0; i < 26; i++) {
    let x = r() * 800, y = r() * 600, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    let a = r() * Math.PI * 2;
    for (let k = 0; k < 6; k++) { a += (r() - .5) * .9; x += Math.cos(a) * 60; y += Math.sin(a) * 60; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    s += `<path d="${d}"/>`;
  }
  for (let i = 0; i < 14; i++) s += `<circle cx="${(r() * 800).toFixed(0)}" cy="${(r() * 600).toFixed(0)}" r="${(2 + r() * 4).toFixed(1)}" style="animation-delay:${(-r() * 6).toFixed(2)}s"/>`;
  svg.innerHTML = s;
  const steps = root.querySelectorAll('.taa__steps li');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -15% 0px' });
  steps.forEach(li => io.observe(li));
}
