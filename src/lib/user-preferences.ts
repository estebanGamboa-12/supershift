import { DEFAULT_USER_PREFERENCES, type ThemePreference, type UserPreferences } from "@/types/preferences"

const STORAGE_KEY = "supershift::user-preferences"
const STORAGE_VERSION = 1

export type StoredUserPreferencesRecord = {
  version: number
  updatedAt: string
  preferences: UserPreferences
}

type LoadedPreferences = {
  preferences: UserPreferences
  savedAt: Date
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function normalizeTheme(theme: unknown): ThemePreference {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme
  }
  return DEFAULT_USER_PREFERENCES.theme
}

function normalizeStartOfWeek(value: unknown): UserPreferences["startOfWeek"] {
  if (value === "monday" || value === "sunday") {
    return value
  }
  return DEFAULT_USER_PREFERENCES.startOfWeek
}

function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_USER_PREFERENCES
  }

  const candidate = raw as Partial<UserPreferences>
  const notifications = candidate.notifications ?? DEFAULT_USER_PREFERENCES.notifications

  return {
    startOfWeek: normalizeStartOfWeek(candidate.startOfWeek),
    theme: normalizeTheme(candidate.theme),
    notifications: {
      email: normalizeBoolean(notifications.email, DEFAULT_USER_PREFERENCES.notifications.email),
      push: normalizeBoolean(notifications.push, DEFAULT_USER_PREFERENCES.notifications.push),
      reminders: normalizeBoolean(
        notifications.reminders,
        DEFAULT_USER_PREFERENCES.notifications.reminders,
      ),
    },
  }
}

function parseStoredRecord(raw: string | null): LoadedPreferences | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredUserPreferencesRecord | null
    if (!parsed || typeof parsed !== "object") {
      return null
    }

    if (parsed.version !== STORAGE_VERSION) {
      return null
    }

    const preferences = normalizePreferences(parsed.preferences)
    const savedAt = new Date(parsed.updatedAt ?? Date.now())

    if (Number.isNaN(savedAt.getTime())) {
      return {
        preferences,
        savedAt: new Date(),
      }
    }

    return { preferences, savedAt }
  } catch (error) {
    console.error("No se pudieron parsear las preferencias del usuario", error)
    return null
  }
}

export function loadUserPreferences(): LoadedPreferences | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  return parseStoredRecord(raw)
}

export function saveUserPreferences(preferences: UserPreferences): { savedAt: Date } {
  const normalized = normalizePreferences(preferences)
  const savedAt = new Date()

  if (typeof window !== "undefined") {
    try {
      const record: StoredUserPreferencesRecord = {
        version: STORAGE_VERSION,
        updatedAt: savedAt.toISOString(),
        preferences: normalized,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
      window.dispatchEvent(
        new CustomEvent("supershift:user-preferences-saved", {
          detail: { preferences: normalized, savedAt: record.updatedAt },
        }),
      )
    } catch (error) {
      console.error("No se pudieron guardar las preferencias del usuario", error)
    }
  }

  return { savedAt }
}

export function clearUserPreferencesStorage() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent("supershift:user-preferences-cleared"))
  } catch (error) {
    console.error("No se pudieron limpiar las preferencias del usuario", error)
  }
}

export function applyThemePreference(theme: ThemePreference): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const root = document.documentElement

  const setTheme = (value: "light" | "dark") => {
    root.dataset.theme = value
    root.classList.toggle("dark", value === "dark")
  }

  if (theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light")
    }

    setTheme(mediaQuery.matches ? "dark" : "light")
    mediaQuery.addEventListener("change", listener)
    return () => {
      mediaQuery.removeEventListener("change", listener)
    }
  }

  setTheme(theme === "dark" ? "dark" : "light")
  return () => {}
}

export function onUserPreferencesStorageChange(
  callback: (payload: LoadedPreferences | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return
    }

    callback(parseStoredRecord(event.newValue))
  }

  window.addEventListener("storage", storageListener)
  return () => {
    window.removeEventListener("storage", storageListener)
  }
}
