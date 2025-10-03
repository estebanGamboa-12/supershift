export type ShiftType = "WORK" | "REST" | "NIGHT" | "VACATION" | "CUSTOM"

export type Shift = {
  id: number
  date: string
  type: ShiftType
  note?: string | null
}
