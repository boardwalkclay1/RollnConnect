const CACHE_NAME = 'rollnconnect-v1';

const CORE_ASSETS = [
  '/roll_app/chatrooms.html',
  '/roll_app/longboard.html',
  '/roll_app/blades.html',
  '/roll_app/quads.html',
  '/roll_app/skateboard.html',
  '/roll_app/virtual.html',
  '/roll_app/dashboard.html',
  '/roll_app/styles/style.css',
  '/roll_app/styles/stars-white.png',
  '/roll_app/manifest.webmanifest',
  '/roll_app/icons/icon-192.png',
  '/roll_app/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(networkRes => {
        // Optionally cache new GET responses
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return networkRes;
      }).catch(() => cached || Response.error());
    })
  );
});
