/* Health Tracker service worker.
   Strategy: stale-while-revalidate — the app opens instantly from cache
   (works with no signal in a garage), and quietly refreshes in the
   background so the next launch has any update.

   NOTE: your training data lives in localStorage on the device.
   This cache only holds the app files. Clearing it never touches your log. */

/* Bump VERSION on every release. The fetch strategy below is cache-first, so without a
   bump the first launch after a deploy still serves the OLD app and only refreshes in the
   background — the update would not appear until the second launch. Changing this file is
   what triggers install -> re-fetch shell -> activate -> delete the stale cache. */
const VERSION = 'ht-v5';   // 2026-11-23d: network-first HTML so updates land on first load
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  /* HTML/navigation: NETWORK-FIRST.
     This used to be cache-first for everything, which meant a deploy did not reach the
     user until the SECOND launch -- the app silently kept running the old build. On
     2026-11-23 that cost two round trips: Kevin was told to use a Restore control that
     his running copy did not have, and the old build's "Bad JSON" error was the only
     clue he was on a stale version. Offline still works via the cache fallback. */
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  /* Everything else (icons, manifest): cache-first, refresh in the background. */
  e.respondWith(
    caches.match(req).then(hit => {
      const live = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || live;
    })
  );
});
