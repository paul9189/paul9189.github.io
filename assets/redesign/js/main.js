// Fundacja Patrz Globalnie · "The Glass Eye" — page bootstrap
import { clamp, smooth, reduced, onVisible, webglOK, rng } from './util.js';

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

// ---------- slower, eased mouse-wheel scrolling (keyboard, scrollbar and touch are untouched) ----------
(function slowWheel() {
  if (reduced) return;
  const SPEED = .9, EASE = .18;
  let target = 0, current = 0, raf = 0;
  const step = () => {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < .5) current = target;
    window.scrollTo({ top: current, behavior: 'instant' });
    raf = current === target ? 0 : requestAnimationFrame(step);
  };
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // pinch-zoom and sideways swipes
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (!raf) target = current = window.scrollY; // resync after keyboard/scrollbar/anchor scrolling
    target = clamp(target + dy * SPEED, 0, document.documentElement.scrollHeight - window.innerHeight);
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
})();

// ---------- 3D (loaded only if WebGL works) ----------
const has3D = webglOK();
if (!has3D) { const f = $('.webgl-fallback'); f.hidden = false; setTimeout(() => { f.hidden = true; }, 6000); }

/** Load a scene's code and build it only when its section comes within about a screen of the viewport. */
function whenNear(el, build) {
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    build().catch(err => { console.error('3D init failed', err); });
  }, { rootMargin: '120% 0px 120% 0px' });
  io.observe(el);
}

async function init3D() {
  if (!has3D) return;
  const { createEye } = await import('./eye.js');

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
  whenNear(mapSec, async () => {
    const { createMap } = await import('./map.js');
    const card = $('.map__country', mapSec);
    const map = createMap(mapSec, info => {
      card.hidden = false;
      $('h3', card).textContent = info.name;
      const q = info.quote ? `<q>${info.quote[0]}</q><p class="small">${info.quote[1]}</p>` : '';
      $('.body', card).innerHTML = `${q}<p class="small">Projects:</p><ul>${info.projects.map(p => `<li><a href="${p.link}">${p.name}</a></li>`).join('')}</ul>`;
    });
    $('.x', card).addEventListener('click', () => { card.hidden = true; });
    onVisible(mapSec, v => map.setVisible(v), '0%');
    scrolly(mapSec, p => map.setProgress(p));
    requestScroll();
  });

  // trash → treasure
  const tr = $('#transform');
  whenNear(tr, async () => {
    const { createTrash } = await import('./trash.js');
    const trash = createTrash(tr);
    onVisible(tr, v => trash.setVisible(v), '0%');
    scrolly(tr, p => trash.setProgress(reduced ? .95 : p));
    requestScroll();
  });

  requestScroll();
}

// ---------- manifesto: glass shards assemble into the tagline ----------
(function manifesto() {
  const sec = $('#manifesto'), p = $('.manifesto__text', sec);
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

// ---------- polaroids ----------
$$('.pola').forEach(p => p.addEventListener('click', () => {
  const was = p.classList.contains('flipped');
  $$('.pola.flipped').forEach(q => q.classList.remove('flipped'));
  if (!was) p.classList.add('flipped');
}));

// ---------- gentle reveals ----------
const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.posters .wrap > *:not(.poster-wall), .poster, .projects .wrap > h2, .proj, .voices .wrap > *, .join__grid > *').forEach(el => { el.classList.add('reveal'); rv.observe(el); });

runScroll();
init3D().catch(err => { console.error('3D init failed', err); $('.webgl-fallback').hidden = false; });
