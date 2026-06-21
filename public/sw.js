// PropSync Service Worker — push notifications + basic offline support

const CACHE = 'propsync-v1'
const OFFLINE_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png']

// Network-first for navigations; if offline, fall back to the cached shell.
// Keeps the app usable (and passes PWA installability audits) without
// interfering with API calls (those just pass through to the network).
self.addEventListener('fetch', function (event) {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Don't cache API or cross-origin (R2/Supabase) requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.mode === 'navigate') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/dashboard')))
  )
})

self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'PropSync', body: event.data.text() }
  }

  const title = payload.title ?? 'PropSync'
  const options = {
    body: payload.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag ?? 'propsync-notification',
    renotify: true,
    data: {
      url: payload.url ?? '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim())
})
