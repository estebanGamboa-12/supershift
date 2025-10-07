import type { ShiftType } from "@/types/shifts"
import type { RowDataPacket } from "mysql2/promise"

export const VALID_SHIFT_TYPES: ReadonlySet<ShiftType> = new Set([
  "WORK",
  "REST",
  "NIGHT",
  "VACATION",
  "CUSTOM",
])

export type ShiftRow = RowDataPacket & {
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

export const SHIFT_SELECT_BASE =
  "SELECT id, calendar_id AS calendarId, DATE_FORMAT(start_at, '%Y-%m-%d') AS date, shift_type_code AS type, note, label, color, plus_night AS plusNight, plus_holiday AS plusHoliday, plus_availability AS plusAvailability, plus_other AS plusOther FROM shifts"

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
