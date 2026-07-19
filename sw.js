const CACHE_NAME = 'cuentas-claras-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/db.js',
  './js/format.js',
  './js/charts.js',
  './js/analytics.js',
  './js/crypto.js',
  './js/csv.js',
  './js/app.js',
  './js/screens/inicio.js',
  './js/screens/movimientos.js',
  './js/screens/resumen.js',
  './js/screens/estadistica.js',
  './js/screens/diagrama.js',
  './js/screens/calendario.js',
  './js/screens/presupuestos.js',
  './js/screens/objetivos.js',
  './js/screens/ajustes.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
