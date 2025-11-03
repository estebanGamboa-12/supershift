export type StartOfWeekPreference = "monday" | "sunday"

export type NotificationPreferences = {
  email: boolean
  push: boolean
  reminders: boolean
}

export type UserPreferences = {
  startOfWeek: StartOfWeekPreference
  notifications: NotificationPreferences
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  notifications: {
    email: true,
    push: true,
    reminders: false,
  },
}
