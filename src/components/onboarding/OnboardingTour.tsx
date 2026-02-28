"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep, type Config } from "driver.js"
import "driver.js/dist/driver.css"

declare global {
  interface Window {
    __startOnboardingTourDebug?: () => void
  }
}

function ensureSidebarOpenForTour(): void {
  if (typeof document === "undefined") return
  const openButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Abrir menú lateral"]',
  )
  if (openButton) {
    openButton.click()
  }
}

function getVisibleTourElement(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  const els = document.querySelectorAll<HTMLElement>(selector)
  for (const el of els) {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    ) {
      return el
    }
  }
  return null
}

/** Pasos solo para móvil: tres puntos, calendario, añadir turno. Sin minicalendario ni “próximos”. */
const MOBILE_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"sidebar-toggle\"]",
    title: "Panel lateral",
    description: "Aquí abres el panel con el calendario y el próximo turno. Toca para verlo.",
  },
  {
    selector: "[data-tour=\"calendar\"]",
    title: "Calendario",
    description: "Tu agenda: vista día o mes. Aquí ves y gestionas los turnos.",
  },
  {
    selector: "[data-tour=\"create-shift\"]",
    title: "Añadir turno",
    description: "Pulsa para crear un nuevo turno en el día actual.",
  },
]

/** Pasos para desktop (sin minicalendario ni “próximos” por no complicar). */
const DESKTOP_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"calendar\"]",
    title: "Pantalla Calendario",
    description: "Aquí ves tu agenda: turnos por día o por mes.",
  },
  {
    selector: "[data-tour=\"view-day\"]",
    title: "Vista Día",
    description: "Un día con horarios. Ideal para ver y editar los turnos de hoy.",
  },
  {
    selector: "[data-tour=\"view-month\"]",
    title: "Vista Mes",
    description: "Todo el mes. Para mover turnos y planificar.",
  },
  {
    selector: "[data-tour=\"create-shift\"]",
    title: "Añadir turno",
    description: "Pulsa «+ Añadir turno» para crear un nuevo turno.",
  },
]

function buildSteps(isMobile: boolean): DriveStep[] {
  const steps = isMobile ? MOBILE_STEP_DEFS : DESKTOP_STEP_DEFS
  return steps.map(({ selector, title, description }) => {
    const el = getVisibleTourElement(selector)
    return {
      element: (el ?? document.body) as Element,
      popover: {
        title,
        description,
        side: isMobile ? "bottom" : "bottom",
        align: "center",
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
      },
    }
  })
}

function runTour(
  onComplete: (userId: string | null) => void,
  userId: string | null,
): void {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024
  const startDriver = () => {
    const steps = buildSteps(isMobile)
    const config: Config = {
      steps,
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      allowClose: true,
      overlayColor: "rgba(0,0,0,0.85)",
      overlayOpacity: 0.95,
      stagePadding: isMobile ? 16 : 8,
      stageRadius: 12,
      popoverClass: "driver-popover-custom",
      onDestroyed: () => onComplete(userId),
    }
    const instance = driver(config)
    instance.drive()
  }

  if (isMobile) {
    ensureSidebarOpenForTour()
    setTimeout(startDriver, 900)
  } else {
    startDriver()
  }
}

type OnboardingTourProps = {
  runInitially: boolean
  onComplete: (userId: string | null) => void
  forceRun?: boolean
  userId: string | null
}

export default function OnboardingTour({
  runInitially,
  onComplete,
  forceRun = false,
  userId,
}: OnboardingTourProps) {
  const hasRunInitially = useRef(false)
  const forceRunConsumed = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (typeof window === "undefined") return
    window.__startOnboardingTourDebug = () => {
      runTour((uid) => onCompleteRef.current(uid), userId)
    }
    return () => {
      delete window.__startOnboardingTourDebug
    }
  }, [userId])

  useEffect(() => {
    const shouldRun = forceRun
      ? !forceRunConsumed.current && (forceRunConsumed.current = true)
      : runInitially && !hasRunInitially.current

    if (!shouldRun) {
      if (!forceRun) forceRunConsumed.current = false
      return
    }

    if (runInitially) hasRunInitially.current = true

    const delayMs = forceRun ? 1800 : 1500

    const t = setTimeout(() => {
      runTour(
        (uid) => onCompleteRef.current(uid),
        userId,
      )
    }, delayMs)

    return () => clearTimeout(t)
  }, [userId, runInitially, forceRun])

  return null
}

/** Lanzar el tour manualmente (ej. desde el botón "Ver tutorial" en Configuración). */
export function startOnboardingTour(userId: string | null, onComplete?: (userId: string | null) => void): void {
  if (typeof window === "undefined") return
  runTour((uid) => onComplete?.(uid) ?? (() => {}), userId)
}
