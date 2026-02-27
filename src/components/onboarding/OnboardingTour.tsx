"use client"

import { useEffect, useRef, useCallback } from "react"
import "driver.js/dist/driver.css"

/** Devuelve el primer elemento con data-tour que sea visible (no oculto por CSS). */
function getVisibleTourElement(selector: string): Element | null {
  if (typeof document === "undefined") return null
  const all = document.querySelectorAll(selector)
  for (let i = 0; i < all.length; i++) {
    const el = all[i]
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0") {
      return el
    }
  }
  return all.length > 0 ? all[0] : null
}

type OnboardingTourProps = {
  runInitially: boolean
  onComplete: () => void
  forceRun?: boolean
  userId: string | null
}

export default function OnboardingTour({
  runInitially,
  onComplete,
  forceRun = false,
  userId,
}: OnboardingTourProps) {
  const driverRef = useRef<{ destroy: () => void } | null>(null)
  const hasRunInitially = useRef(false)
  const forceRunConsumed = useRef(false)

  const startTour = useCallback(async () => {
    if (typeof document === "undefined") return

    try {
      const { driver } = await import("driver.js")

      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }

      const steps = [
        {
          element: () => getVisibleTourElement("[data-tour=\"calendar\"]") ?? document.body,
          popover: {
            title: "Pantalla Calendario",
            description: "Aquí ves tu agenda. Todo gira alrededor de esta pantalla: ver días, cambiar a vista mes y arrastrar turnos.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: () =>
            getVisibleTourElement("[data-tour=\"view-month\"]") ??
            getVisibleTourElement("[data-tour=\"view-day\"]") ??
            getVisibleTourElement("[data-tour=\"calendar\"]") ??
            document.body,
          popover: {
            title: "Día y Mes",
            description: "Día = un día con horarios. Mes = todo el mes. Pulsa «Mes» y podrás arrastrar los turnos de un día a otro. Pruébalo.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: () => getVisibleTourElement("[data-tour=\"mini-calendar\"]") ?? getVisibleTourElement("[data-tour=\"calendar\"]") ?? document.body,
          popover: {
            title: "Minicalendario",
            description: "Haz clic en un día para ir a esa fecha.",
            side: "right" as const,
            align: "start" as const,
          },
        },
        {
          element: () => getVisibleTourElement("[data-tour=\"stats\"]") ?? document.body,
          popover: {
            title: "Próximos turnos",
            description: "Resumen rápido de los próximos turnos.",
            side: "right" as const,
            align: "start" as const,
          },
        },
        {
          element: () =>
            document.querySelector("[data-tour=\"create-shift\"]") ??
            getVisibleTourElement("[data-tour=\"calendar\"]") ??
            document.body,
          popover: {
            title: "Añadir turno",
            description: "Pulsa «+ Añadir Turno» para crear un turno. En vista Mes también tienes «Crear Turno» en el lateral.",
            side: "bottom" as const,
            align: "center" as const,
            doneBtnText: "Entendido",
          },
        },
      ]

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0,0,0,0.85)",
        overlayOpacity: 0.85,
        smoothScroll: true,
        allowClose: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
        steps,
        onDestroyStarted: () => {
          driverRef.current = null
          onComplete()
        },
      })

      driverRef.current = driverObj
      requestAnimationFrame(() => {
        driverObj.drive()
      })
    } catch (err) {
      console.error("[OnboardingTour] Error al iniciar driver.js:", err)
      onComplete()
    }
  }, [onComplete])

  useEffect(() => {
    if (!userId) return

    if (forceRun && !forceRunConsumed.current) {
      forceRunConsumed.current = true
      const t = setTimeout(() => void startTour(), 1200)
      return () => clearTimeout(t)
    }

    if (!forceRun) {
      forceRunConsumed.current = false
    }

    if (runInitially && !hasRunInitially.current) {
      hasRunInitially.current = true
      const t = setTimeout(() => void startTour(), 1000)
      return () => clearTimeout(t)
    }
  }, [userId, runInitially, forceRun, startTour])

  return null
}
