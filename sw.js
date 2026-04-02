const CACHE = 'v2'
const FILES = ['./', './index.html', './app.js', './style.css']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Network first with offline fallback strategy
  e.respondWith(
    fetch(e.request).then(response => {
      // Don't cache browser extensions or non-HTTP schemas
      if (!e.request.url.startsWith('http')) return response;
      
      const resClone = response.clone();
      caches.open(CACHE).then(cache => {
        cache.put(e.request, resClone);
      });
      return response;
    }).catch(() => {
      return caches.match(e.request);
    })
  );
})
