import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        {/* Top section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Hoy es {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </div>
            <div>
              <p className="text-sm text-blue-200/70">Panel de rendimiento</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                📅 Supershift HQ
              </h2>
            </div>
          </div>

          {/* Search + CTA */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Buscar personas, turnos o notas..."
                className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">
                ⌘K
              </span>
            </div>
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-400/40 hover:to-indigo-400/40"
            >
              ➕ Nuevo turno rápido
            </button>
          </div>
        </div>

        {/* Cards section */}
        <div className="grid gap-6 md:grid-cols-2">
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
