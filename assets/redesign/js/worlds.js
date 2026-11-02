// EYE 2025: "Human, or John Doe?" — spot which lines a participant wrote and which an AI wrote.

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
    next.hidden = false; next.focus({ preventScroll: true });
  }));
  next.addEventListener('click', () => { if (i >= QUIZ.length) { i = 0; score = 0; } else i++; show(); });
  show();
}
