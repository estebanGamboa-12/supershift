export type ShiftType = "WORK" | "REST" | "NIGHT" | "VACATION" | "CUSTOM"

export type ShiftPluses = {
  night: number
  holiday: number
  availability: number
  other: number
}

export type ShiftEvent = {
  id: number
  date: string
  type: ShiftType
  start: Date
  end: Date
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  note?: string
  label?: string
  color?: string
  pluses?: ShiftPluses
}
