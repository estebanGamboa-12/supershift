export type ThemePreference = "system" | "light" | "dark"
export type StartOfWeekPreference = "monday" | "sunday"

export type NotificationPreferences = {
  email: boolean
  push: boolean
  reminders: boolean
}

export type UserPreferences = {
  startOfWeek: StartOfWeekPreference
  theme: ThemePreference
  notifications: NotificationPreferences
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  theme: "system",
  notifications: {
    email: true,
    push: true,
    reminders: false,
  },
}
