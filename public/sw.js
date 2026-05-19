const CACHE = 'mundoequil-20260518'

const STATIC = [
  '/',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // API routes y recursos externos → network-only, sin caché
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return
  }

  // App shell → cache-first, fallback a /offline si no hay red
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        if (res.ok && request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      }).catch(() => caches.match('/offline'))
    })
  )
})
