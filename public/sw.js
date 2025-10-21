const PRECACHE_CACHE = "planloop-precache-v2"
const RUNTIME_CACHE = "planloop-runtime-v1"
const OFFLINE_URL = "/"
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/planloop-logo.svg",
  "/file.svg",
  "/globe.svg",
  "/window.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PRECACHE_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

const networkFirst = async (request, { fallbackToCache = true } = {}) => {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    if (!fallbackToCache) {
      throw error
    }
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    throw error
  }
}

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE)
  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cachedResponse) {
    fetchPromise.catch(() => undefined)
    return cachedResponse
  }

  const networkResponse = await fetchPromise
  if (networkResponse) {
    return networkResponse
  }

  return undefined
}

const handleNavigation = async (request) => {
  try {
    return await networkFirst(request)
  } catch (error) {
    const cache = await caches.open(PRECACHE_CACHE)
    const cached = await cache.match(OFFLINE_URL)
    if (cached) {
      return cached
    }
    throw error
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request))
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      staleWhileRevalidate(request)
        .then((response) => response ?? fetch(request))
        .catch(() => Response.error()),
    )
    return
  }

  if (
    url.origin === self.location.origin &&
    ["style", "script", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(
      staleWhileRevalidate(request)
        .then((response) => response ?? fetch(request))
        .catch(() => Response.error()),
    )
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(
      networkFirst(request)
        .catch(async () => {
          const cache = await caches.open(RUNTIME_CACHE)
          const cached = await cache.match(request)
          if (cached) {
            return cached
          }
          return Response.error()
        }),
    )
    return
  }

  event.respondWith(
    staleWhileRevalidate(request)
      .then((response) => response ?? fetch(request))
      .catch(() => Response.error()),
  )
})

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-shifts") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "SYNC_PENDING_REQUESTS" })
          }
        })
        .catch(() => undefined),
    )
  }
})
