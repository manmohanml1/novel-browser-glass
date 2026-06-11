var CACHE_NAME = 'novel-browser-glass-v0-2-2-ux-polish';
var ASSETS = [
  './',
  './index.html',
  './styles.css?v=0.2.2-ux-polish',
  './app.js?v=0.2.2-ux-polish',
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
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(fetch(event.request).then(function(response) {
    if (!response || response.status !== 200) {
      return response;
    }
    var clone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(event.request, clone);
    });
    return response;
  }).catch(function() {
    return caches.match(event.request);
  }));
});
