var CACHE_NAME = 'novel-browser-glass-v1';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './favicon.png',
  './manifest.webmanifest'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(ASSETS);
  }).then(function() {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return key.indexOf('novel-browser-glass-') === 0 && key !== CACHE_NAME;
    }).map(function(key) {
      return caches.delete(key);
    }));
  }).then(function() {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.indexOf('/api/') !== -1) {
    return;
  }
  event.respondWith(caches.match(event.request).then(function(cached) {
    return cached || fetch(event.request);
  }));
});
