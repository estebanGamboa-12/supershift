self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || "Supershift"
  const body = data.body || "Tienes novedades en tu planificación de turnos."
  const url = data.url || "/"
  const tag = data.tag || "supershift-push"

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url, ...data },
      tag,
      renotify: true,
      badge: "/icons/badge.png",
      icon: "/icons/icon-192.png",
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
