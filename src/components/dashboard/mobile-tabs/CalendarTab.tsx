"use client"

import type { FC } from "react"
import { useState, useCallback } from "react"
import {
  addMonths,
  isAfter,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns"
import ShiftPlannerLab from "@/components/ShiftPlannerLab"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import { formatCompactDate } from "@/lib/formatDate"
import MiniCalendar from "@/components/calendar/MiniCalendar"
import DayView from "@/components/calendar/DayView"

export type CalendarSidebarProps = {
  nextShift: ShiftEvent | null
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  orderedShifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}

type CalendarTabProps = CalendarSidebarProps & {
  plannerDays: ManualRotationDay[]
  onCommitPlanner: (days: ManualRotationDay[]) => Promise<void> | void
  isCommittingPlanner: boolean
  plannerError: string | null
  onSelectEvent: (shift: ShiftEvent) => void
  embedSidebar?: boolean
  onAddShiftForDate?: (date: Date, startTime?: string, endTime?: string) => void
  onUpdateShift?: (shift: ShiftEvent, updates: { startTime?: string; endTime?: string }) => Promise<void>
  calendarView?: "day" | "monthly"
  onCalendarViewChange?: (view: "day" | "monthly") => void
}

const upcomingShiftsFromOrdered = (
  orderedShifts: ShiftEvent[],
): ShiftEvent[] => {
  const today = startOfDay(new Date())
  return orderedShifts
    .filter((shift) => {
      const shiftDate = startOfDay(new Date(shift.date))
      return !isAfter(today, shiftDate)
    })
    .slice(0, 5)
}

export const CalendarSidebar: FC<CalendarSidebarProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  onSelectEvent,
}) => {
  const upcomingShifts = upcomingShiftsFromOrdered(orderedShifts)
  return (
    <div className="flex flex-col gap-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
      <NextShiftCard
        nextShift={nextShift ?? undefined}
        daysUntilNextShift={daysUntilNextShift}
        shiftTypeLabels={shiftTypeLabels}
      />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10 lg:rounded-3xl lg:border-white/15 lg:bg-white/[0.06] lg:p-5 lg:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.2)]">
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
              const dateLabel = formatCompactDate(new Date(shift.date))
              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(shift)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-white/80 shadow-inner shadow-blue-500/10 transition hover:border-blue-400/40 hover:bg-blue-500/10"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-white/50">{dateLabel}</span>
                      <span className="font-semibold text-white">{typeLabel}</span>
                      <span className="mt-1 text-[11px] text-white/60">
                        {shift.startTime && shift.endTime
                          ? `${shift.startTime} - ${shift.endTime}`
                          : "Todo el día"}
                        {shift.durationMinutes > 0 &&
                          ` • ${Math.floor(shift.durationMinutes / 60)}h ${String(shift.durationMinutes % 60).padStart(2, "0")}m`}
                      </span>
                      {shift.note && <span className="mt-1 text-xs text-white/60">{shift.note}</span>}
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

const CalendarTab: FC<CalendarTabProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  plannerDays,
  onCommitPlanner,
  isCommittingPlanner,
  plannerError,
  onSelectEvent,
  onAddShiftForDate,
  onUpdateShift,
  calendarView = "day",
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => subMonths(m, 1))
  }, [])
  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => addMonths(m, 1))
  }, [])
  const handleGoToday = useCallback(() => {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(startOfMonth(today))
  }, [])

  const displayDate = selectedDate ?? new Date()
  const upcomingShifts = upcomingShiftsFromOrdered(orderedShifts)

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
      {/* Columna izquierda tipo Google Calendar: scroll con calendario + próximos turnos */}
      <aside className="order-2 w-full shrink-0 lg:order-none lg:flex lg:min-h-0 lg:w-[280px] xl:w-[300px] lg:flex-col lg:border-r lg:border-white/10">
        <div className="flex flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/50 py-4 lg:max-h-[calc(100vh-12rem)] lg:rounded-none lg:border-0 lg:border-r lg:border-white/10 lg:bg-slate-950/30 lg:py-5 lg:pr-3">
          {onAddShiftForDate && (
            <div className="px-4 lg:px-3">
              <button
                type="button"
                onClick={() => onAddShiftForDate(displayDate)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/20 py-2.5 text-sm font-bold text-sky-100 transition hover:border-sky-400/70 hover:bg-sky-500/30 hover:text-white"
              >
                <span className="text-lg leading-none">+</span>
                Crear
              </button>
            </div>
          )}
          <div className="px-2 lg:px-0">
            <MiniCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
              shifts={orderedShifts}
            />
          </div>
          <div className="mt-2 flex flex-col gap-4 px-4 lg:px-3">
            <NextShiftCard
              nextShift={nextShift ?? undefined}
              daysUntilNextShift={daysUntilNextShift}
              shiftTypeLabels={shiftTypeLabels}
            />
            <section className="rounded-2xl border border-white/10 bg-white/5 py-3 px-3 lg:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Próximos turnos
                </p>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                  {upcomingShifts.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {upcomingShifts.length > 0 ? (
                  upcomingShifts.map((shift) => {
                    const typeLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
                    const dateLabel = formatCompactDate(new Date(shift.date))
                    return (
                      <li key={shift.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEvent(shift)}
                          className="group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-left text-sm text-white/80 transition hover:border-sky-400/40 hover:bg-sky-500/10"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-[11px] uppercase tracking-wide text-white/50">{dateLabel}</span>
                            <span className="block font-semibold text-white truncate">{typeLabel}</span>
                            {shift.startTime && shift.endTime && (
                              <span className="mt-0.5 block text-[10px] text-white/50">
                                {shift.startTime} – {shift.endTime}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] font-medium text-white/50 group-hover:text-sky-200">Ver</span>
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li>
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-center text-xs text-white/50">
                      No hay turnos próximos
                    </p>
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </aside>

      {/* Área principal: una sola vista (día o plan mensual) */}
      <div className="order-1 min-w-0 flex-1 lg:min-h-[520px] lg:pl-6">
        {calendarView === "monthly" ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-sm shadow-lg p-5">
            <ShiftPlannerLab
              initialEntries={plannerDays}
              onCommit={onCommitPlanner}
              isCommitting={isCommittingPlanner}
              errorMessage={plannerError}
            />
          </div>
        ) : (
          <DayView
            date={displayDate}
            shifts={orderedShifts}
            shiftTypeLabels={shiftTypeLabels}
            onSelectEvent={onSelectEvent}
            onAddSlot={onAddShiftForDate}
            onUpdateShift={onUpdateShift}
          />
        )}
      </div>
    </div>
  )
}

export default CalendarTab
