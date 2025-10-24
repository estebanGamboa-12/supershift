import type {
  PreferencesSnapshot,
  QuestionnaireState,
} from "@/components/CustomCycleBuilder"

export type StoredPreferencesRecord = {
  completedAt: string
  snapshot: PreferencesSnapshot
  questionnaire: QuestionnaireState
}

const STORAGE_KEY = "supershift::onboarding-preferences"

export function loadStoredPreferences(): StoredPreferencesRecord | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as StoredPreferencesRecord
    if (!parsed || typeof parsed !== "object") {
      return null
    }

    return parsed
  } catch (error) {
    console.error("No se pudieron leer las preferencias almacenadas", error)
    return null
  }
}

export function saveStoredPreferences(record: StoredPreferencesRecord) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch (error) {
    console.error("No se pudieron guardar las preferencias de onboarding", error)
  }
}

export function clearStoredPreferences() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("No se pudieron limpiar las preferencias almacenadas", error)
  }
}
