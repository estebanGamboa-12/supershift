export type StartOfWeekPreference = "monday" | "sunday"

export type NotificationPreferences = {
  email: boolean
  push: boolean
  reminders: boolean
  /** Minutos antes del turno para enviar el recordatorio (15, 30, 60). */
  reminderMinutesBefore?: number
}

export type ShiftExtra = {
  id: string
  name: string
  value: number // Valor monetario en euros
  color?: string
}

export type CustomShiftType = {
  id: string // ID único del tipo personalizado
  name: string // Nombre del tipo (ej: "Mañana", "Tarde", "Guardia")
  color: string // Color hexadecimal
  icon?: string // Emoji o icono opcional
  defaultStartTime?: string | null // HH:mm
  defaultEndTime?: string | null // HH:mm
}

export type UserPreferences = {
  startOfWeek: StartOfWeekPreference
  notifications: NotificationPreferences
  shiftExtras?: ShiftExtra[] // Extras personalizados del usuario
  customShiftTypes?: CustomShiftType[] // Tipos de turnos personalizados del usuario
  hourlyRate?: number // Tarifa por hora base
  /** Mostrar días festivos en calendario (mes y día) */
  showFestiveDays?: boolean
  /** Color para resaltar días festivos (hex) */
  festiveDayColor?: string
  /** Mostrar colores por tipo de día en el calendario */
  showDayColors?: boolean
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  notifications: {
    email: true,
    push: true,
    reminders: false,
    reminderMinutesBefore: 30,
  },
  shiftExtras: [],
  customShiftTypes: [],
  hourlyRate: 0,
  showFestiveDays: true,
  festiveDayColor: "#dc2626",
  showDayColors: true,
}
