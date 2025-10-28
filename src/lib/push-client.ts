const DEFAULT_SERVICE_WORKER_PATH = "/push-sw.js"

function getVapidKey(): string | null {
  if (typeof process === "undefined") {
    return null
  }
  const value = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }
  return null
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  const safeBuffer = new ArrayBuffer(outputArray.byteLength)
  new Uint8Array(safeBuffer).set(outputArray)
  return safeBuffer
}

export type PushToggleResult = {
  ok: boolean
  message: string
}

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Las notificaciones push solo pueden gestionarse en el navegador")
  }
}

function serializeSubscription(subscription: PushSubscription): unknown {
  if (typeof subscription.toJSON === "function") {
    return subscription.toJSON()
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: (subscription as unknown as { keys?: Record<string, string> }).keys ?? null,
  }
}

export async function enablePushNotifications({
  userId,
  vapidPublicKey = getVapidKey(),
  serviceWorkerPath = DEFAULT_SERVICE_WORKER_PATH,
}: {
  userId?: string | number | null
  vapidPublicKey?: string | null
  serviceWorkerPath?: string
} = {}): Promise<PushToggleResult> {
  try {
    ensureBrowser()

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return {
        ok: false,
        message:
          "Tu navegador no soporta notificaciones push. Usa la última versión de Chrome, Firefox o Safari.",
      }
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return {
        ok: false,
        message: "Debes conceder permiso de notificaciones para habilitar los avisos push.",
      }
    }

    const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/",
      updateViaCache: "none",
    })

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const options: PushSubscriptionOptionsInit = { userVisibleOnly: true }
      if (vapidPublicKey) {
        options.applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey)
      }
      subscription = await registration.pushManager.subscribe(options)
    }

    const response = await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId ?? null,
        subscription: serializeSubscription(subscription),
      }),
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "")
      throw new Error(message || "No se pudo registrar la suscripción push en el servidor")
    }

    return {
      ok: true,
      message: "Listo, recibirás avisos push en este dispositivo.",
    }
  } catch (error) {
    console.error("Error enabling push notifications", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron habilitar las notificaciones push.",
    }
  }
}

export async function disablePushNotifications({
  serviceWorkerPath = DEFAULT_SERVICE_WORKER_PATH,
}: {
  serviceWorkerPath?: string
} = {}): Promise<PushToggleResult> {
  try {
    ensureBrowser()

    if (!("serviceWorker" in navigator)) {
      return {
        ok: true,
        message: "No hay un service worker registrado.",
      }
    }

    const registration =
      (await navigator.serviceWorker.getRegistration(serviceWorkerPath)) ||
      (await navigator.serviceWorker.getRegistration())

    if (!registration) {
      return {
        ok: true,
        message: "No había notificaciones push activas en este dispositivo.",
      }
    }

    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch("/api/notifications/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: serializeSubscription(subscription) }),
      }).catch((error) => {
        console.warn("No se pudo eliminar la suscripción en el servidor", error)
      })
      await subscription.unsubscribe().catch((error) => {
        console.warn("No se pudo cancelar la suscripción local", error)
      })
    }

    await registration.unregister().catch((error) => {
      console.warn("No se pudo desregistrar el service worker", error)
    })

    return {
      ok: true,
      message: "Las notificaciones push quedaron deshabilitadas.",
    }
  } catch (error) {
    console.error("Error disabling push notifications", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron deshabilitar las notificaciones push.",
    }
  }
}
