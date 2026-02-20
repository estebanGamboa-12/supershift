export type StartOfWeekPreference = "monday" | "sunday"

export type NotificationPreferences = {
  email: boolean
  push: boolean
  reminders: boolean
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
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  notifications: {
    email: true,
    push: true,
    reminders: false,
  },
  shiftExtras: [], // Sin extras por defecto; el usuario los crea en Extras
  customShiftTypes: [], // Sin tipos personalizados por defecto; el usuario los crea en Extras
  hourlyRate: 0,
}
