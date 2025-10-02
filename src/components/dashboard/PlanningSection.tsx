import type { FC } from "react"
import CalendarView from "@/components/CalendarView"
import AgendaView from "@/components/AgendaView"
import type { ShiftEvent } from "@/types/shifts"

type PlanningSectionProps = {
  shifts: ShiftEvent[]
  onSelectShift: (shift: ShiftEvent) => void
  onSelectSlot: (slot: { start: Date }) => void
  onGoToToday: () => void
}

const PlanningSection: FC<PlanningSectionProps> = ({
  shifts,
  onSelectShift,
  onSelectSlot,
  onGoToToday,
}) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-blue-500/10 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planificación visual</h3>
          <p className="text-sm text-white/60">
            Alterna entre el calendario completo en escritorio y la agenda semanal en móviles.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white md:inline-flex"
          >
            Vista mensual
          </button>
          <button
            type="button"
            onClick={onGoToToday}
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/30"
          >
            Ir a hoy
          </button>
        </div>
      </div>

      <div className="mt-6 hidden min-h-[640px] rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-inner md:block">
        <CalendarView
          shifts={shifts}
          onSelectEvent={onSelectShift}
          onSelectSlot={onSelectSlot}
          className="h-full"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-inner md:hidden">
        <AgendaView shifts={shifts} onSelectEvent={onSelectShift} />
      </div>
    </div>
  )
}

export default PlanningSection
