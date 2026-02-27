"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep, type Config } from "driver.js"
import "driver.js/dist/driver.css"

const LOG_PREFIX = "[OnboardingTour]"

declare global {
  interface Window {
    __startOnboardingTourDebug?: () => void
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
      style.display !== "none" &&
      style.opacity !== "0"
    ) {
      return el
    }
  }
  return null
}

const STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"calendar\"]",
    title: "Pantalla Calendario",
    description:
      "Aquí ves tu agenda. Todo gira alrededor de esta pantalla: ver días, cambiar a vista Mes y arrastrar turnos.",
  },
  {
    selector: "[data-tour=\"view-day\"], [data-tour=\"view-month\"]",
    title: "Día y Mes",
    description:
      "Día = un día con horarios. Mes = todo el mes. Pulsa «Mes» y podrás arrastrar los turnos de un día a otro. Pruébalo.",
  },
  {
    selector: "[data-tour=\"mini-calendar\"]",
    title: "Minicalendario",
    description: "Haz clic en un día para ir a esa fecha.",
  },
  {
    selector: "[data-tour=\"stats\"]",
    title: "Próximos turnos",
    description: "Resumen rápido de los próximos turnos.",
  },
  {
    selector: "[data-tour=\"create-shift\"]",
    title: "Añadir turno",
    description:
      "Pulsa «+ Añadir Turno» para crear un turno. En vista Mes también tienes «Crear Turno» en el lateral.",
  },
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
      // Log para ver qué elemento se está resolviendo en cada paso
      // (se verá tanto en local como en los logs de navegador en producción)
      console.log(LOG_PREFIX, "resolve element", { selector, resolved: !!el })
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
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Exponer un helper global para poder disparar el tour desde la consola:
  // window.__startOnboardingTourDebug()
  useEffect(() => {
    if (typeof window === "undefined") return

    window.__startOnboardingTourDebug = () => {
      console.log(LOG_PREFIX, "manual debug start")
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
      }
      console.log(LOG_PREFIX, "starting driver (manual debug)", {
        stepsCount: steps.length,
      })
      const instance = driver(config)
      instance.drive()
    }
  }, [])

  // Log básico cada vez que cambian las props clave
  useEffect(() => {
    console.log(LOG_PREFIX, "props", { runInitially, forceRun, userId })
  }, [runInitially, forceRun, userId])

  useEffect(() => {
    console.log(LOG_PREFIX, "effect start", {
      userId,
      runInitially,
      forceRun,
      hasRunInitially: hasRunInitially.current,
      forceRunConsumed: forceRunConsumed.current,
    })

    if (!userId) {
      console.log(LOG_PREFIX, "abort: no userId")
      return
    }

    const shouldRun = forceRun
      ? (() => {
          if (!forceRunConsumed.current) {
            forceRunConsumed.current = true
            return true
          }
          return false
        })()
      : runInitially && !hasRunInitially.current

    console.log(LOG_PREFIX, "shouldRun decision", {
      shouldRun,
      runInitially,
      forceRun,
      hasRunInitially: hasRunInitially.current,
      forceRunConsumed: forceRunConsumed.current,
    })

    if (!shouldRun) {
      if (!forceRun) forceRunConsumed.current = false
      return
    }

    if (runInitially) hasRunInitially.current = true

    // Truco del pequeño delay + reintentos:
    // esperamos un poco a que React pinte todo y, si aún no hay elementos,
    // reintentamos unas cuantas veces antes de rendirnos.
    const firstDelay = forceRun ? 1200 : 800
    const retryDelay = 350
    const maxRetries = 10

    console.log(LOG_PREFIX, "scheduling driver", {
      firstDelay,
      retryDelay,
      maxRetries,
    })

    let retries = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const startDriverIfReady = () => {
      retries += 1

      const steps = buildSteps()
      // Comprobamos si al menos un paso ha encontrado un elemento real
      const calendarElement = getVisibleTourElement("[data-tour=\"calendar\"]")

      console.log(LOG_PREFIX, "try start", {
        attempt: retries,
        hasCalendarElement: !!calendarElement,
      })

      if (!calendarElement && retries < maxRetries) {
        timeoutId = setTimeout(startDriverIfReady, retryDelay)
        return
      }

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
          console.log(LOG_PREFIX, "tour destroyed")
          driverRef.current = null
          onCompleteRef.current()
        },
      }

      console.log(LOG_PREFIX, "starting driver", {
        stepsCount: steps.length,
        attempts: retries,
        hasCalendarElement: !!calendarElement,
      })

      driverRef.current = driver(config)
      driverRef.current.drive()
    }

    timeoutId = setTimeout(startDriverIfReady, firstDelay)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (driverRef.current?.isActive()) {
        console.log(LOG_PREFIX, "cleanup: destroy active driver instance")
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [userId, runInitially, forceRun])

  return null
}
