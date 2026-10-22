// Opens the release in the Spotify app from in-app browsers (Instagram, Facebook, TikTok).
// Every visitor sees the same page; the app jump runs on top of it.
(function () {
  var cfg = document.body.dataset;
  var id = cfg.track;
  var web = 'https://open.spotify.com/track/' + id;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|Bytedance|Snapchat/i.test(ua);

  // Android: intent URL lands in the Spotify app, falls back to the web player if it isn't installed.
  var androidIntent = 'intent://open.spotify.com/track/' + id +
    '#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=' +
    encodeURIComponent(web) + ';end';

  // iOS: the web URL is a universal link. Inside Instagram it only reaches the app when it opens in
  // a new window (tested Oct 22 2026: same-window navigation stays in the in-app browser, a
  // target=_blank tap opens Spotify and starts the track). Without the app it shows the web page.
  function appLink() {
    if (isAndroid) return androidIntent;
    return web;
  }

  function track(how) {
    if (window.fbq) fbq('trackCustom', 'SpotifyOpen', { method: how, inapp: inApp, release: cfg.release });
  }

  function open(how) {
    track(how);
    if (isAndroid) {
      // Give the pixel a moment to send before the page is backgrounded.
      setTimeout(function () { window.location.href = androidIntent; }, 250);
    }
    // iOS: nothing automatic. Instagram blocks app opens that aren't a tap (tested Oct 22 2026, ours
    // and LinkTwin's both hit "problem loading this website"); the target=_blank tap below works.
  }

  // The button and the artwork both open the app.
  ['play', 'art'].forEach(function (elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.href = appLink();
    if (isAndroid) {
      el.addEventListener('click', function (e) { e.preventDefault(); open('tap'); });
    } else {
      // A real target=_blank link tap is what Instagram hands to the app; don't intercept it.
      el.target = '_blank';
      el.rel = 'noopener';
      el.addEventListener('click', function () { track('tap'); });
    }
  });
  document.getElementById('web').href = web;

  // Auto-open once per visit; coming back to the tab (bfcache) does not fire it again.
  var key = 'opened:' + cfg.release;
  var seen = false;
  try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch (e) {}
  if (!seen && isAndroid) setTimeout(function () { open('auto'); }, 300);
})();
