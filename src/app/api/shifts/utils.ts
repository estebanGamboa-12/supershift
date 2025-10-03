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
}

export type ApiShift = {
  id: number
  date: string
  type: ShiftType
  note?: string
}

export const SHIFT_SELECT_BASE =
  "SELECT id, DATE_FORMAT(start_at, '%Y-%m-%d') AS date, shift_type_code AS type, note FROM shifts"

export function mapShiftRow(row: ShiftRow): ApiShift {
  const type = VALID_SHIFT_TYPES.has(row.type as ShiftType)
    ? (row.type as ShiftType)
    : "CUSTOM"

  return {
    id: row.id,
    date: row.date,
    type,
    ...(row.note != null && row.note.trim().length > 0
      ? { note: row.note }
      : {}),
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
