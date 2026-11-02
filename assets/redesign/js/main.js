// Fundacja Patrz Globalnie · "The Glass Eye" — page bootstrap
import { clamp, smooth, reduced, finePointer, onVisible, webglOK, rng } from './util.js';
import { initAI, initQuiz, initDrums, initCatwalk, initCPR, initTogether } from './worlds.js';
import { initStats } from './stats.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reduced) root.classList.add('reduced');
$$('.year').forEach(e => { e.textContent = new Date().getFullYear(); });

// ---------- nav ----------
const nav = $('#nav');
const onNavScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onNavScroll, { passive: true }); onNavScroll();
$('.nav__toggle').addEventListener('click', e => { const open = nav.classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', open); });
$$('.nav__links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

// ---------- scroll engine: sticky sections report 0..1 progress ----------
const scrollers = [];
function scrolly(el, fn, still = 1) { scrollers.push({ el, fn, still }); }
let ticking = false;
function runScroll() {
  ticking = false;
  const vh = window.innerHeight;
  for (const s of scrollers) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) continue;
    const total = Math.max(1, s.el.offsetHeight - vh);
    s.fn(reduced ? s.still : clamp(-r.top / total));
  }
}
const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } };
window.addEventListener('scroll', requestScroll, { passive: true });
window.addEventListener('resize', requestScroll);

// ---------- 3D (loaded only if WebGL works) ----------
const has3D = webglOK();
if (!has3D) { const f = $('.webgl-fallback'); f.hidden = false; setTimeout(() => { f.hidden = true; }, 6000); }

async function init3D() {
  if (!has3D) return;
  const [{ createEye }, { createMap }, { createTrash }] = await Promise.all([import('./eye.js'), import('./map.js'), import('./trash.js')]);

  // hero eye
  const hero = $('#hero');
  const eye = createEye($('.hero__canvas', hero), { mode: 'hero' });
  const veil = $('.hero__veil', hero), copy = $('.hero__copy', hero), hint = $('.hero__hint', hero);
  onVisible(hero, v => eye.setVisible(v), '0%');
  scrolly(hero, p => {
    eye.setProgress(p);
    veil.style.opacity = smooth(.72, .98, p);
    copy.style.opacity = 1 - smooth(0, .22, p);
    copy.style.transform = `translateY(${-p * 80}px)`;
    hint.style.opacity = 1 - smooth(0, .1, p);
  }, 0);

  // map
  const mapSec = $('#map');
  const card = $('.map__country', mapSec);
  const map = createMap(mapSec, info => {
    card.hidden = false;
    $('h3', card).textContent = info.name;
    const q = info.quote ? `<q>${info.quote[0]}</q><p class="small">${info.quote[1]}</p>` : '';
    $('.body', card).innerHTML = `${q}<p class="small">Projects:</p><ul>${info.projects.map(p => `<li><a href="${p.link}">${p.name}</a></li>`).join('')}</ul>`;
    guide.say(info.quote ? 'That quote is real. A participant said it.' : `${info.name}: ${info.projects.length} project${info.projects.length > 1 ? 's' : ''} so far.`);
  });
  $('.x', card).addEventListener('click', () => { card.hidden = true; });
  onVisible(mapSec, v => map.setVisible(v), '0%');
  scrolly(mapSec, p => map.setProgress(p));

  // trash → treasure
  const tr = $('#transform');
  const trash = createTrash(tr);
  onVisible(tr, v => trash.setVisible(v), '0%');
  scrolly(tr, p => trash.setProgress(reduced ? .95 : p));

  // footer eye: watches you, then closes when you reach the very bottom
  const foot = $('#foot');
  const feye = createEye($('.foot__eye', foot), { mode: 'footer' });
  let atBottomTimer = 0;
  onVisible(foot, v => { feye.setVisible(v); if (v) setTimeout(() => feye.blink(), 600); }, '0%');
  window.addEventListener('scroll', () => {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    clearTimeout(atBottomTimer);
    if (atBottom) atBottomTimer = setTimeout(() => feye.setSleep(1), 1400); else feye.setSleep(0);
  }, { passive: true });

  requestScroll();
}

// ---------- manifesto: glass shards assemble into the tagline ----------
(function manifesto() {
  const sec = $('#manifesto'), p = $('.manifesto__text:not(.manifesto__text--pl)', sec);
  const chars = [];
  const r = rng(4);
  const splitText = (text, parent) => {
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      [...part].forEach(c => {
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s);
        chars.push({ el: s, x: (r() - .5) * 900, y: (r() - .5) * 600, z: -400 + r() * 900, rx: (r() - .5) * 360, ry: (r() - .5) * 360, rz: (r() - .5) * 180, o: r() });
      });
      parent.appendChild(w);
    });
  };
  [...p.childNodes].forEach(n => {
    if (n.nodeType === 3) { const frag = document.createDocumentFragment(); splitText(n.textContent, frag); p.replaceChild(frag, n); }
    else { const t = n.textContent; n.textContent = ''; splitText(t, n); }
  });
  const steps = $$('.steps li', sec);
  scrolly(sec, prog => {
    const P = clamp(prog / .72);
    for (const c of chars) {
      const t = smooth(0, 1, clamp((P * 1.45 - c.o * .45)));
      const k = 1 - t;
      c.el.style.transform = k < .001 ? 'none' : `translate3d(${c.x * k}px,${c.y * k}px,${c.z * k}px) rotateX(${c.rx * k}deg) rotateY(${c.ry * k}deg) rotateZ(${c.rz * k}deg)`;
      c.el.style.opacity = .15 + .85 * t;
      c.el.style.filter = k > .05 ? `blur(${k * 6}px)` : 'none';
    }
    steps.forEach((s, i) => s.classList.toggle('on', P >= (i + 1) / 4 - .001));
  });
})();

// ---------- the glass lens ----------
(function lens() {
  const cursor = $('.lens-cursor');
  const targets = $$('[data-lens]');
  if (!finePointer) {
    targets.forEach(t => t.addEventListener('click', e => { if (e.target.closest('a')) return; t.classList.toggle('is-revealed'); }));
    return;
  }
  let x = -200, y = -200, tx = -200, ty = -200, raf = 0, over = null;
  const loop = () => { x += (tx - x) * .25; y += (ty - y) * .25; cursor.style.transform = `translate3d(${x}px,${y}px,0)`; raf = Math.abs(tx - x) + Math.abs(ty - y) > .3 ? requestAnimationFrame(loop) : 0; };
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY; cursor.classList.add('on');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  targets.forEach(t => {
    const big = t.classList.contains('manifesto__box') ? 130 : 90;
    t.addEventListener('pointerenter', () => { over = t; cursor.classList.add('big'); t.style.setProperty('--lr', `${big}px`); });
    t.addEventListener('pointerleave', () => { over = null; cursor.classList.remove('big'); t.style.setProperty('--lr', '0px'); });
    t.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--lx', `${e.clientX - r.left}px`); t.style.setProperty('--ly', `${e.clientY - r.top}px`); });
  });
  // keep lens sized correctly when scrolling under a static cursor
  window.addEventListener('scroll', () => { if (over) { const r = over.getBoundingClientRect(); over.style.setProperty('--lx', `${tx - r.left}px`); over.style.setProperty('--ly', `${ty - r.top}px`); } }, { passive: true });
})();

// ---------- the AI Narrator guide ----------
const guide = (function () {
  const el = $('.guide'), bubble = $('.guide__bubble', el);
  let off = false, form = 0, timer = 0;
  try { off = localStorage.getItem('pg-guide-off') === '1'; } catch { /* storage unavailable */ }
  const api = {
    say(text, ms = 6500) {
      if (off) return;
      el.hidden = false; bubble.textContent = text; el.classList.add('talking');
      clearTimeout(timer); timer = setTimeout(() => el.classList.remove('talking'), ms);
    },
    evolve(f) { if (f > form) { form = f; el.dataset.form = f; } }
  };
  $('.guide__x', el).addEventListener('click', () => { off = true; el.hidden = true; try { localStorage.setItem('pg-guide-off', '1'); } catch { /* ignore */ } });
  $('.guide__face', el).addEventListener('click', () => api.say(['I started life as an old computer in Art Meets AI.', 'Patrz Globalnie means “Look Globally”.', 'Krosno is Poland’s City of Glass. Hence all the glass.', 'Open calls are posted on Instagram: @patrz.globalnie.'][(Math.random() * 4) | 0]));
  const lines = {
    manifesto: 'Hello. I’m the Narrator from Art Meets AI. I started life as an old computer. I’ll be your guide.',
    map: 'Scroll, or drag the timeline. Each arc is a group of young people travelling to a project.',
    transform: 'Everything you see here was trash once. Try pushing the pile with your cursor.',
    closer: 'Use the lens. Every photo has an “after”.',
    ai: 'Oh, this is my show. Watch me evolve.',
    eye2025: 'Careful. Some of these quotes were written by something like me.',
    drums: 'Keys A S D F G. I can’t dance, but I can count to eight.',
    catwalk: 'Hover over a look to see what it was made from.',
    'first-aid': 'Hearts are not my speciality. 100–120 compressions a minute is.',
    together: 'This one is quieter. I’ll stay quiet too.',
    impact: 'These numbers are physical. Poke them.',
    voices: 'Turn the photos over. Those words are human. I checked.',
    join: 'Aged 18–30? Open calls go up on Instagram first.',
    foot: 'See you in Krosno. I’ll keep an eye on things.'
  };
  const seen = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || seen.has(e.target.id)) return;
    seen.add(e.target.id);
    api.say(lines[e.target.id], e.target.id === 'together' ? 3000 : 6500);
  }), { threshold: .35 });
  Object.keys(lines).forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  return api;
})();

// ---------- project worlds ----------
const aiSec = $('#ai');
scrolly(aiSec, initAI(aiSec, f => guide.evolve(f)));
initQuiz($('#eye2025'));
initDrums($('#drums'));
const cw = $('#catwalk');
if (!reduced) scrolly(cw, initCatwalk(cw)); else initCatwalk(cw);
initCPR($('#first-aid'));
initTogether($('#together'));
initStats($('#impact'));

// ---------- polaroids ----------
$$('.pola').forEach(p => p.addEventListener('click', () => {
  const was = p.classList.contains('flipped');
  $$('.pola.flipped').forEach(q => q.classList.remove('flipped'));
  if (!was) p.classList.add('flipped');
}));

// ---------- gentle reveals ----------
const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.closer .wrap > *, .ba, .eye25__grid > *, .drums .wrap > *, .aid__grid > *, .impact .wrap > *, .voices .wrap > *, .join__grid > *').forEach(el => { el.classList.add('reveal'); rv.observe(el); });

runScroll();
init3D().catch(err => { console.error('3D init failed', err); $('.webgl-fallback').hidden = false; });
