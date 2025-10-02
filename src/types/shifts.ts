export type ShiftType = "WORK" | "REST" | "NIGHT" | "VACATION" | "CUSTOM"

export type ShiftEvent = {
  id: number
  date: string
  type: ShiftType
  start: Date
  end: Date
  note?: string
}
