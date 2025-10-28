import type { ApiShift } from "@/app/api/shifts/utils"

let reminderTimeoutId: number | null = null
let reminderShiftId: number | null = null

export type ReminderResult = {
  ok: boolean
  message: string
}

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Los recordatorios solo pueden gestionarse en el navegador")
  }
}

function parseShiftDate(shift: ApiShift): Date {
  const baseDate = new Date(`${shift.date}T00:00:00`)
  if (shift.startTime) {
    const [hours, minutes] = shift.startTime.split(":").map((chunk) => Number.parseInt(chunk, 10))
    baseDate.setHours(hours)
    baseDate.setMinutes(minutes)
  } else {
    baseDate.setHours(8)
    baseDate.setMinutes(0)
  }
  baseDate.setSeconds(0)
  baseDate.setMilliseconds(0)
  return baseDate
}

async function fetchUpcomingShifts(userId: string | number | null): Promise<ApiShift[]> {
  const params = new URLSearchParams()
  if (userId) {
    params.set("userId", String(userId))
  }
  params.set("limit", "100")

  const response = await fetch(`/api/shifts?${params.toString()}`, {
    headers: { Accept: "application/json" },
  })

  if (!response.ok) {
    throw new Error("No se pudieron recuperar los turnos para programar recordatorios")
  }

  const payload = (await response.json()) as { shifts?: ApiShift[] }
  return Array.isArray(payload.shifts) ? payload.shifts : []
}

function clearReminder() {
  if (reminderTimeoutId !== null) {
    window.clearTimeout(reminderTimeoutId)
    reminderTimeoutId = null
    reminderShiftId = null
  }
}

function scheduleNotification(shift: ApiShift, triggerAt: number) {
  const delay = Math.max(0, triggerAt - Date.now())
  clearReminder()

  const title = shift.label ?? `Turno ${shift.type}`
  const body = shift.startTime
    ? `Tu turno empieza a las ${shift.startTime}.`
    : "Tu turno de jornada completa empieza pronto."

  reminderShiftId = shift.id
  reminderTimeoutId = window.setTimeout(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          tag: `supershift-reminder-${shift.id}`,
          data: { shiftId: shift.id },
        })
      } catch (error) {
        console.warn("No se pudo mostrar la notificación programada", error)
      }
    } else {
      window.alert(`${title}\n\n${body}`)
    }
    reminderTimeoutId = null
    reminderShiftId = null
  }, delay)
}

export async function enableShiftReminders({
  userId,
  advanceMinutes = 30,
}: {
  userId?: string | number | null
  advanceMinutes?: number
} = {}): Promise<ReminderResult> {
  try {
    ensureBrowser()

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch((error) => {
        console.warn("No se pudo solicitar permiso para recordatorios", error)
      })
    }

    const shifts = await fetchUpcomingShifts(userId ?? null)
    if (!shifts.length) {
      clearReminder()
      return {
        ok: false,
        message: "No hay turnos próximos para programar recordatorios.",
      }
    }

    const now = Date.now()
    const upcoming = shifts
      .map((shift) => ({ shift, date: parseShiftDate(shift) }))
      .filter(({ date }) => date.getTime() > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (!upcoming.length) {
      clearReminder()
      return {
        ok: false,
        message: "No se encontraron turnos futuros para recordar.",
      }
    }

    const nextShift = upcoming[0]
    const trigger = nextShift.date.getTime() - advanceMinutes * 60 * 1000
    scheduleNotification(nextShift.shift, trigger)

    const formattedDate = nextShift.date.toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    })

    return {
      ok: true,
      message: `Te avisaremos ${advanceMinutes} minutos antes del turno del ${formattedDate}.`,
    }
  } catch (error) {
    console.error("Error enabling shift reminders", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron activar los recordatorios de turnos.",
    }
  }
}

export function disableShiftReminders(): ReminderResult {
  try {
    ensureBrowser()
    clearReminder()
    return {
      ok: true,
      message: "Se detuvieron los recordatorios de turnos para este dispositivo.",
    }
  } catch (error) {
    console.error("Error disabling shift reminders", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron desactivar los recordatorios.",
    }
  }
}

export function getActiveReminderShiftId(): number | null {
  return reminderShiftId
}
