import type { FC } from "react"
import { format } from "date-fns"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import NextShiftCard from "./NextShiftCard"
import PlanningHealthCard from "./PlanningHealthCard"

type DashboardHeaderProps = {
  onQuickAdd: () => void
  nextShift?: ShiftEvent
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
}

const DashboardHeader: FC<DashboardHeaderProps> = ({
  onQuickAdd,
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
}) => {
  return (
    <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-wide text-blue-100/80">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Hoy es {format(new Date(), "EEEE, MMMM d")}
            </div>
            <div>
              <p className="text-sm text-blue-200/80">Panel de rendimiento</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">📅 Supershift HQ</h2>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Buscar personas, turnos o notas..."
                className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">⌘K</span>
            </div>
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/30"
            >
              ➕ Nuevo turno rápido
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <NextShiftCard
            nextShift={nextShift}
            daysUntilNextShift={daysUntilNextShift}
            shiftTypeLabels={shiftTypeLabels}
          />
          <PlanningHealthCard
            currentMonthShiftCount={currentMonthShiftCount}
            totalShiftCount={totalShiftCount}
            activeShiftTypes={activeShiftTypes}
          />
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
