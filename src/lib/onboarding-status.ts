const STORAGE_KEY = "supershift::onboarding-completed"

type StoragePayload = {
  version: 1
  userIds: string[]
}

function normaliseUserId(userId: string): string {
  const trimmed = userId.trim()
  if (!trimmed) {
    throw new Error("El identificador del usuario no es válido")
  }
  return trimmed
}

function readPayload(): StoragePayload {
  if (typeof window === "undefined") {
    return { version: 1, userIds: [] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { version: 1, userIds: [] }
    }

    const parsed = JSON.parse(raw) as Partial<StoragePayload>
    if (!parsed || typeof parsed !== "object") {
      return { version: 1, userIds: [] }
    }

    const userIds = Array.isArray(parsed.userIds)
      ? parsed.userIds
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value.length > 0)
      : []

    return {
      version: 1,
      userIds,
    }
  } catch (error) {
    console.error("No se pudo leer el estado de onboarding", error)
    return { version: 1, userIds: [] }
  }
}

function writePayload(payload: StoragePayload) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error("No se pudo guardar el estado de onboarding", error)
  }
}

export function hasCompletedOnboarding(userId: string): boolean {
  if (typeof window === "undefined") {
    return false
  }

  try {
    const normalized = normaliseUserId(userId)
    const payload = readPayload()
    return payload.userIds.includes(normalized)
  } catch (error) {
    console.error("No se pudo comprobar el estado de onboarding", error)
    return false
  }
}

export function markOnboardingCompleted(userId: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const normalized = normaliseUserId(userId)
    const payload = readPayload()
    if (payload.userIds.includes(normalized)) {
      return
    }

    payload.userIds.push(normalized)
    writePayload(payload)
  } catch (error) {
    console.error("No se pudo actualizar el estado de onboarding", error)
  }
}

export function resetOnboardingStatus(userId: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const normalized = normaliseUserId(userId)
    const payload = readPayload()
    const nextUserIds = payload.userIds.filter((value) => value !== normalized)
    if (nextUserIds.length === payload.userIds.length) {
      return
    }

    writePayload({ version: 1, userIds: nextUserIds })
  } catch (error) {
    console.error("No se pudo restablecer el estado de onboarding", error)
  }
}
