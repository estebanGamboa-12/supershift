import type { ShiftPluses } from "@/types/shifts"
import type { DefaultExtrasMap } from "@/types/templates"
import type { ShiftExtra } from "@/types/preferences"

const KEY_PREFIX = "supershift_template_pluses_"

const SLOT_KEYS: (keyof ShiftPluses)[] = ["night", "holiday", "availability", "other"]

/** Convierte defaultExtras a ShiftPluses. Si las claves son "0","1","2","3" (índices), se usa eso. Si no, se busca por id de extra en shiftExtras (por id, sin distinguir mayúsculas). */
export function defaultExtrasToPluses(
  defaultExtras: DefaultExtrasMap | null | undefined,
  shiftExtras: ShiftExtra[]
): ShiftPluses {
  const out: ShiftPluses = { night: 0, holiday: 0, availability: 0, other: 0 }
  if (!defaultExtras || typeof defaultExtras !== "object") return out
  const keys = Object.keys(defaultExtras)
  const byIndex = keys.length > 0 && keys.every((k) => /^[0-3]$/.test(String(k)))
  if (byIndex) {
    out.night = Number(defaultExtras["0"]) > 0 ? 1 : 0
    out.holiday = Number(defaultExtras["1"]) > 0 ? 1 : 0
    out.availability = Number(defaultExtras["2"]) > 0 ? 1 : 0
    out.other = Number(defaultExtras["3"]) > 0 ? 1 : 0
    return out
  }
  // Por id: para cada slot, buscar si el extra del usuario está en defaultExtras (comparar por id sin distinguir mayúsculas)
  for (let i = 0; i < Math.min(4, shiftExtras.length); i++) {
    const key = SLOT_KEYS[i]
    const extra = shiftExtras[i]
    if (!key || !extra?.id) continue
    const id = String(extra.id).trim()
    let val =
      defaultExtras[id] ??
      defaultExtras[extra.id] ??
      defaultExtras[id.toLowerCase()] ??
      defaultExtras[id.toUpperCase()]
    if (val === undefined) {
      const matchingKey = Object.keys(defaultExtras).find(
        (k) => String(k).trim() === id || String(k).trim().toLowerCase() === id.toLowerCase()
      )
      if (matchingKey != null) val = defaultExtras[matchingKey]
    }
    out[key] = Number(val) > 0 ? 1 : 0
  }
  // Si no hubo ningún match pero la plantilla tiene extras guardados, asignar por posición (mismo nº de extras)
  const hasAny = Object.values(out).some((v) => v > 0)
  const defaultIds = Object.keys(defaultExtras).filter((k) => Number(defaultExtras[k]) > 0)
  if (!hasAny && defaultIds.length > 0 && shiftExtras.length >= defaultIds.length) {
    for (let i = 0; i < Math.min(4, defaultIds.length); i++) {
      out[SLOT_KEYS[i]] = 1
    }
  }
  return out
}

/** Infiere pluses por convención según el nombre de la plantilla (Nocturno → nocturnidad, etc.) */
export function inferPlusesFromTemplateTitle(title: string): Partial<ShiftPluses> {
  const t = (title ?? "").trim().toLowerCase()
  const out: Partial<ShiftPluses> = {}
  if (/\bnocturn|noche\b/.test(t)) out.night = 1
  if (/\bfestiv|fiesta\b/.test(t)) out.holiday = 1
  if (/\bdisponib\b/.test(t)) out.availability = 1
  if (/\botro|other|plus\b/.test(t)) out.other = 1
  return out
}

export function getTemplateDefaultPluses(templateId: number): ShiftPluses | null {
  if (typeof window === "undefined") return null
  const id = Number(templateId)
  if (!Number.isFinite(id) || id <= 0) return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + String(id))
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
      localStorage.removeItem(KEY_PREFIX + String(templateId))
      return
    }
    localStorage.setItem(KEY_PREFIX + String(templateId), JSON.stringify(pluses))
  } catch {
    // ignore
  }
}
