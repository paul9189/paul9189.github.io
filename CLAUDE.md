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
of the old site. Only `html/index.html`, `html/reports.html`, `html/contact.html` and `html/about-us.html` were
redesigned; the other pages (projects, project story pages, privacy-policy, blog) still use the OLD
ThemeWagon/WrapPixel template. Restyling them to match is the obvious next step.

Big idea: the name means "Look Globally" and Krosno is Poland's "City of Glass", so the site is a
journey through a 3D glass eye-globe. Brand: blue `#2e73c2`, dark `#1F2A2E`/`#070d11`,
fonts Unbounded (display), Manrope (body), JetBrains Mono, Caveat (polaroids).

Home page sections, in order (ids in brackets):
1. Hero (`hero`): three.js eye, made realistic in round 2 (veined sclera, hazel-to-blue iris with
   crypts seen through a refracting cornea, lashes, wet additive reflections instead of a
   transmission pass); the EU stars are gold flecks on the collarette and the Europe map is a faint
   overlay. Follows cursor, blinks, dilates on click; scrolling dives into the pupil.
2. Manifesto (`manifesto`): tagline "When Curiosity Meets Action, Change Becomes Art." assembles
   from 3D letter shards. (The owner removed the Polish-translation lens here; don't bring it back.)
3. Living map (`map`): Europe as glowing dots, arcs from partner countries to each project,
   scroll- or slider-driven timeline; click a country for its projects/quote.
4. Trash -> Treasure (`transform`): instanced 3D junk pile rebuilds into the EcoArt tree,
   Fashion Forward dress, Follow Your Drums kit; cursor pushes the pile. Dress and drums are built
   per piece type (`build()` in `trash.js`): pieces lie flat on surfaces and may be tinted/resized
   (dress = patchwork ball gown on a paper dress form + can stand; drums = red shells, fabric
   skins, brass cap cymbals, bottle stands, rug).
5. Posters (`posters`): wall of the original project posters (cropped copies in
   `assets/redesign/img/poster-*.jpg`), each linking to its story page. The owner removed the
   before/after lens photos that used to be here, and the lens cursor with them.
6. Projects (`projects`): simple, classic alternating poster/text rows, one per project, in date
   order, each showing the project's original poster and a story button. (A redesigned HTML
   poster series was tried and the owner rejected it; keep the original poster images.) The owner found the old
   animated "project worlds" (AI curtain theatre, drum kit, sideways catwalk, CPR game) overwhelming
   and also removed the "Human or John Doe?" quiz; keep this calm and static.
7. (The owner removed the Impact / touchable stats section; don't bring it back.)
8. Polaroid testimonials that flip (`voices`), FAQ/join (`join`), footer eye that closes at the
   bottom (`foot`). (The owner removed the corner "AI Narrator" guide and its comments; don't bring it back.)

Owner decisions: nav order is About Us, Projects, Contact, Reports (no Map link). Scrolling must feel slow:
mouse-wheel scrolling is eased, at 90% of normal speed (`slowWheel` in `main.js`, `SPEED`; the owner found .5 too slow), and the scroll-driven
sections were lengthened (`--len` on each `.scrolly`). Only two accent colours: brand blue and EU gold
(`--blue-hi`, `--gold`). NO "Erasmus+ passport" feature. Reports page must stay simple and calm
(it is there because the government requires it), no fancy effects.

## Code map
- `html/index.html` - new home page markup; `html/reports.html` - simple reports list.
- `html/contact.html` - calm contact page in the reports style. The old form never sent anything and
  the old email/phone were template placeholders, so it lists Instagram, Facebook and Krosno only.
  Add a real email or a working form here once the owner provides an address.
- `html/about-us.html` - calm About page in the same style: the old page's text and figures, plus
  six clean photos cut out of the old collage (`assets/redesign/img/about-1..6.jpg`), shown as a plain grid.
- `assets/redesign/css/site.css` - all styles (tokens on `:root`, reduced-motion rules at bottom).
- `assets/redesign/js/main.js` - bootstrap: scroll engine (sticky `.scrolly` sections report
  0..1 progress), nav, manifesto, lazy 3D init. Only the hero eye is
  built at load; map, trash and footer eye are imported and built when their section is about a
  screen away (`whenNear`). Scenes compile shaders without blocking via `compileScene` in `util.js`
  (do not use three r160's `compileAsync`: it throws from its polling timer).
- `eye.js` (hero + footer eye), `map.js`, `trash.js` - three.js scenes.
- `util.js` - shared helpers. `europe-dots.js` - generated
  Natural Earth land dots (lon, lat, partner index).
- `assets/redesign/vendor/` - three.js r160 + RoomEnvironment, vendored (no CDN).
- `assets/redesign/img/` - optimised copies of project photos used by the new pages.

## Content rules
- Use only real facts from the old pages (dates, places, participant counts, countries, quotes).
- Keep the white EU "Co-funded by the European Union" logo (`assets/redesign/img/eu-cofunded.png`).
- Respect `prefers-reduced-motion` and keep mobile layouts working (16px gutters, no sideways scroll).
