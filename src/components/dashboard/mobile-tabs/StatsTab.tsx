import type { FC } from "react"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import WeeklyShiftBalanceCard from "@/components/dashboard/WeeklyShiftBalanceCard"
import type { WeeklyShiftSummary } from "@/lib/shiftStatistics"
import type { ShiftType } from "@/types/shifts"

type SummaryCard = {
  title: string
  value: string
  description: string
  icon?: string
}

type StatsTabProps = {
  summaryCards: SummaryCard[]
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
  typeCounts: Record<ShiftType, number>
  shiftTypeLabels: Record<ShiftType, string>
  weeklyShiftSummaries: WeeklyShiftSummary[]
}

const StatsTab: FC<StatsTabProps> = ({
  summaryCards,
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
  typeCounts,
  shiftTypeLabels,
  weeklyShiftSummaries,
}) => {
  return (
    <div className="flex flex-col gap-7">
      {summaryCards.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141b2b]/90 px-5 py-4 shadow-[0_22px_55px_-30px_rgba(59,130,246,0.6)]"
            >
              <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_62%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_58%)]" />
              </div>
              <div className="relative flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wide text-white/65">
                  {card.title}
                </p>
                {card.icon ? <span aria-hidden className="text-lg">{card.icon}</span> : null}
              </div>
              <p className="relative mt-3 text-3xl font-semibold text-white">{card.value}</p>
              <p className="relative mt-1 text-xs text-white/55">{card.description}</p>
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
      <WeeklyShiftBalanceCard
        summaries={weeklyShiftSummaries}
        shiftTypeLabels={shiftTypeLabels}
        maxWeeks={4}
      />
    </div>
  )
}

export default StatsTab
