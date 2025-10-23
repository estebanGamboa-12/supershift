"use client"

import type { FC } from "react"
import DailyHoursSummary, {
  type DailyHoursEntry,
} from "@/components/dashboard/DailyHoursSummary"
import type { ShiftType } from "@/types/shifts"

type HoursTabProps = {
  entries: DailyHoursEntry[]
  shiftTypeLabels: Record<ShiftType, string>
}

const HoursTab: FC<HoursTabProps> = ({ entries, shiftTypeLabels }) => {
  return (
    <div className="space-y-4">
      <DailyHoursSummary entries={entries} shiftTypeLabels={shiftTypeLabels} />
    </div>
  )
}

export default HoursTab
