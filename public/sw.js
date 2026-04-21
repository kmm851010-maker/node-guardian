// PiLink Service Worker - Web Push 알림 처리

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, icon, badge, data: extraData } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? '/icon-192.png',
      badge: badge ?? '/icon-192.png',
      vibrate: [200, 100, 200],
      data: extraData ?? {},
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
})
