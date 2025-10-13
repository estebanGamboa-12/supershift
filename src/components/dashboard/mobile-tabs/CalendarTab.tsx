"use client"

import type { FC } from "react"
import { format, isAfter, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import CalendarView from "@/components/CalendarView"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type CalendarTabProps = {
  nextShift: ShiftEvent | null
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  orderedShifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slot: { start: Date }) => void
}

const CalendarTab: FC<CalendarTabProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  onSelectEvent,
  onSelectSlot,
}) => {
  const today = startOfDay(new Date())
  const upcomingShifts = orderedShifts
    .filter((shift) => {
      const shiftDate = startOfDay(new Date(shift.date))
      return !isAfter(today, shiftDate)
    })
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <NextShiftCard
        nextShift={nextShift ?? undefined}
        daysUntilNextShift={daysUntilNextShift}
        shiftTypeLabels={shiftTypeLabels}
      />

      <CalendarView
        shifts={orderedShifts}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        className="min-h-[420px]"
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
              Próximos turnos
            </p>
            <p className="mt-1 text-sm text-white/60">
              Un vistazo rápido a los próximos días para reaccionar a tiempo.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {upcomingShifts.length} {upcomingShifts.length === 1 ? "turno" : "turnos"}
          </span>
        </header>

        <ul className="mt-4 space-y-3">
          {upcomingShifts.length > 0 ? (
            upcomingShifts.map((shift) => {
              const typeLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
              const dateLabel = format(new Date(shift.date), "EEEE d 'de' MMM", { locale: es })

              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(shift)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-white/80 shadow-inner shadow-blue-500/10 transition hover:border-blue-400/40 hover:bg-blue-500/10"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-white/50">
                        {dateLabel}
                      </span>
                      <span className="font-semibold text-white">{typeLabel}</span>
                      {shift.note && (
                        <span className="mt-1 text-xs text-white/60">{shift.note}</span>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition group-hover:border-blue-400/60 group-hover:text-blue-200">
                      Ver
                    </span>
                  </button>
                </li>
              )
            })
          ) : (
            <li>
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/60">
                No hay turnos próximos. ¡Añade uno para empezar!
              </p>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

export default CalendarTab
