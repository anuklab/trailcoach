// Service worker: shell de la app cacheado como red primero (network-first) para que el móvil
// siempre vea la última versión en cuanto hay conexión, y solo caiga al caché si no hay red.
// Los datos (API) nunca se cachean: siempre van a la red.
const CACHE = 'trailcoach-shell-v7';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/logo-mark-128.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// El cliente puede pedir que el SW nuevo tome el control ya (ver app.js).
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // nunca cache de datos
  if (e.request.method !== 'GET') return;
  // Network-first: intenta la red siempre que se pueda, y solo usa el caché como respaldo offline.
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
