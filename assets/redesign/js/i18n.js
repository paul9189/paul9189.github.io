// English / Polish switch. English is the page itself; Polish text lives in ../i18n/pl/<page>.json and is
// loaded only when Polish is chosen. The choice is kept in the address (?lang=pl) and carried on every
// internal link, never in cookies or storage (the site stores nothing on the visitor's device).
//
// Markup (added by the tagging script): data-i18n="key" swaps an element's innerHTML,
// data-i18n-attr="alt:key;aria-label:key" swaps attributes, <html data-i18n-page="name"> names the JSON file.
// Scripts that build their own text read window.i18n.lang and listen for the "i18n:change" event.
(function () {
  var root = document.documentElement;
  var base = (document.currentScript && document.currentScript.src || '').replace(/js\/i18n\.js.*$/, 'i18n/');
  var params = new URLSearchParams(location.search);
  var lang = params.get('lang') === 'pl' ? 'pl' : 'en';
  var english = new Map();      // element -> original innerHTML, so switching back needs no reload
  var englishAttr = new Map();  // element -> { attr: original value }
  var englishHead = { title: document.title, description: '' };
  var cache = null, listeners = [];

  var api = window.i18n = {
    get lang() { return lang; },
    t: function (en, pl) { return lang === 'pl' && pl != null ? pl : en; },
    onChange: function (fn) { listeners.push(fn); }
  };

  // keep Polish visitors from seeing a flash of English while the text loads
  if (lang === 'pl') { root.classList.add('i18n-pending'); root.lang = 'pl'; setTimeout(function () { root.classList.remove('i18n-pending'); }, 2500); }

  function withLang(href, l) {
    if (!href || /^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return href;
    var u;
    try { u = new URL(href, location.href); } catch (e) { return href; }
    if (u.origin !== location.origin || !/(\.html|\/)$/.test(u.pathname)) return href;
    if (l === 'pl') u.searchParams.set('lang', 'pl'); else u.searchParams.delete('lang');
    // keep links relative-looking for the same page, absolute paths otherwise
    return u.pathname + u.search + u.hash;
  }
  function fixLinks(scope) {
    (scope || document).querySelectorAll('a[href]').forEach(function (a) {
      if (a.closest('.lang')) return;
      var h = a.getAttribute('href'), n = withLang(h, lang);
      if (n !== h) a.setAttribute('href', n);
    });
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    var page = root.getAttribute('data-i18n-page');
    if (!page) return Promise.resolve({});
    return fetch(base + 'pl/' + page + '.json').then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; }).then(function (d) { cache = d; return d; });
  }

  function apply(dict) {
    var pl = lang === 'pl';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (!english.has(el)) english.set(el, el.innerHTML);
      var html = pl && dict[k] != null ? dict[k] : english.get(el);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      if (!englishAttr.has(el)) englishAttr.set(el, {});
      var orig = englishAttr.get(el);
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':'); if (i < 0) return;
        var attr = pair.slice(0, i), k = pair.slice(i + 1);
        if (!(attr in orig)) orig[attr] = el.getAttribute(attr);
        el.setAttribute(attr, pl && dict[k] != null ? dict[k] : orig[attr]);
      });
    });
    var meta = document.querySelector('meta[name="description"]');
    if (meta && !englishHead.description) englishHead.description = meta.content;
    document.title = pl && dict['@title'] ? dict['@title'] : englishHead.title;
    if (meta) meta.content = pl && dict['@description'] ? dict['@description'] : englishHead.description;
    root.lang = lang;
    fixLinks();
    updateSwitch();
    root.classList.remove('i18n-pending');
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
  }

  function setLang(l) {
    lang = l;
    var u = new URL(location.href);
    if (l === 'pl') u.searchParams.set('lang', 'pl'); else u.searchParams.delete('lang');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    (l === 'pl' ? load() : Promise.resolve(cache || {})).then(apply);
  }

  // the EN | PL switch, placed in the top bar of every page
  var sw;
  function updateSwitch() {
    if (!sw) return;
    sw.querySelectorAll('a').forEach(function (a) {
      var on = a.getAttribute('data-lang') === lang;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      var u = new URL(location.href);
      if (a.getAttribute('data-lang') === 'pl') u.searchParams.set('lang', 'pl'); else u.searchParams.delete('lang');
      a.setAttribute('href', u.pathname + u.search + u.hash);
    });
  }
  function buildSwitch() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    sw = document.createElement('div');
    sw.className = 'lang';
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Language / Język');
    sw.innerHTML = '<a data-lang="en" lang="en" hreflang="en" title="English">EN</a><a data-lang="pl" lang="pl" hreflang="pl" title="Polski">PL</a>';
    nav.insertBefore(sw, nav.querySelector('.nav__toggle'));
    sw.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-lang]');
      if (!a) return;
      e.preventDefault();
      if (a.getAttribute('data-lang') !== lang) setLang(a.getAttribute('data-lang'));
    });
    updateSwitch();
  }

  // links added later by scripts (map cards, project links) also keep the language
  function watch() {
    new MutationObserver(function (ms) {
      if (lang !== 'pl') return;
      ms.forEach(function (m) {
        if (m.type === 'attributes') { var h = m.target.getAttribute('href'), n = withLang(h, lang); if (n !== h) m.target.setAttribute('href', n); }
        else m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches('a[href]')) fixLinks(n.parentNode); else fixLinks(n); } });
      });
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  }

  function start() {
    buildSwitch();
    watch();
    if (lang === 'pl') load().then(apply);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
