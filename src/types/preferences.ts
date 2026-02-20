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

export type UserPreferences = {
  startOfWeek: StartOfWeekPreference
  notifications: NotificationPreferences
  shiftExtras?: ShiftExtra[] // Extras personalizados del usuario
  hourlyRate?: number // Tarifa por hora base
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  notifications: {
    email: true,
    push: true,
    reminders: false,
  },
  shiftExtras: [
    { id: "night", name: "Extra nocturno", value: 10, color: "#a855f7" },
    { id: "holiday", name: "Domingo/Festivo", value: 20, color: "#f59e0b" },
    { id: "availability", name: "Disponibilidad", value: 5, color: "#10b981" },
    { id: "other", name: "Otro extra", value: 15, color: "#3b82f6" },
  ],
  hourlyRate: 0,
}
