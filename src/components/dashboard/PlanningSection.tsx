import { useMemo } from "react"
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
  const upcomingAgenda = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return shifts
      .filter((shift) => {
        const shiftDate = new Date(shift.start)
        shiftDate.setHours(0, 0, 0, 0)
        return shiftDate.getTime() >= today.getTime()
      })
      .slice(0, 10)
  }, [shifts])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-blue-500/10 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planificación visual</h3>
          <p className="text-sm text-white/60">
            Consulta el calendario mensual completo en cualquier dispositivo.
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

      <div className="mt-6 space-y-5 lg:space-y-0">
        <div className="space-y-4 lg:hidden">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold">Agenda próxima</h4>
              <button
                type="button"
                onClick={onGoToToday}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-blue-400/40 hover:text-white"
              >
                Hoy
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingAgenda.length > 0 ? (
                <AgendaView shifts={upcomingAgenda} onSelectEvent={onSelectShift} />
              ) : (
                <p className="text-sm text-white/60">
                  Añade turnos para ver una agenda compacta lista para tus desplazamientos.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 shadow-inner">
            <CalendarView
              shifts={shifts}
              onSelectEvent={onSelectShift}
              onSelectSlot={onSelectSlot}
              className="h-full min-h-[420px]"
            />
          </div>
        </div>

        <div className="hidden min-h-[520px] rounded-2xl border border-white/5 bg-slate-950/50 p-3 shadow-inner sm:p-4 lg:block">
          <CalendarView
            shifts={shifts}
            onSelectEvent={onSelectShift}
            onSelectSlot={onSelectSlot}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}

export default PlanningSection
