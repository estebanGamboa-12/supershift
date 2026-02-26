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
  /** 0 = domingo, 1 = lunes (date-fns weekStartsOn). Por defecto 1. */
  weekStartsOn?: 0 | 1
}

function getDatesForMonthView(month: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfMonth(month)
  const daysInMonth = getDaysInMonth(month)
  const startWeek = startOfWeek(start, { weekStartsOn })
  const weekday = getDay(start)
  const padStart = weekStartsOn === 1 ? (weekday + 6) % 7 : weekday
  const totalCells = Math.ceil((padStart + daysInMonth) / 7) * 7
  const result: Date[] = []
  for (let i = 0; i < totalCells; i++) {
    result.push(addDays(startWeek, i))
  }
  return result
}

const WEEKDAY_LABELS_MONDAY_FIRST = ["L", "M", "X", "J", "V", "S", "D"]
const WEEKDAY_LABELS_SUNDAY_FIRST = ["D", "L", "M", "X", "J", "V", "S"]

const MiniCalendar: FC<MiniCalendarProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  shifts = [],
  weekStartsOn = 1,
}) => {
  const dates = getDatesForMonthView(currentMonth, weekStartsOn)
  const shiftDates = new Set(shifts.map((s) => s.date))
  const weekdayLabels = weekStartsOn === 0 ? WEEKDAY_LABELS_SUNDAY_FIRST : WEEKDAY_LABELS_MONDAY_FIRST

  return (
    <div className="flex flex-col p-1">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-5 w-5 items-center justify-center text-white/60 transition hover:text-white"
          aria-label="Mes anterior"
        >
          <span className="text-xs leading-none">‹</span>
        </button>
        <span className="text-[9px] font-semibold text-white">
          {formatCompactMonth(currentMonth)}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-5 w-5 items-center justify-center text-white/60 transition hover:text-white"
          aria-label="Mes siguiente"
        >
          <span className="text-xs leading-none">›</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onGoToday}
        className="mb-1 w-full rounded bg-white/5 py-0.5 text-[8px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        Hoy
      </button>
      <div className="grid grid-cols-7 gap-0.5">
        {weekdayLabels.map((d) => (
          <div
            key={d}
            className="py-0.5 text-center text-[7px] font-semibold uppercase text-white/40"
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
              className={`group relative flex min-h-[24px] flex-col items-center justify-center gap-0 text-[8px] font-medium transition ${
                !inMonth
                  ? "text-white/20"
                  : selected
                    ? "bg-white/10 text-white"
                    : today
                      ? "bg-white/5 font-bold text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
              } ${hasShift && inMonth && !selected && !today ? "font-semibold" : ""}`}
            >
              <span>{format(day, "d", { locale: es })}</span>
              {hasShift && inMonth && !selected && !today ? (
                <span className="h-0.5 w-0.5 rounded-full bg-white/60" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
