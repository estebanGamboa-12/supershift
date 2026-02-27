"use client"

import { useEffect, useRef, useCallback } from "react"
import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

const TOUR_STEPS: DriveStep[] = [
  {
    element: "[data-tour=\"calendar\"]",
    popover: {
      title: "Calendario",
      description: "Aquí ves tu agenda. Cambia entre vista Día (un día con horarios) y vista Mes (todo el mes para arrastrar turnos y aplicar plantillas).",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: () =>
      document.querySelector("[data-tour=\"create-shift\"]") ??
      document.querySelector("[data-tour=\"calendar\"]") ??
      document.body,
    popover: {
      title: "Crear turno",
      description: "Pulsa «+ Añadir Turno» (arriba) o en vista Mes el botón «Crear Turno» del lateral para añadir un turno. También puedes usar plantillas desde la pestaña Plantillas.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour=\"stats\"]",
    popover: {
      title: "Próximos turnos",
      description: "Resumen de los próximos turnos y tu próximo turno. Útil para tener el contexto rápido.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour=\"settings\"]",
    popover: {
      title: "Configuración",
      description: "Desde aquí cambias preferencias (inicio de semana, festivos), exportas el informe mensual en PDF/HTML y gestionas tu perfil.",
      side: "top",
      align: "center",
      doneBtnText: "Entendido",
    },
  },
]

type OnboardingTourProps = {
  /** Si true, inicia el tour automáticamente al montar (solo cuando el usuario no lo ha completado). */
  runInitially: boolean
  /** Llamado cuando el tour termina (completado o saltado). Debe persistir onboarding_completed si corresponde. */
  onComplete: () => void
  /** Si true, fuerza a mostrar el tour una vez (p. ej. "Ver tutorial"). No cambia runInitially. */
  forceRun?: boolean
  /** userId para no hacer nada si no hay usuario. */
  userId: string | null
}

export default function OnboardingTour({
  runInitially,
  onComplete,
  forceRun = false,
  userId,
}: OnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null)
  const hasRunInitially = useRef(false)
  const forceRunConsumed = useRef(false)

  const startTour = useCallback(() => {
    if (typeof document === "undefined") return
    const el = document.querySelector("[data-tour=\"calendar\"]")
    if (!el) return

    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.75)",
      overlayOpacity: 0.75,
      smoothScroll: true,
      allowClose: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        driverRef.current = null
        onComplete()
      },
    })

    driverRef.current = driverObj
    driverObj.drive()
  }, [onComplete])

  useEffect(() => {
    if (!userId) return

    if (forceRun && !forceRunConsumed.current) {
      forceRunConsumed.current = true
      const t = setTimeout(startTour, 400)
      return () => clearTimeout(t)
    }

    if (!forceRun) {
      forceRunConsumed.current = false
    }

    if (runInitially && !hasRunInitially.current) {
      hasRunInitially.current = true
      const t = setTimeout(startTour, 600)
      return () => clearTimeout(t)
    }
  }, [userId, runInitially, forceRun, startTour])

  return null
}
