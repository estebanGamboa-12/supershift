import { endOfWeek, startOfWeek } from "date-fns"

import type { ShiftType } from "@/types/shifts"

type ShiftTypeAccumulator = {
  minutes: number
  shiftCount: number
}

type WeekBucket = {
  start: Date
  end: Date
  totalMinutes: number
  shiftCount: number
  typeTotals: Map<ShiftType, ShiftTypeAccumulator>
}

export type ShiftStatisticsInput = {
  date: string
  durationMinutes: number
  type: ShiftType
}

export type ShiftTypeSummary = {
  type: ShiftType
  totalMinutes: number
  shiftCount: number
  percentage: number
}

export type WeeklyShiftSummary = {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  shiftCount: number
  typeSummaries: ShiftTypeSummary[]
}

export type WeeklyShiftSummaryOptions = {
  weekStartsOn?: 0 | 1
}

const MINUTES_IN_HOUR = 60

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0
  }

  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const sanitizeMinutes = (value: number): number => {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.round(value))
}

export const formatMinutesAsDuration = (minutes: number): string => {
  const safeMinutes = sanitizeMinutes(minutes)
  const hours = Math.floor(safeMinutes / MINUTES_IN_HOUR)
  const remaining = safeMinutes % MINUTES_IN_HOUR

  return `${hours}h ${String(remaining).padStart(2, "0")}m`
}

export const calculateWeeklyShiftSummaries = (
  shifts: ShiftStatisticsInput[],
  options: WeeklyShiftSummaryOptions = {},
): WeeklyShiftSummary[] => {
  const weekStartsOn = options.weekStartsOn ?? 1

  const buckets = new Map<string, WeekBucket>()

  for (const shift of shifts) {
    if (!shift || typeof shift.date !== "string") {
      continue
    }

    const parsedDate = new Date(`${shift.date}T00:00:00`)
    if (Number.isNaN(parsedDate.getTime())) {
      continue
    }

    const safeMinutes = sanitizeMinutes(shift.durationMinutes)
    if (safeMinutes === 0) {
      continue
    }

    const weekStart = startOfWeek(parsedDate, { weekStartsOn })
    const key = formatDateKey(weekStart)

    const bucket = buckets.get(key) ?? {
      start: weekStart,
      end: endOfWeek(parsedDate, { weekStartsOn }),
      totalMinutes: 0,
      shiftCount: 0,
      typeTotals: new Map<ShiftType, ShiftTypeAccumulator>(),
    }

    bucket.totalMinutes += safeMinutes
    bucket.shiftCount += 1

    const typeAccumulator = bucket.typeTotals.get(shift.type) ?? {
      minutes: 0,
      shiftCount: 0,
    }

    typeAccumulator.minutes += safeMinutes
    typeAccumulator.shiftCount += 1

    bucket.typeTotals.set(shift.type, typeAccumulator)

    buckets.set(key, bucket)
  }

  return Array.from(buckets.values())
    .map((bucket) => {
      const typeSummaries: ShiftTypeSummary[] = Array.from(
        bucket.typeTotals.entries(),
      )
        .map(([type, accumulator]) => {
          const rawPercentage = bucket.totalMinutes
            ? (accumulator.minutes / bucket.totalMinutes) * 100
            : 0
          const percentage = clampPercentage(Math.round(rawPercentage * 10) / 10)

          return {
            type,
            totalMinutes: sanitizeMinutes(accumulator.minutes),
            shiftCount: accumulator.shiftCount,
            percentage,
          }
        })
        .sort((a, b) => b.totalMinutes - a.totalMinutes)

      return {
        weekStart: formatDateKey(bucket.start),
        weekEnd: formatDateKey(bucket.end),
        totalMinutes: sanitizeMinutes(bucket.totalMinutes),
        shiftCount: bucket.shiftCount,
        typeSummaries,
      }
    })
    .sort(
      (a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
    )
}
