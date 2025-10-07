"use client"

import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const WEEK_STARTS_ON = 1 // lunes

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

const shiftTypeLabels: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

function resolveColor(shift: ShiftEvent) {
  return shift.color ?? typeColor[shift.type]
}

function resolveLabel(shift: ShiftEvent) {
  return shift.label ?? shiftTypeLabels[shift.type]
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
  const [direction, setDirection] = useState<1 | -1>(1) // animación izquierda/derecha

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
    setDirection(-1)
    setCurrentDate((date) => subMonths(date, 1))
  }

  function handleNextMonth() {
    setDirection(1)
    setCurrentDate((date) => addMonths(date, 1))
  }

  function handleToday() {
    setDirection(1)
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
      <header className="flex flex-col gap-3 border-b border-white/10 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
        <div className="inline-flex items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
          <button
            onClick={handlePrevMonth}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-white/70 transition hover:border-blue-400/60 hover:text-blue-200"
          >
            ‹
          </button>
          <button
            onClick={handleToday}
            className="rounded-full border border-blue-500/50 bg-blue-500/80 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Hoy
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-white/70 transition hover:border-blue-400/60 hover:text-blue-200"
          >
            ›
          </button>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-fuchsia-400 bg-clip-text text-transparent sm:text-base">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Vista mensual
          </p>
        </div>
      </header>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-slate-900/60 text-[10px] font-semibold uppercase tracking-wide text-white/60 sm:text-xs">
        {weekdays.map((day) => (
          <div key={day} className="bg-slate-950/40 py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid con animación */}
      <div className="relative flex-1 bg-slate-950/20 overflow-hidden min-h-[500px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentDate.toISOString()}
            custom={direction}
            initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid h-full grid-cols-7 grid-rows-6 gap-px"
          >
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayEvents = eventsByDay.get(key) ?? []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`group flex flex-col gap-1.5 rounded-xl border border-white/5 bg-slate-950/40 p-2 text-[11px] transition hover:border-blue-400/40 hover:bg-slate-900/70 sm:gap-2 sm:p-3 sm:text-xs ${
                    isCurrentMonth ? "text-white/80" : "text-white/30"
                  }`}
                >
                  {/* Número del día */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition sm:h-7 sm:w-7 sm:text-sm ${
                        isCurrentDay
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/40"
                          : "bg-white/5 text-white/80 group-hover:bg-white/10"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Eventos con dots */}
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvents.map((shift) => {
                      const accent = resolveColor(shift)
                      return (
                        <button
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent(shift)
                          }}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition hover:scale-[1.01] sm:text-[11px]"
                          style={{
                            color: accent,
                            backgroundColor: `${accent}1a`,
                            border: `1px solid ${accent}33`,
                          }}
                        >
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                          />
                          <span className="truncate">{resolveLabel(shift)}</span>
                          {shift.note && (
                            <span className="truncate text-[10px] text-white/70">
                              – {shift.note}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
