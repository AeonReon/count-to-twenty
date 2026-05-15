// Count to Twenty — offline-first service worker.
// Pre-cache shell + audio so the PWA runs on a tablet with no internet.

const CACHE = 'c2t-v7';
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
  './games/10-hot-air-balloons.html',
  './games/11-five-little-ducks.html',
  './games/12-dino-park.html',
  './games/13-mermaid-pearl-dive.html',
  './games/14-snowman-build.html',
  './games/15-bug-catch.html',
  './games/16-train-engineer.html',
  './games/17-carnival-tickets.html',
  './games/18-jungle-coconut.html',
  './games/19-beach-sandcastle.html',
  './games/20-magic-show.html',
  './games/01b-apple-count.html',
  './games/02b-crab-race.html',
  './games/03b-spider-climb.html',
  './games/04b-music-box.html',
  './games/05b-dragon-missing.html',
  './games/06b-pirate-trail.html',
  './games/07b-asteroid-defense.html',
  './games/08b-sprinkle-count.html',
  './games/09b-unicorn-compare.html',
  './games/10b-balloon-race.html',
  './games/11b-duckling-parade.html',
  './games/12b-dino-footprints.html',
  './games/13b-compass-missing.html',
  './games/14b-penguin-slide.html',
  './games/15b-snail-race.html',
  './games/16b-train-sort.html'
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
