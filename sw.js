const VERSION = '1.0.21'
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

  // version.json 永远走网络，不缓存，用于版本检测
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    )
    return
  }

  // 其他资源：cache-first，后台更新缓存
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response.ok && e.request.url.startsWith('http')) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()))
        }
        return response
      })
      return cached || networkFetch
    })
  )
})

// 收到主线程的 skipWaiting 消息，立即激活新 SW
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting()
})
