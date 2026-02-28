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

const ROTATION_FORM_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"rotation-name\"]",
    title: "Nombre e icono",
    description:
      "El icono (caja a la izquierda) es un emoji de un carácter que identifica la rotación. El nombre es el texto que verás en la lista de rotaciones (ej. «Rotación principal», «Guardia 5+2»).",
  },
  {
    selector: "[data-tour=\"rotation-days\"]",
    title: "Número de días",
    description:
      "Cuántos días tiene el ciclo. Usa los botones − y + o escribe el número. Por ejemplo: 7 para una semana, 14 para quincena. El círculo de la izquierda tendrá un botón por cada día.",
  },
  {
    selector: "[data-tour=\"rotation-description\"]",
    title: "Descripción",
    description:
      "Texto opcional que resume el patrón (ej. «5 trabajo, 2 descanso»). Sirve para ti y para tu equipo cuando vean la rotación en el calendario.",
  },
  {
    selector: "[data-tour=\"rotation-circle\"]",
    title: "Círculo de días",
    description:
      "Cada número es un día del ciclo. Pulsa un día para seleccionarlo; abajo a la derecha podrás asignarle una plantilla de turno (Trabajo, Nocturno, Sin turno, etc.). El color del botón refleja la plantilla asignada.",
  },
  {
    selector: "[data-tour=\"rotation-day-selector\"]",
    title: "Asignar plantilla al día",
    description:
      "Aquí eliges qué turno corresponde al día seleccionado en el círculo: «Sin turno», o una de tus plantillas (Personalizado, Nocturno, Trabajo…). Puedes cambiar icono y color de cada plantilla desde esta lista. «Limpiar» deja el día sin turno.",
  },
  {
    selector: "[data-tour=\"rotation-submit\"]",
    title: "Crear rotación",
    description:
      "Al pulsar «Crear rotación» se guarda la rotación. Luego, desde el calendario (vista mes), podrás aplicarla a un mes para generar todos los turnos automáticamente.",
  },
]

function buildRotationFormSteps(): DriveStep[] {
  return ROTATION_FORM_STEP_DEFS.map(({ selector, title, description }) => {
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
 * Lanza el tour de onboarding del formulario de Nueva rotación / Editar rotación.
 * Debe llamarse con el modal ya abierto para que los elementos con data-tour estén en el DOM.
 */
export function runRotationFormTour(): void {
  if (typeof window === "undefined") return
  const steps = buildRotationFormSteps()
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
