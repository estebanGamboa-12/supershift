"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "corp:pwa-install-banner"

type BeforeInstallPromptEvent = Event & {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt: () => Promise<void>
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function detectIos() {
  if (typeof window === "undefined") {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    setIsStandalone(isStandaloneDisplay())
    setIsIos(detectIos())

    const stored = window.localStorage.getItem(STORAGE_KEY)
    setIsDismissed(stored === "hidden")
    setIsReady(true)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsDismissed(false)
      window.localStorage.removeItem(STORAGE_KEY)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    const handleChange = () => setIsStandalone(isStandaloneDisplay())

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  const hideBanner = useCallback(() => {
    setIsDismissed(true)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "hidden")
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } catch (error) {
      console.error("No se pudo completar la instalación de la PWA", error)
    } finally {
      setDeferredPrompt(null)
      hideBanner()
    }
  }, [deferredPrompt, hideBanner])

  const shouldRender = useMemo(() => {
    if (!isReady) {
      return false
    }

    if (isStandalone) {
      return false
    }

    if (isDismissed) {
      return false
    }

    if (deferredPrompt) {
      return true
    }

    if (isIos) {
      return true
    }

    return false
  }, [deferredPrompt, isDismissed, isIos, isReady, isStandalone])

  if (!shouldRender) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="relative mx-auto max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl backdrop-blur">
        <button
          type="button"
          aria-label="Cerrar aviso de instalación"
          className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-100"
          onClick={hideBanner}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pr-6">
          <h2 className="text-base font-semibold text-slate-100">Instala Corp en tu dispositivo</h2>
          <p className="mt-1 text-sm text-slate-300">
            Accede rápidamente y utiliza la aplicación sin conexión desde tu pantalla de inicio.
          </p>
        </div>

        {deferredPrompt ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              Instalar ahora
            </button>
          </div>
        ) : null}

        {isIos ? (
          <div className="mt-4 rounded-xl bg-slate-800/80 p-3 text-sm text-slate-200">
            <p className="font-medium">En iOS:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
              <li>Abre el menú Compartir en Safari.</li>
              <li>Selecciona <span className="font-semibold">“Agregar a pantalla de inicio”.</span></li>
              <li>Confirma con <span className="font-semibold">Agregar</span>.</li>
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  )
}
