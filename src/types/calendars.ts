export type CalendarScope = "personal" | "team"

export type CalendarSummary = {
  id: number
  name: string
  scope: CalendarScope
  teamId?: string | null
}
