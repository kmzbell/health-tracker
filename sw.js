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
const VERSION = 'ht-v3';   // 2026-11-23b: material-miss threshold, cross-day load sync
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

  e.respondWith(
    caches.match(req).then(hit => {
      const live = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);           // offline → whatever we have
      return hit || live;            // cache first, network fills the gap
    })
  );
});
