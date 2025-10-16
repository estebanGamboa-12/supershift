"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }
      } catch (error) {
        console.error("Error registrando el service worker", error)
      }
    }

    register()

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => registration.update())
          .catch(() => undefined)
      }
    }
  }, [])

  return null
}
