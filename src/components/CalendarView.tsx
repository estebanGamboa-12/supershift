"use client"

import { addDays, addMonths, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { useMemo, useState } from "react"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const WEEK_STARTS_ON = 1 // lunes

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

type CalendarSlot = { start: Date }

type CalendarViewProps = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slotInfo: CalendarSlot) => void
  className?: string
}

export default function CalendarView({
  shifts,
  onSelectEvent,
  onSelectSlot,
  className = "",
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  // Calculamos 6 filas SIEMPRE (42 días)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON })
    return Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ShiftEvent[]>()
    shifts.forEach((shift) => {
      const key = format(new Date(shift.date), "yyyy-MM-dd")
      const events = map.get(key) ?? []
      events.push(shift)
      map.set(key, events)
    })
    return map
  }, [shifts])

  const weekdays = useMemo(() => {
    const weekRef = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(weekRef, i), "EEEEEE", { locale: es })
    )
  }, [])

  function handlePrevMonth() {
    setCurrentDate((date) => subMonths(date, 1))
  }

  function handleNextMonth() {
    setCurrentDate((date) => addMonths(date, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  function handleDayClick(day: Date) {
    onSelectSlot?.({ start: day })
  }

  const containerClassName = [
    "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 text-white shadow-inner shadow-blue-500/5",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClassName}>
      {/* Toolbar */}
      <header className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-blue-400/60 hover:text-blue-200"
          >
            Ant.
          </button>
          <button
            onClick={handleToday}
            className="rounded-full border border-blue-500/50 bg-blue-500/80 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Hoy
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-blue-400/60 hover:text-blue-200"
          >
            Sig.
          </button>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-sm font-semibold text-white sm:text-base">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Vista mensual
          </p>
        </div>
      </header>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wide text-white/60 sm:text-xs">
        {weekdays.map((day) => (
          <div key={day} className="bg-slate-950/40 py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 bg-slate-950/20">
        <div className="grid h-full grid-cols-7 grid-rows-6 gap-px">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDay.get(key) ?? []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)

            return (
              <div
                key={key}
                onClick={() => handleDayClick(day)}
                className={`group flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-950/40 p-3 text-xs transition hover:border-blue-400/40 hover:bg-slate-900/70 ${
                  isCurrentMonth ? "text-white/80" : "text-white/30"
                }`}
              >
                {/* Número del día */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition ${
                      isCurrentDay
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/40"
                        : "bg-white/5 text-white/80 group-hover:bg-white/10"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Eventos */}
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(shift)
                      }}
                      className="truncate rounded-lg border px-2 py-1 text-left text-[11px] font-semibold shadow-sm transition hover:scale-[1.01]"
                      style={{
                        backgroundColor: `${typeColor[shift.type]}26`,
                        borderColor: `${typeColor[shift.type]}40`,
                        color: typeColor[shift.type],
                      }}
                    >
                      <span className="font-semibold">{shift.type}</span>
                      {shift.note && (
                        <p className="truncate text-[10px] text-white/70">
                          {shift.note}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
