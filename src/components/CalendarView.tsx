"use client"

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
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
    "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClassName}>
      {/* Toolbar */}
      <header className="flex flex-col gap-4 border-b border-slate-200/70 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
          >
            Ant.
          </button>
          <button
            onClick={handleToday}
            className="rounded-full border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Hoy
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
          >
            Sig.
          </button>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-sm font-semibold text-slate-700 sm:text-base">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Vista mensual
          </p>
        </div>
      </header>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-px border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {weekdays.map((day) => (
          <div key={day} className="bg-white py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 bg-slate-100/60">
        <div className="grid grid-cols-7 grid-rows-6 gap-px h-full">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDay.get(key) ?? []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)

            return (
              <motion.div
                key={key}
                onClick={() => handleDayClick(day)}
                whileHover={{ scale: 1.01 }}
                className={`flex flex-col border bg-white p-2 text-xs ${
                  isCurrentMonth ? "text-slate-700" : "text-slate-400 bg-slate-50"
                }`}
              >
                {/* Número del día */}
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrentDay ? "bg-blue-600 text-white" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Eventos */}
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.map((shift) => (
                    <motion.button
                      key={shift.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(shift)
                      }}
                      className="truncate rounded-lg px-2 py-1 text-left text-[11px] font-medium shadow-sm"
                      style={{ backgroundColor: `${typeColor[shift.type]}30` }}
                    >
                      <span className="font-semibold">{shift.type}</span>
                      {shift.note && (
                        <p className="truncate text-[10px] text-slate-700">
                          {shift.note}
                        </p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
