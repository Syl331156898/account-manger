const VERSION = '1.2.3'
const CACHE = 'app-' + VERSION
const FILES = ['./', './index.html', './app.js', './style.css', './manifest.json', './icon-192.png', './icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // version.json 永远走网络，不缓存
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    )
    return
  }

  // 网络优先：先尝试网络，失败才用缓存（确保每次都能拿到最新代码）
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => caches.match(e.request))
  )
})

// 收到主线程的 skipWaiting 消息，立即激活新 SW
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting()
})
