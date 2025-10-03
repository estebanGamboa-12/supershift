import { format } from "date-fns"
import type { ShiftType } from "@/types/shifts"

type GeneratedShift = {
  id: number
  date: string
  type: ShiftType
  note?: string | null
}

export function generateRotation(
  startDate: string,
  cycle: number[],
  length: number = 30
): GeneratedShift[] {
  const result: GeneratedShift[] = []
  const current = new Date(startDate)
  let cycleIndex = 0
  let work = true

  for (let i = 0; i < length; i++) {
    const type: ShiftType = work ? "WORK" : "REST"
    result.push({
      id: i + 1,
      date: format(current, "yyyy-MM-dd"),
      type,
    })

    current.setDate(current.getDate() + 1)
    cycleIndex++

    if (cycleIndex >= cycle[work ? 0 : 1]) {
      work = !work
      cycleIndex = 0
    }
  }

  return result
}
