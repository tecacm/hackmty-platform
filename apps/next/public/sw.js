// Web Push Service Worker for HackMTY Platform

// Force active state immediately on install
self.addEventListener('install', function (event) {
  self.skipWaiting()
})

// Claim control over all client tabs immediately on activate
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { body: event.data.text() }
  }

  const title = data.title || data.notification?.title || 'HackMTY Alert'
  const options = {
    body: data.body || data.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.data || {},
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const urlToOpen = event.notification.data?.url || 'https://staging.experience.hackmty.com'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
