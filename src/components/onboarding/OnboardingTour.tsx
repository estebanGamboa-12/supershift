"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep, type Config } from "driver.js"
import "driver.js/dist/driver.css"

function getVisibleTourElement(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  const els = document.querySelectorAll<HTMLElement>(selector)
  for (const el of els) {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0") {
      return el
    }
  }
  return null
}

const STEP_DEFS: { selector: string; title: string; description: string }[] = [
  { selector: "[data-tour=\"calendar\"]", title: "Pantalla Calendario", description: "Aquí ves tu agenda. Todo gira alrededor de esta pantalla: ver días, cambiar a vista Mes y arrastrar turnos." },
  { selector: "[data-tour=\"view-day\"], [data-tour=\"view-month\"]", title: "Día y Mes", description: "Día = un día con horarios. Mes = todo el mes. Pulsa «Mes» y podrás arrastrar los turnos de un día a otro. Pruébalo." },
  { selector: "[data-tour=\"mini-calendar\"]", title: "Minicalendario", description: "Haz clic en un día para ir a esa fecha." },
  { selector: "[data-tour=\"stats\"]", title: "Próximos turnos", description: "Resumen rápido de los próximos turnos." },
  { selector: "[data-tour=\"create-shift\"]", title: "Añadir turno", description: "Pulsa «+ Añadir Turno» para crear un turno. En vista Mes también tienes «Crear Turno» en el lateral." },
]

function buildSteps(): DriveStep[] {
  return STEP_DEFS.map(({ selector, title, description }) => ({
    element: () => {
      const parts = selector.split(",").map((s) => s.trim())
      let el: HTMLElement | null = null
      for (const part of parts) {
        el = getVisibleTourElement(part)
        if (el) break
      }
      return (el ?? document.body) as Element
    },
    popover: {
      title,
      description,
      side: "bottom",
      align: "center",
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
    },
  }))
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
  const hasRunInitially = useRef(false)
  const forceRunConsumed = useRef(false)
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  useEffect(() => {
    if (!userId) return

    const shouldRun = forceRun ? (() => {
      if (!forceRunConsumed.current) {
        forceRunConsumed.current = true
        return true
      }
      return false
    })() : (runInitially && !hasRunInitially.current)

    if (!shouldRun) {
      if (!forceRun) forceRunConsumed.current = false
      return
    }

    if (runInitially) hasRunInitially.current = true

    const delay = forceRun ? 1200 : 800
    const t = setTimeout(() => {
      const steps = buildSteps()
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
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: "driver-popover-custom",
        onDestroyed: () => {
          driverRef.current = null
          onComplete()
        },
      }
      driverRef.current = driver(config)
      driverRef.current.drive()
    }, delay)

    return () => {
      clearTimeout(t)
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [userId, runInitially, forceRun, onComplete])

  return null
}
