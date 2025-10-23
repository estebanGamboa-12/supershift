import type { FC } from "react"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import type { ShiftType } from "@/types/shifts"

type SummaryCard = {
  title: string
  value: string
  description: string
}

type StatsTabProps = {
  summaryCards: SummaryCard[]
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
  typeCounts: Record<ShiftType, number>
  shiftTypeLabels: Record<ShiftType, string>
}

const StatsTab: FC<StatsTabProps> = ({
  summaryCards,
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
  typeCounts,
  shiftTypeLabels,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {summaryCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-blue-500/10"
            >
              <p className="text-[11px] uppercase tracking-wide text-white/60">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-1 text-xs text-white/50">{card.description}</p>
            </div>
          ))}
        </div>
      )}
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
