import { addDays, format } from "date-fns"
import type { ShiftType } from "@/types/shifts"

export type GeneratedRotationShift = {
  date: string
  type: ShiftType
}

export function generateRotation(
  startDate: string,
  cycle: number[],
  length: number = 365
): GeneratedRotationShift[] {
  if (!startDate || !cycle.length) return []

  const result: GeneratedRotationShift[] = []
  let current = new Date(startDate)
  let cycleIndex = 0
  let work = true

  for (let i = 0; i < length; i++) {
    const type: ShiftType = work ? "WORK" : "REST"
    result.push({
      date: format(current, "yyyy-MM-dd"),
      type,
    })

    current = addDays(current, 1)
    cycleIndex++

    if (cycleIndex >= cycle[work ? 0 : 1]) {
      work = !work
      cycleIndex = 0
    }
  }

  return result
}
