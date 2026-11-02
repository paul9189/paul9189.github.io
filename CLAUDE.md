# Fundacja Patrz Globalnie website

Static site for **Fundacja Patrz Globalnie** ("Look Globally"), a youth foundation from Krosno, Poland
that runs Erasmus+ projects mixing art, technology and sustainability. Hosted on GitHub Pages
(`paul9189/paul9189.github.io`). No build step: plain HTML/CSS/JS.

## Previewing locally
Serve the repo root (root `index.html` redirects to `html/index.html`):

    python3 -m http.server 8000

Then open http://localhost:8000/html/index.html. Pages must be served over http (ES modules +
importmap do not work from `file://`). Report links use `../assets/docs/...`.

## The redesign ("The Glass Eye"), on branch `claudiu/vigilant-clarke-b9ew6z`
The owner asked for the most unique, 3D, animated Erasmus+ site possible, built from real content
of the old site. Only `html/index.html` and `html/reports.html` were redesigned; the other pages
(about-us, projects, contact, project story pages, privacy-policy, blog) still use the OLD
ThemeWagon/WrapPixel template. Restyling them to match is the obvious next step.

Big idea: the name means "Look Globally" and Krosno is Poland's "City of Glass", so the site is a
journey through a 3D glass eye-globe. Brand: blue `#2e73c2`, dark `#1F2A2E`/`#070d11`,
fonts Unbounded (display), Manrope (body), JetBrains Mono, Caveat (polaroids).

Home page sections, in order (ids in brackets):
1. Hero (`hero`): three.js glass eye; iris = rotating Europe dot map + ring of 12 EU stars;
   follows cursor, blinks, dilates on click; scrolling dives into the pupil.
2. Manifesto (`manifesto`): tagline "When Curiosity Meets Action, Change Becomes Art." assembles
   from 3D letter shards; a glass lens cursor reveals the Polish version.
3. Living map (`map`): Europe as glowing dots, arcs from partner countries to each project,
   scroll- or slider-driven timeline; click a country for its projects/quote.
4. Trash -> Treasure (`transform`): instanced 3D junk pile rebuilds into the EcoArt tree,
   Fashion Forward dress, Follow Your Drums kit; cursor pushes the pile.
5. Look closer (`closer`): before/after photos revealed by the lens (tap on touch).
6. Project worlds: Art Meets AI theatre with evolving AI narrator (`ai`), "Human or John Doe?"
   deepfake quiz for EYE 2025 (`eye2025`), playable trash drum kit with WebAudio + unlockable
   groove (`drums`), horizontal recycled-runway catwalk (`catwalk`), CPR rhythm game +
   110 BPM metronome (`first-aid`), deliberately calm Together Against Addictions (`together`).
7. Touchable stats (`impact`): 1000 particles form "1000+", sloshing 95.1% vessel,
   500,000 ripples, 50 draggable partner beads.
8. Polaroid testimonials that flip (`voices`), FAQ/join (`join`), footer eye that closes at the
   bottom (`foot`). An "AI Narrator" guide in the corner comments per section (dismissible).

Owner decisions: NO "Erasmus+ passport" feature. Reports page must stay simple and calm
(it is there because the government requires it), no fancy effects.

## Code map
- `html/index.html` - new home page markup; `html/reports.html` - simple reports list.
- `assets/redesign/css/site.css` - all styles (tokens on `:root`, reduced-motion rules at bottom).
- `assets/redesign/js/main.js` - bootstrap: scroll engine (sticky `.scrolly` sections report
  0..1 progress), nav, manifesto, lens cursor, narrator guide, lazy 3D init.
- `eye.js` (hero + footer eye), `map.js`, `trash.js` - three.js scenes.
- `worlds.js` - AI narrator, quiz, drums, catwalk, CPR, Together section.
- `stats.js` - 2D canvas stat toys. `util.js` - shared helpers. `europe-dots.js` - generated
  Natural Earth land dots (lon, lat, partner index).
- `assets/redesign/vendor/` - three.js r160 + RoomEnvironment, vendored (no CDN).
- `assets/redesign/img/` - optimised copies of project photos used by the new pages.

## Content rules
- Use only real facts from the old pages (dates, places, participant counts, countries, quotes).
- Quiz lines marked `a: 'ai'` in `worlds.js` were written by AI on purpose and are revealed as such.
- Keep the white EU "Co-funded by the European Union" logo (`assets/redesign/img/eu-cofunded.png`).
- Respect `prefers-reduced-motion` and keep mobile layouts working (16px gutters, no sideways scroll).
