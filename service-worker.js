/* Songwriter: offline support and automatic updates (same approach as the Setlist app).

   VERSION is stamped by publish.sh on every upload. When it changes, phones download the
   new version in the background and the page refreshes itself (see index.html).

   Only touches caches whose names start with "songwriter-", so it can never delete the
   Setlist app's offline copy (both apps live on setlistapp.github.io). */
var VERSION = 'f73fd31a23';
var PREFIX = 'songwriter-';
var CACHE = PREFIX + VERSION;
var SHELL = ['./', './index.html', './styles.css', './theory.js', './instruments.js', './app.js'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // One at a time (not cache.addAll) so one failed file can't block the update.
      return Promise.all(SHELL.map(function (url) {
        return fetch(url, { cache: 'no-cache' })
          .then(function (res) { if (res && res.ok) return cache.put(url, res); })
          .catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(PREFIX) === 0 && k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function saveCopy(req, res) {
  if (res && res.ok) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  // The page itself: always try the network first so a new version shows up right away.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') saveCopy('./index.html', res);
        return res;
      }).catch(function () {
        return caches.match('./index.html', { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('./', { ignoreSearch: true });
        });
      })
    );
    return;
  }

  // App files and fonts: use the saved copy (fast, works offline), refresh it in the background.
  if (!sameOrigin && FONT_HOSTS.indexOf(url.hostname) === -1) return;
  event.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { return saveCopy(req, res); }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
