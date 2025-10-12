import type { FC } from "react"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import type { ShiftType } from "@/types/shifts"

type StatsTabProps = {
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
  typeCounts: Record<ShiftType, number>
  shiftTypeLabels: Record<ShiftType, string>
}

const StatsTab: FC<StatsTabProps> = ({
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
  typeCounts,
  shiftTypeLabels,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <PlanningHealthCard
        currentMonthShiftCount={currentMonthShiftCount}
        totalShiftCount={totalShiftCount}
        activeShiftTypes={activeShiftTypes}
      />
      <ShiftDistribution
        typeCounts={typeCounts}
        totalShifts={totalShiftCount}
        shiftTypeLabels={shiftTypeLabels}
      />
    </div>
  )
}

export default StatsTab
