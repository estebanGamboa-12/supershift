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

const TEMPLATES_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"templates-tab-shifts\"]",
    title: "Plantillas de turnos",
    description:
      "Son los horarios base: mañana, tarde, noche, descanso… Cada plantilla tiene nombre, hora de entrada/salida y tipo. Las usas en el calendario para rellenar días concretos o dentro de una rotación.",
  },
  {
    selector: "[data-tour=\"templates-tab-rotations\"]",
    title: "Rotaciones",
    description:
      "Son otra cosa: secuencias de varios días (ej. 5 trabajo + 2 descanso). Aquí defines el patrón; luego en el calendario lo aplicas al mes y se generan los turnos solos.",
  },
  {
    selector: "[data-tour=\"templates-presets\"]",
    title: "Crear con un clic",
    description:
      "Crea plantillas base al momento: Trabajo, Nocturno, Descanso, Vacaciones o Personalizado. Si ya existe una con ese nombre, el botón se desactiva.",
  },
  {
    selector: "[data-tour=\"templates-new-shift\"]",
    title: "+ Nueva",
    description:
      "Abre el formulario para crear una plantilla personalizada: nombre, horario, tipo, ubicación, alertas… Luego la reutilizas en el calendario y en rotaciones.",
  },
  {
    selector: "[data-tour=\"templates-cards\"]",
    title: "Tus plantillas",
    description:
      "Aquí aparecen las plantillas guardadas. Desde cada tarjeta puedes editar o eliminar. En la pestaña Rotaciones verás las rotaciones que definas.",
  },
]

function buildTemplatesSteps(): DriveStep[] {
  return TEMPLATES_STEP_DEFS.map(({ selector, title, description }) => {
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
 * Lanza el tour de onboarding de la pantalla Plantillas.
 * Asegúrate de estar en la pestaña "Plantillas de turnos" antes de llamar
 * para que se vean todos los elementos (presets, + Nueva, tarjetas).
 */
export function runTemplatesTour(): void {
  if (typeof window === "undefined") return
  const steps = buildTemplatesSteps()
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
    stagePadding: 12,
    stageRadius: 12,
    popoverClass: "driver-popover-custom",
  }
  const instance = driver(config)
  instance.drive()
}
