// Click-to-load YouTube: nothing is requested from YouTube/Google until the visitor presses play.
// Markup: <div class="story__frame yt"><a class="yt__play" href="https://www.youtube.com/watch?v=ID" data-yt="ID">…</a></div>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a.yt__play[data-yt]');
  if (!a) return;
  e.preventDefault();
  var f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(a.dataset.yt) + '?autoplay=1&rel=0';
  f.title = a.dataset.title || 'YouTube video';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  a.parentNode.replaceChild(f, a);
  f.focus();
});
