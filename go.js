// Opens the release in the Spotify app from in-app browsers (Instagram, Facebook, TikTok).
// Every visitor sees the same page; the app jump runs on top of it.
(function () {
  var cfg = document.body.dataset;
  var id = cfg.track;
  var web = 'https://open.spotify.com/track/' + id;
  var uri = 'spotify:track:' + id;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|Bytedance|Snapchat/i.test(ua);

  // Android: intent URL lands in the Spotify app, falls back to the web player if it isn't installed.
  var androidIntent = 'intent://open.spotify.com/track/' + id +
    '#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=' +
    encodeURIComponent(web) + ';end';

  function appLink() {
    if (isAndroid) return androidIntent;
    if (isIOS) return uri;
    return web;
  }

  var opened = false;
  function open(how) {
    if (opened && how === 'auto') return;
    opened = true;
    if (window.fbq) fbq('trackCustom', 'SpotifyOpen', { method: how, inapp: inApp, release: cfg.release });
    // Give the pixel a moment to send before the page is backgrounded.
    setTimeout(function () { window.location.href = appLink(); }, 250);
  }

  var btn = document.getElementById('play');
  btn.href = appLink();
  btn.addEventListener('click', function (e) { e.preventDefault(); opened = false; open('tap'); });
  document.getElementById('web').href = web;

  // Auto-open once per visit; coming back to the tab (bfcache) does not fire it again.
  var key = 'opened:' + cfg.release;
  var seen = false;
  try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch (e) {}
  if (!seen && (isAndroid || isIOS)) setTimeout(function () { open('auto'); }, 400);
})();
