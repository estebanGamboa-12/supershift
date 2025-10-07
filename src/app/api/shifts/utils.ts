import type { ShiftType } from "@/types/shifts"

export const VALID_SHIFT_TYPES: ReadonlySet<ShiftType> = new Set([
  "WORK",
  "REST",
  "NIGHT",
  "VACATION",
  "CUSTOM",
])

export type ShiftRow = {
  id: number
  date: string
  type: string
  note: string | null
  label: string | null
  color: string | null
  plusNight: number | null
  plusHoliday: number | null
  plusAvailability: number | null
  plusOther: number | null
  calendarId?: number
}

export type ApiShift = {
  id: number
  date: string
  type: ShiftType
  note?: string
  label?: string
  color?: string
  plusNight?: number
  plusHoliday?: number
  plusAvailability?: number
  plusOther?: number
}

export const SHIFT_SELECT_COLUMNS =
  "id, calendar_id, start_at, shift_type_code, note, label, color, plus_night, plus_holiday, plus_availability, plus_other"

export type DatabaseShiftRow = {
  id: number
  calendar_id: number | null
  start_at: string | null
  shift_type_code: string | null
  note: string | null
  label: string | null
  color: string | null
  plus_night: number | null
  plus_holiday: number | null
  plus_availability: number | null
  plus_other: number | null
}

function normalizeDateFromStart(startAt: string | null): string {
  if (!startAt) {
    throw new Error("El turno no tiene una fecha de inicio válida")
  }

  const trimmed = startAt.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const candidate = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) {
    const fallback = trimmed.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(fallback)) {
      return fallback
    }
    throw new Error("No se pudo normalizar la fecha del turno")
  }

  return parsed.toISOString().slice(0, 10)
}

export function adaptDatabaseShiftRow(row: DatabaseShiftRow): ShiftRow {
  return {
    id: row.id,
    date: normalizeDateFromStart(row.start_at),
    type: row.shift_type_code ?? "CUSTOM",
    note: row.note,
    label: row.label,
    color: row.color,
    plusNight: row.plus_night,
    plusHoliday: row.plus_holiday,
    plusAvailability: row.plus_availability,
    plusOther: row.plus_other,
    ...(row.calendar_id ? { calendarId: row.calendar_id } : {}),
  }
}

export function mapShiftRow(row: ShiftRow): ApiShift {
  const type = VALID_SHIFT_TYPES.has(row.type as ShiftType)
    ? (row.type as ShiftType)
    : "CUSTOM"

  const label = typeof row.label === "string" ? row.label.trim() : ""
  const color = typeof row.color === "string" ? row.color.trim() : ""

  const plusNight = typeof row.plusNight === "number" ? row.plusNight : 0
  const plusHoliday = typeof row.plusHoliday === "number" ? row.plusHoliday : 0
  const plusAvailability =
    typeof row.plusAvailability === "number" ? row.plusAvailability : 0
  const plusOther = typeof row.plusOther === "number" ? row.plusOther : 0

  return {
    id: row.id,
    date: row.date,
    type,
    ...(row.note != null && row.note.trim().length > 0
      ? { note: row.note }
      : {}),
    ...(label.length > 0 ? { label } : {}),
    ...(color.length > 0 ? { color } : {}),
    ...((plusNight || plusHoliday || plusAvailability || plusOther) && {
      plusNight,
      plusHoliday,
      plusAvailability,
      plusOther,
    }),
  }
}

export function normalizeDate(date: unknown): string | null {
  if (typeof date !== "string") {
    return null
  }

  const trimmed = date.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null
  }

  const parsed = new Date(`${trimmed}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return trimmed
}

export function buildDateRange(date: string): {
  startAt: string
  endAt: string
} {
  return {
    startAt: `${date} 00:00:00`,
    endAt: `${date} 23:59:59`,
  }
}
