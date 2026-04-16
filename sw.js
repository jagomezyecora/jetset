const CACHE_NAME = 'jetset-proto-v2'
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/player.svg',
  '/assets/tile_ground.svg',
  '/assets/icon-192.svg',
  '/levels/level1.json'
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

// network-first for navigation, cache-first for assets
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then((c) => c.put(req, copy))
        return res
      }).catch(() => caches.match('/index.html'))
    )
    return
  }

  // static assets: cache first
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      // cache fetched asset for offline
      const copy = res.clone()
      caches.open(CACHE_NAME).then((c) => c.put(req, copy))
      return res
    }))
  )
})
