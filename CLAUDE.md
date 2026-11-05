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
of the old site. The whole site is now on the new design: home, about, contact, reports, `projects.html` (all-projects list),
`privacy-policy.html`, `404.html` (also copied to the repo root, where GitHub Pages looks for it), all story pages in
`html/`, and the Art Meets AI 1 pages `aiart/aiartindex.html` + `aiart/resources.html`. Filler/duplicate pages are now
tiny redirects: `html/projects-detail.html` and `html/blog.html` → projects.html, `aiart/about.html` →
aiartindex.html#team, `aiart/blog_detail.html` → aiartindex.html, `aiart/contact.html` → html/contact.html.
The old ThemeWagon/WrapPixel CSS/JS under `assets/libs`, `assets/css` and `aiart/css|js` is no longer used by any
page. The old pages used the OLD
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
   poster series was tried and the owner rejected it; keep the original poster images. Exception: Fashion
   Forward now uses the owner-chosen Canva magazine cover `poster-fashion-cover.jpg`, with the EU logo added;
   the old `poster-fashion.jpg` is kept but unused.) The owner found the old
   animated "project worlds" (AI curtain theatre, drum kit, sideways catwalk, CPR game) overwhelming
   and also removed the "Human or John Doe?" quiz; keep this calm and static.
7. (The owner removed the Impact / touchable stats section; don't bring it back.)
8. Polaroid testimonials that flip (`voices`), FAQ/join (`join`), footer (`foot`). (The owner
   removed the footer eye that closed at the bottom; don't bring it back.) (The owner removed the corner "AI Narrator" guide and its comments; don't bring it back.)

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
- `html/fashionforward.html` - the first project story page in the new design (template for the others):
  the ORIGINAL banner kept whole (`ff/banner.jpg`, owner asked to keep it), title + facts strip, numbered
  chapters with the old page's text, photos as slightly crooked paper prints (`.shot`), a sideways-scrolling
  film strip of catwalk photos (`.runway`), video, quote, partner/press list, EU logo. Styles under
  "project story page" in `site.css`; photos are trimmed copies in `assets/redesign/img/ff/`.
  Uses its own `.fade` class (not `.reveal`, which needs main.js).
  `ecoart.html` and `followyourdrums.html` follow the same template (photos in `img/eco/`, `img/drums/`;
  `.story__facts--4` for a 4-item facts strip, `.story__videos` for several videos). Drums has no
  press list because its old page had none of its own. EcoArt's old "Subjects: Brand identity, Digital
  design" was template filler, replaced with "Upcycled art, digital skills" from the page's own text.
  eye2025, razem, firstaid-blog and aiart2-blog use the same template (photos in `img/eye|razem|aid|ai2/`).
  EYE 2025 and AI 2.0 had no EU logo on their old pages, so they still have none; their old press lists
  (copied from other projects) were already commented out and were dropped. AI 2.0 keeps its old future
  tense ("will"): the site has no record yet of how it went. `.story__banner--tall` crops a tall banner to 2.2:1.
- Every poster on the home page (wall + project rows) links to its project page.
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

## Privacy / GDPR (owner asked for full EU compliance; keep it true)
- `privacy-policy.html` is a GDPR Art. 13/14 notice that describes what the site ACTUALLY does. If you add
  anything that sends data to a third party (analytics, embeds, fonts, maps, forms, pixels), update the notice
  in the same change, and prefer not to add it at all.
- Fonts are self-hosted: `assets/redesign/css/fonts.css` + `assets/redesign/fonts/` (latin + latin-ext, needed for
  Polish). Never link Google Fonts again (IP transfer to Google without consent; LG München 2022).
- YouTube is click-to-load only: markup `<div class="story__frame yt"><a class="yt__play" href="https://www.youtube.com/watch?v=ID" data-yt="ID" data-title="…">`
  plus `assets/redesign/js/yt-consent.js`, which swaps in a youtube-nocookie iframe on click. Never put a YouTube
  iframe straight into the HTML. Each video group has a `.yt__privacy` note linking to the notice.
- The site sets no cookies and uses no local storage; that is why there is no cookie banner. Keep it that way.
- The notice still has gold `<mark class="todo">` placeholders (registered address, KRS/NIP/REGON, contact
  email, email provider). They MUST be filled in by the owner before publishing. The 12-month retention for
  messages was a proposed default, to be confirmed by the owner.

## Content rules
- Use only real facts from the old pages (dates, places, participant counts, countries, quotes).
- The "Co-funded by the European Union" logo appears ONLY on the project story pages (ecoart,
  fashionforward, firstaid-blog, followyourdrums, razemprzeciwuzaleznieniom). The owner removed it
  from home, about, contact and reports; don't add it to non-project pages.
- Respect `prefers-reduced-motion` and keep mobile layouts working (16px gutters, no sideways scroll).
