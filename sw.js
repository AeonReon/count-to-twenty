// Count to Twenty — offline-first service worker.
// Pre-cache shell + audio so the PWA runs on a tablet with no internet.

const CACHE = 'c2t-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon.svg',
  './js/engine.js',
  './js/engine.css',
  './games/01-rocket-fuel.html',
  './games/02-ghost-jar.html',
  './games/03-fish-pond.html',
  './games/04-princess-cupcakes.html',
  './games/05-dragon-eggs.html',
  './games/06-pirate-chests.html',
  './games/07-space-aliens.html',
  './games/08-bakery-oven.html',
  './games/09-unicorn-bridge.html',
  './games/10-hot-air-balloons.html'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  // Cache-first for same-origin GETs (shell + audio mp3s)
  if(url.origin === location.origin){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      if(cached) return cached;
      try {
        const res = await fetch(e.request);
        if(res && res.status === 200 && res.type === 'basic'){
          cache.put(e.request, res.clone());
        }
        return res;
      } catch(err) {
        return cached || new Response('Offline', { status: 503 });
      }
    })());
  }
});
