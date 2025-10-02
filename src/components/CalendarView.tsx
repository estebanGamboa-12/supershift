"use client"

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useMemo, useState } from "react"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const WEEK_STARTS_ON = 1

const typeColor: Record<ShiftType, string> = {
  WORK: "bg-blue-100 text-blue-700 border-blue-300",
  REST: "bg-slate-100 text-slate-600 border-slate-300",
  NIGHT: "bg-violet-100 text-violet-700 border-violet-300",
  VACATION: "bg-orange-100 text-orange-700 border-orange-300",
  CUSTOM: "bg-sky-100 text-sky-700 border-sky-300",
}

type CalendarSlot = { start: Date }

type Props = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slot: CalendarSlot) => void
  onDeleteEvent?: (shift: ShiftEvent) => void
  className?: string
}

export default function CalendarView({
  shifts,
  onSelectEvent,
  onSelectSlot,
  onDeleteEvent,
  className = "",
}: Props) {
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
      const key = format(shift.start, "yyyy-MM-dd")
      const events = map.get(key) ?? []
      events.push(shift)
      map.set(key, events)
    })
    return map
  }, [shifts])

  const weekRef = useMemo(() => startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }), [])
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(addDays(weekRef, i), "EEEEEE", { locale: es })
      ),
    [weekRef]
  )

  function handlePrev() {
    setCurrentDate((d) => subMonths(d, 1))
  }
  function handleNext() {
    setCurrentDate((d) => addMonths(d, 1))
  }
  function handleToday() {
    setCurrentDate(new Date())
  }

  return (
    <div className={`flex flex-col bg-white text-slate-900 ${className}`}>
      {/* Header */}
      <header className="flex justify-between items-center border-b px-4 py-3 bg-white sticky top-0 z-10">
        <div className="flex gap-2">
          <button onClick={handlePrev} className="btn-nav">Ant.</button>
          <button onClick={handleToday} className="btn-today">Hoy</button>
          <button onClick={handleNext} className="btn-nav">Sig.</button>
        </div>
        <div className="text-right">
          <h2 className="font-semibold text-slate-800">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <p className="text-xs text-slate-400 uppercase">Vista mensual</p>
        </div>
      </header>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold border-b bg-slate-50">
        {weekdays.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {/* Grid days */}
      <div className="grid grid-cols-7 flex-1">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const events = eventsByDay.get(key) ?? []
          const isCurrMonth = isSameMonth(day, currentDate)
          const isCurrDay = isToday(day)

          return (
            <div
              key={key}
              className={`min-h-[120px] sm:min-h-[140px] border p-1 flex flex-col cursor-pointer ${
                isCurrMonth ? "bg-white" : "bg-slate-50"
              }`}
              onClick={() => onSelectSlot?.({ start: day })}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-sm font-semibold ${
                    isCurrDay
                      ? "bg-blue-600 text-white"
                      : "text-slate-600"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                {events.length === 0 ? (
                  <span className="text-[10px] text-slate-400">Sin turnos</span>
                ) : (
                  events.slice(0, 3).map((shift) => (
                    <button
                      key={shift.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(shift)
                      }}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold border truncate ${typeColor[shift.type]}`}
                    >
                      {shift.type}{shift.note ? ` - ${shift.note}` : ""}
                    </button>
                  ))
                )}
                {events.length > 3 && (
                  <span className="text-[10px] text-blue-600">+{events.length - 3} más</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Tailwind helpers */
const btnBase = "px-3 py-1 rounded text-xs font-semibold shadow-sm transition"
const btnBlue = "bg-blue-600 text-white hover:bg-blue-700"
const btnGray = "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"

function Button({ children, className, ...props }: any) {
  return <button {...props} className={`${btnBase} ${className}`}>{children}</button>
}
