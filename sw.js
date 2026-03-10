const CACHE = 'rankforge-v1';
const ASSETS = [
  '/', '/index.html', '/css/styles.css',
  '/js/app.js', '/js/pages.js', '/js/discord.js', '/js/features.js',
  '/js/firebase-config.js',
];

self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
