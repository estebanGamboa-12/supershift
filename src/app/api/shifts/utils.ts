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
  startTime: string | null
  endTime: string | null
  durationMinutes: number
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
  startTime: string | null
  endTime: string | null
  durationMinutes: number
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

  const directMatch = trimmed.match(/^\s*(\d{4}-\d{2}-\d{2})/)
  if (directMatch) {
    return directMatch[1]
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

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function normalizeTimeFromDateTime(value: string | null): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const isoMatch = trimmed.match(/T(\d{2}:\d{2})/)
  if (isoMatch) {
    return isoMatch[1]
  }

  const spaceMatch = trimmed.match(/\s(\d{2}:\d{2})/)
  if (spaceMatch) {
    return spaceMatch[1]
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }

  return null
}

export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return null
  }

  const [hours, minutes] = trimmed.split(":").map((chunk) => Number.parseInt(chunk, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function adaptDatabaseShiftRow(row: DatabaseShiftRow): ShiftRow {
  const date = normalizeDateFromStart(row.start_at)
  const startTime = normalizeTimeFromDateTime(row.start_at)
  const endTime = normalizeTimeFromDateTime(row.end_at)

  const startDateTime = startTime ? new Date(`${date}T${startTime}:00`) : null
  const endDateTime = endTime ? new Date(`${date}T${endTime}:00`) : null
  if (startDateTime && endDateTime && endDateTime.getTime() <= startDateTime.getTime()) {
    endDateTime.setDate(endDateTime.getDate() + 1)
  }

  let durationMinutes = 0
  if (startDateTime && endDateTime) {
    let diff = (endDateTime.getTime() - startDateTime.getTime()) / 60000
    if (diff < 0) {
      diff += 24 * 60
    }
    durationMinutes = Math.max(0, Math.round(diff))
  } else if (!startTime && !endTime) {
    durationMinutes = 24 * 60
  }

  return {
    id: row.id,
    date,
    startTime,
    endTime,
    durationMinutes,
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
    startTime: row.startTime,
    endTime: row.endTime,
    durationMinutes: row.durationMinutes,
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

export function buildDateRange(
  date: string,
  options?: { startTime?: string | null; endTime?: string | null },
): {
  startAt: string
  endAt: string
} {
  const normalizedStart = normalizeTime(options?.startTime ?? null)
  const normalizedEnd = normalizeTime(options?.endTime ?? null)

  const startTime = normalizedStart ?? "00:00"
  const [startHours, startMinutes] = startTime.split(":").map((chunk) => Number.parseInt(chunk, 10))

  const startAt = new Date(date)
  startAt.setHours(startHours, startMinutes, 0, 0)

  const endAt = new Date(startAt)

  if (normalizedEnd) {
    const [endHours, endMinutes] = normalizedEnd
      .split(":")
      .map((chunk) => Number.parseInt(chunk, 10))
    endAt.setHours(endHours, endMinutes, 0, 0)
    if (endAt.getTime() <= startAt.getTime()) {
      endAt.setDate(endAt.getDate() + 1)
    }
  } else {
    endAt.setHours(23, 59, 59, 0)
  }

  const formatDate = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    const hours = String(value.getHours()).padStart(2, "0")
    const minutes = String(value.getMinutes()).padStart(2, "0")
    const seconds = String(value.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return {
    startAt: formatDate(startAt),
    endAt: formatDate(endAt),
  }
}
