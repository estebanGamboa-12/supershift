"use client"

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useMemo, useState } from "react"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const WEEK_STARTS_ON = 1

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

type CalendarSlot = {
  start: Date
}

type CalendarViewProps = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slotInfo: CalendarSlot) => void
  onDeleteEvent?: (shift: ShiftEvent) => void
  className?: string
}

export default function CalendarView({
  shifts,
  onSelectEvent,
  onSelectSlot,
  onDeleteEvent,
  className = "",
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ShiftEvent[]>()

    shifts.forEach((shift) => {
      const eventDays = eachDayOfInterval({
        start: startOfDay(shift.start),
        end: endOfDay(shift.end),
      })

      eventDays.forEach((day) => {
        const key = format(day, "yyyy-MM-dd")
        const events = map.get(key) ?? []
        events.push(shift)
        map.set(key, events)
      })
    })

    return map
  }, [shifts])

  const weekReference = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }),
    []
  )

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        format(addDays(weekReference, index), "EEEEEE", { locale: es })
      ),
    [weekReference]
  )

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
    "flex h-full w-full flex-col overflow-hidden rounded-none bg-white text-slate-900",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClassName}>
      <header className="flex flex-col gap-4 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Ant.
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-full border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Sig.
          </button>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-sm font-semibold text-slate-700 sm:text-base">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Vista mensual</p>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px border-b border-slate-200/70 bg-slate-200/40 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {weekdays.map((dayName) => (
          <div key={dayName} className="bg-white px-3 py-2 text-center">
            {dayName}
          </div>
        ))}
      </div>

      <div className="calendar-scrollbar flex-1 overflow-y-auto bg-slate-100/60">
        <div className="grid h-full grid-cols-7 gap-px">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDay.get(key) ?? []
            const sortedEvents = [...dayEvents].sort(
              (a, b) => a.start.getTime() - b.start.getTime()
            )
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            const dayNumber = format(day, "d")

            return (
              <div
                key={key}
                className={`flex min-h-[120px] flex-col bg-white px-2 py-2 text-xs transition hover:bg-blue-50/60 sm:min-h-[150px]`}
                onClick={() => handleDayClick(day)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrentDay
                        ? "bg-blue-600 text-white shadow"
                        : isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {!isCurrentMonth && (
                    <span className="text-[10px] uppercase tracking-wide text-slate-300">
                      {format(day, "MMM", { locale: es })}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {sortedEvents.length === 0 ? (
                    <div className="mt-auto text-[10px] text-slate-300">Sin turnos</div>
                  ) : (
                    sortedEvents.map((shift) => (
                      <button
                        key={`${shift.id}-${key}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectEvent(shift)
                        }}
                        className="group flex flex-col gap-1 rounded-xl border border-white/60 px-2 py-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        style={{ backgroundColor: `${typeColor[shift.type]}20` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">
                            {shift.type}
                          </span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: typeColor[shift.type] }}
                          />
                        </div>
                        {shift.note && (
                          <p className="text-[10px] leading-snug text-slate-800 opacity-90">
                            {shift.note}
                          </p>
                        )}
                        {onDeleteEvent && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onDeleteEvent(shift)
                            }}
                            className="inline-flex w-max items-center gap-1 rounded-full border border-white/50 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-white"
                          >
                            Borrar
                          </button>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
