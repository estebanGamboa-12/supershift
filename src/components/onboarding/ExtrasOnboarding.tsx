"use client"

import { driver, type DriveStep, type Config } from "driver.js"
import "driver.js/dist/driver.css"

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

const EXTRAS_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"extras-payment\"]",
    title: "¿Cómo te pagan?",
    description:
      "Aquí configuras si cobras por tarifa por horas (€/h) o por sueldo base mensual. El valor resultante se usa para calcular lo que ganas por turno cuando asignas extras.",
  },
  {
    selector: "[data-tour=\"extras-payment-type\"]",
    title: "Tipo de remuneración",
    description:
      "«Tarifa por horas»: introduces directamente tu €/h. «Sueldo base (mensual)»: indicas el sueldo al mes y las horas semanales; la app calcula el equivalente en €/h (sueldo ÷ horas × 52 semanas ÷ 12 meses).",
  },
  {
    selector: "[data-tour=\"extras-payment-fields\"]",
    title: "Importe base",
    description:
      "Según lo elegido verás la tarifa por hora o el sueldo base + horas semanales. El «Equivalente» en €/h es lo que se usa como base por turno; los extras se suman a eso.",
  },
  {
    selector: "[data-tour=\"extras-create-btn\"]",
    title: "Crear extra",
    description:
      "Los extras son conceptos que sumas al valor de un turno: nocturnidad, festivo, disponibilidad, etc. Pulsa aquí para crear uno (nombre, importe en € y color). Luego los asignas al editar cada turno en el calendario.",
  },
  {
    selector: "[data-tour=\"extras-list\"]",
    title: "Tus extras",
    description:
      "Lista de extras guardados. Desde cada tarjeta puedes editar o eliminar. Cuando edites un turno en el calendario podrás marcar qué extras aplican a ese turno y se sumarán al cálculo.",
  },
]

function buildExtrasSteps(): DriveStep[] {
  return EXTRAS_STEP_DEFS.map(({ selector, title, description }) => {
    const el = getVisibleTourElement(selector)
    return {
      element: (el ?? document.body) as Element,
      popover: {
        title,
        description,
        side: "bottom" as const,
        align: "center" as const,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
      },
    }
  })
}

/**
 * Lanza el tour de onboarding de la pantalla Extras (cómo te pagan + extras).
 */
export function runExtrasTour(): void {
  if (typeof window === "undefined") return
  const steps = buildExtrasSteps()
  const config: Config = {
    steps,
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Entendido",
    allowClose: true,
    disableActiveInteraction: false,
    overlayColor: "rgba(0,0,0,0.85)",
    overlayOpacity: 0.95,
    stagePadding: 12,
    stageRadius: 12,
    popoverClass: "driver-popover-custom",
  }
  const instance = driver(config)
  instance.drive()
}
