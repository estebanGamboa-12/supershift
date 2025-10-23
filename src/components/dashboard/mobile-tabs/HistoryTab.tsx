"use client"

import type { FC } from "react"
import ChangeHistoryPanel, {
  type HistoryEntry,
} from "@/components/dashboard/ChangeHistoryPanel"
import type { ShiftType } from "@/types/shifts"

type HistoryTabProps = {
  entries: HistoryEntry[]
  shiftTypeLabels: Record<ShiftType, string>
}

const HistoryTab: FC<HistoryTabProps> = ({ entries, shiftTypeLabels }) => {
  return (
    <div className="space-y-4">
      <ChangeHistoryPanel entries={entries} shiftTypeLabels={shiftTypeLabels} />
    </div>
  )
}

export default HistoryTab
