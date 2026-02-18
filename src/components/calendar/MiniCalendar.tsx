"use client"

import type { FC } from "react"
import {
  addDays,
  format,
  getDay,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent } from "@/types/shifts"
import { formatCompactMonth } from "@/lib/formatDate"

type MiniCalendarProps = {
  currentMonth: Date
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
  shifts?: ShiftEvent[]
}

const WEEK_STARTS_ON = 1

function getDatesForMonthView(month: Date): Date[] {
  const start = startOfMonth(month)
  const daysInMonth = getDaysInMonth(month)
  const startWeek = startOfWeek(start, { weekStartsOn: WEEK_STARTS_ON })
  const weekday = getDay(start)
  const padStart = (weekday + 6) % 7
  const totalCells = Math.ceil((padStart + daysInMonth) / 7) * 7
  const result: Date[] = []
  for (let i = 0; i < totalCells; i++) {
    result.push(addDays(startWeek, i))
  }
  return result
}

const MiniCalendar: FC<MiniCalendarProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  shifts = [],
}) => {
  const dates = getDatesForMonthView(currentMonth)
  const shiftDates = new Set(shifts.map((s) => s.date))

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-sm p-4 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] lg:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Mes anterior"
        >
          <span className="text-lg leading-none">‹</span>
        </button>
        <span className="text-sm font-bold tracking-tight text-white">
          {formatCompactMonth(currentMonth)}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Mes siguiente"
        >
          <span className="text-lg leading-none">›</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onGoToday}
        className="mb-3 w-full rounded-xl bg-gradient-to-r from-sky-500/90 to-sky-400/90 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-sky-300 hover:shadow-sky-400/40 active:scale-[0.98]"
      >
        Hoy
      </button>
      <div className="grid grid-cols-7 gap-1">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/40"
          >
            {d}
          </div>
        ))}
        {dates.map((day) => {
          const inMonth = isSameMonth(day, currentMonth)
          const selected = selectedDate ? isSameDay(day, selectedDate) : false
          const today = isToday(day)
          const hasShift = shiftDates.has(format(day, "yyyy-MM-dd"))
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`group relative flex min-h-[36px] flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-all duration-200 lg:min-h-[40px] ${
                !inMonth
                  ? "text-white/25"
                  : selected
                    ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-400/50 scale-105"
                    : today
                      ? "bg-sky-500/30 font-bold text-sky-200 ring-1 ring-sky-400/40 hover:bg-sky-500/40"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
              } ${hasShift && inMonth && !selected && !today ? "font-semibold" : ""}`}
            >
              <span className="relative z-10">{format(day, "d", { locale: es })}</span>
              {hasShift && inMonth && !selected && !today ? (
                <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
              ) : null}
              {selected && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-sky-400/20 to-sky-600/20 blur-sm" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
