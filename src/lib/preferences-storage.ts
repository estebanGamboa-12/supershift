import type {
  PreferencesSnapshot,
  QuestionnaireState,
} from "@/components/CustomCycleBuilder"

export type StoredPreferencesRecord = {
  completedAt: string
  snapshot: PreferencesSnapshot
  questionnaire: QuestionnaireState
  userId?: string
}

const STORAGE_KEY = "supershift::onboarding-preferences"

function getStorageKeys(userId?: string): string[] {
  if (userId && userId.trim().length > 0) {
    return [`${STORAGE_KEY}::${userId}`, STORAGE_KEY]
  }

  return [STORAGE_KEY]
}

function normaliseRecord(
  value: unknown,
  fallbackUserId?: string,
): StoredPreferencesRecord | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Partial<StoredPreferencesRecord>

  if (typeof record.completedAt !== "string") {
    return null
  }

  if (!record.snapshot || typeof record.snapshot !== "object") {
    return null
  }

  if (!record.questionnaire || typeof record.questionnaire !== "object") {
    return null
  }

  return {
    completedAt: record.completedAt,
    snapshot: record.snapshot as PreferencesSnapshot,
    questionnaire: record.questionnaire as QuestionnaireState,
    userId:
      typeof record.userId === "string" && record.userId.trim().length > 0
        ? record.userId
        : fallbackUserId,
  }
}

export function loadStoredPreferences(
  userId?: string,
): StoredPreferencesRecord | null {
  if (typeof window === "undefined") {
    return null
  }

  const keys = getStorageKeys(userId)

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) {
        continue
      }

      const parsed = JSON.parse(raw)
      const record = normaliseRecord(parsed, userId)
      if (record) {
        return record
      }
    } catch (error) {
      console.error("No se pudieron leer las preferencias almacenadas", error)
      return null
    }
  }

  return null
}

export function saveStoredPreferences(
  record: StoredPreferencesRecord,
  userId?: string,
) {
  if (typeof window === "undefined") {
    return
  }

  const key = userId && userId.trim().length > 0
    ? `${STORAGE_KEY}::${userId}`
    : STORAGE_KEY

  const payload: StoredPreferencesRecord = {
    ...record,
    userId: userId && userId.trim().length > 0 ? userId : record.userId,
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch (error) {
    console.error("No se pudieron guardar las preferencias de onboarding", error)
  }
}

export function clearStoredPreferences(userId?: string) {
  if (typeof window === "undefined") {
    return
  }

  const keys = getStorageKeys(userId)

  try {
    for (const key of keys) {
      window.localStorage.removeItem(key)
    }
  } catch (error) {
    console.error("No se pudieron limpiar las preferencias almacenadas", error)
  }
}
