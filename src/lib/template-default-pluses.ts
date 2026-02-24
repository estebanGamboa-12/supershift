import type { ShiftPluses } from "@/types/shifts"

const KEY_PREFIX = "supershift_template_pluses_"

export function getTemplateDefaultPluses(templateId: number): ShiftPluses | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + templateId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShiftPluses
    return {
      night: Number(parsed.night) || 0,
      holiday: Number(parsed.holiday) || 0,
      availability: Number(parsed.availability) || 0,
      other: Number(parsed.other) || 0,
    }
  } catch {
    return null
  }
}

export function setTemplateDefaultPluses(templateId: number, pluses: ShiftPluses | undefined): void {
  if (typeof window === "undefined") return
  try {
    if (!pluses || !Object.values(pluses).some((v) => v > 0)) {
      localStorage.removeItem(KEY_PREFIX + templateId)
      return
    }
    localStorage.setItem(KEY_PREFIX + templateId, JSON.stringify(pluses))
  } catch {
    // ignore
  }
}
