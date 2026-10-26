// Opens the release in the Spotify app from in-app browsers (Instagram, Facebook, TikTok).
// Every visitor sees the same page; the app jump runs on top of it.
(function () {
  var cfg = document.body.dataset;
  var id = cfg.track;
  var web = 'https://open.spotify.com/track/' + id;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isInstagram = /Instagram/i.test(ua);
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

  // Pixel events, each at most once per page load:
  //   SpotifyOpen   - first attempt to open the app (method: auto or tap).
  //   SpotifyLeft   - the page went to the background within 3s of an attempt, i.e. the person
  //                   actually left for Spotify (allowed the Instagram prompt, or the app opened).
  //                   A longer window also caught people just closing the in-app browser.
  var attempted = false, left = false, attemptAt = 0;
  function send(name, how) {
    if (window.fbq) fbq('trackCustom', name, { method: how, inapp: inApp, release: cfg.release });
  }
  function track(how) {
    attemptAt = Date.now();
    if (attempted) return;
    attempted = true;
    send('SpotifyOpen', how);
    var firstHow = how;
    document.addEventListener('visibilitychange', function () {
      if (left || document.visibilityState !== 'hidden' || Date.now() - attemptAt > 3000) return;
      left = true;
      send('SpotifyLeft', firstHow);
    });
  }

  function open(how) {
    track(how);
    if (isAndroid) {
      // Give the pixel a moment to send before the page is backgrounded.
      setTimeout(function () { window.location.href = androidIntent; }, 250);
    } else if (isIOS && isInstagram) {
      // Instagram's own scheme hands the link to iOS outside the in-app browser, which opens the
      // Spotify app (Instagram shows an "allow" prompt first). Tested Oct 22 2026; without the
      // app iOS opens the web page instead. A plain spotify: navigation errors here (LinkTwin too).
      window.location.replace('instagram://extbrowser/?url=' + encodeURIComponent(web));
    }
    // Other iOS in-app browsers: nothing automatic; the target=_blank tap below works.
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

  // Auto-open once per 30 minutes. Instagram reloads the page in a fresh webview when people come
  // back from Spotify, so sessionStorage alone let it fire again (~2 page loads per ad click).
  var key = 'opened:' + cfg.release;
  var seen = false;
  try {
    seen = sessionStorage.getItem(key) === '1' || Date.now() - Number(localStorage.getItem(key) || 0) < 30 * 60 * 1000;
    sessionStorage.setItem(key, '1');
    localStorage.setItem(key, String(Date.now()));
  } catch (e) {}
  if (!seen && (isAndroid || (isIOS && isInstagram))) setTimeout(function () { open('auto'); }, 300);
})();
