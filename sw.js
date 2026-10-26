/* Service worker: permite usar la app sin internet.
   Cuando cambies archivos, sube el número de VERSION para que los teléfonos se actualicen. */
const VERSION = 'fraiche-beta-0.1';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/utils.js', './js/store.js', './js/excel.js', './js/app.js', './js/inicio.js', './js/vender.js',
  './js/tabulador.js', './js/inventario.js', './js/pedidos.js', './js/reportes.js', './js/ajustes.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero intenta internet (para recibir cambios); si no hay, usa lo guardado.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copia = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
