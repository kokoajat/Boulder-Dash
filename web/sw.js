/* Boulder Dash - service worker: peli toimii myös ilman verkkoyhteyttä. */
const CACHE = 'boulderdash-v1';
const FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/sprites.js', './js/engine.js', './js/caves.js', './js/storage.js',
  './js/audio.js', './js/input.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
