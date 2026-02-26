import { DEFAULT_USER_PREFERENCES, type UserPreferences, type ShiftExtra } from "@/types/preferences"

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

type StorageSource = "session" | "local" | null

function safeGetItem(storage: Storage | null | undefined, key: string): string | null {
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(key)
  } catch (error) {
    console.warn("No se pudo acceder al almacenamiento para leer preferencias", error)
    return null
  }
}

function safeSetItem(storage: Storage | null | undefined, key: string, value: string): boolean {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    console.warn("No se pudo escribir en el almacenamiento de preferencias", error)
    return false
  }
}

function safeRemoveItem(storage: Storage | null | undefined, key: string) {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch (error) {
    console.warn("No se pudo eliminar del almacenamiento de preferencias", error)
  }
}

function getStoredPreferences(): { raw: string | null; source: StorageSource } {
  if (typeof window === "undefined") {
    return { raw: null, source: null }
  }

  const sessionRaw = safeGetItem(window.sessionStorage, STORAGE_KEY)
  if (sessionRaw) {
    return { raw: sessionRaw, source: "session" }
  }

  const localRaw = safeGetItem(window.localStorage, STORAGE_KEY)
  if (localRaw) {
    return { raw: localRaw, source: "local" }
  }

  return { raw: null, source: null }
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function normalizeStartOfWeek(value: unknown): UserPreferences["startOfWeek"] {
  if (value === "monday" || value === "sunday") {
    return value
  }
  return DEFAULT_USER_PREFERENCES.startOfWeek
}

const REMINDER_MINUTES_OPTIONS = [15, 30, 60] as const

function normalizeReminderMinutesBefore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : null
  if (n !== null && REMINDER_MINUTES_OPTIONS.includes(n as 15 | 30 | 60)) {
    return n
  }
  return DEFAULT_USER_PREFERENCES.notifications.reminderMinutesBefore ?? 30
}

function normalizeShiftExtra(x: unknown): ShiftExtra | null {
  if (!x || typeof x !== "object") return null
  const o = x as Record<string, unknown>
  if (typeof o.id !== "string" || typeof o.name !== "string") return null
  const value = Number(o.value)
  if (Number.isNaN(value)) return null
  return {
    id: o.id,
    name: o.name,
    value,
    color: typeof o.color === "string" ? o.color : undefined,
  }
}

function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_USER_PREFERENCES
  }

  const candidate = raw as Partial<UserPreferences>
  const notifications = candidate.notifications ?? DEFAULT_USER_PREFERENCES.notifications

  const shiftExtrasRaw = candidate.shiftExtras
  const shiftExtras = Array.isArray(shiftExtrasRaw)
    ? (shiftExtrasRaw.map(normalizeShiftExtra).filter((e): e is ShiftExtra => e != null) as UserPreferences["shiftExtras"])
    : (DEFAULT_USER_PREFERENCES.shiftExtras ?? [])

  const hourlyRate =
    typeof candidate.hourlyRate === "number" && !Number.isNaN(candidate.hourlyRate)
      ? candidate.hourlyRate
      : DEFAULT_USER_PREFERENCES.hourlyRate ?? 0

  const showFestiveDays =
    typeof candidate.showFestiveDays === "boolean"
      ? candidate.showFestiveDays
      : (DEFAULT_USER_PREFERENCES.showFestiveDays ?? true)
  const festiveDayColor =
    typeof candidate.festiveDayColor === "string" && candidate.festiveDayColor.trim().length > 0
      ? candidate.festiveDayColor.trim()
      : (DEFAULT_USER_PREFERENCES.festiveDayColor ?? "#dc2626")
  const showDayColors =
    typeof candidate.showDayColors === "boolean"
      ? candidate.showDayColors
      : (DEFAULT_USER_PREFERENCES.showDayColors ?? true)

  return {
    startOfWeek: normalizeStartOfWeek(candidate.startOfWeek),
    notifications: {
      email: normalizeBoolean(notifications.email, DEFAULT_USER_PREFERENCES.notifications.email),
      push: normalizeBoolean(notifications.push, DEFAULT_USER_PREFERENCES.notifications.push),
      reminders: normalizeBoolean(
        notifications.reminders,
        DEFAULT_USER_PREFERENCES.notifications.reminders,
      ),
      reminderMinutesBefore: normalizeReminderMinutesBefore(
        (notifications as { reminderMinutesBefore?: unknown }).reminderMinutesBefore,
      ),
    },
    shiftExtras,
    hourlyRate,
    showFestiveDays,
    festiveDayColor,
    showDayColors,
    customShiftTypes: candidate.customShiftTypes ?? DEFAULT_USER_PREFERENCES.customShiftTypes ?? [],
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

  const { raw, source } = getStoredPreferences()
  const parsed = parseStoredRecord(raw)

  if (parsed && source === "local" && raw) {
    safeSetItem(window.sessionStorage, STORAGE_KEY, raw)
  }

  return parsed
}

export function saveUserPreferences(preferences: UserPreferences): { savedAt: Date } {
  const normalized = normalizePreferences(preferences)
  const savedAt = new Date()

  if (typeof window !== "undefined") {
    const record: StoredUserPreferencesRecord = {
      version: STORAGE_VERSION,
      updatedAt: savedAt.toISOString(),
      preferences: normalized,
    }

    try {
      const serialized = JSON.stringify(record)
      const wroteToSession = safeSetItem(window.sessionStorage, STORAGE_KEY, serialized)
      const wroteToLocal = safeSetItem(window.localStorage, STORAGE_KEY, serialized)

      if (wroteToSession || wroteToLocal) {
        window.dispatchEvent(
          new CustomEvent("supershift:user-preferences-saved", {
            detail: { preferences: normalized, savedAt: record.updatedAt },
          }),
        )
      }
    } catch (error) {
      console.error("No se pudieron serializar las preferencias del usuario", error)
    }
  }

  return { savedAt }
}

export function clearUserPreferencesStorage() {
  if (typeof window === "undefined") {
    return
  }

  safeRemoveItem(window.sessionStorage, STORAGE_KEY)
  safeRemoveItem(window.localStorage, STORAGE_KEY)
  window.dispatchEvent(new CustomEvent("supershift:user-preferences-cleared"))
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
