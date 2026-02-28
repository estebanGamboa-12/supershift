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

const CONFIG_STEP_DEFS: { selector: string; title: string; description: string }[] = [
  {
    selector: "[data-tour=\"config-profile\"]",
    title: "Perfil",
    description:
      "Nombre y zona horaria. El nombre es el que ve el equipo; la zona horaria sirve para calcular turnos y notificaciones. El ID de calendario es el que usas para sincronizar con Google Calendar.",
  },
  {
    selector: "[data-tour=\"config-avatar\"]",
    title: "Avatar y foto",
    description:
      "Sube una foto, usa una URL o quítala. «Ver historial de cambios» muestra el registro de cambios de perfil.",
  },
  {
    selector: "[data-tour=\"config-preferences\"]",
    title: "Preferencias",
    description:
      "Días festivos (España) en el calendario, inicio de semana (lunes o domingo) e icono de información ℹ️ en las pantallas. Todo se guarda al pulsar el botón de guardar.",
  },
  {
    selector: "[data-tour=\"config-integrations\"]",
    title: "Integraciones",
    description:
      "Sincronizar con Google Calendar y exportar informes mensuales. Aquí conectas tus herramientas externas.",
  },
  {
    selector: "[data-tour=\"config-logout\"]",
    title: "Cerrar sesión",
    description:
      "Cierra tu sesión en esta cuenta. Tendrás que volver a iniciar sesión para usar la app.",
  },
]

function buildConfigSteps(): DriveStep[] {
  return CONFIG_STEP_DEFS.map(({ selector, title, description }) => {
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
 * Lanza el tour de onboarding de la pantalla Configuración.
 * Debe ejecutarse con la pestaña Configuración ya visible.
 */
export function runConfigurationTour(): void {
  if (typeof window === "undefined") return
  const steps = buildConfigSteps()
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
