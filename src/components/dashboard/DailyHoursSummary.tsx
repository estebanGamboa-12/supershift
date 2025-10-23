"use client"

import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftType } from "@/types/shifts"

export type DailyHoursEntry = {
  date: string
  totalMinutes: number
  shifts: Array<{
    id: number
    label?: string | null
    type: ShiftType
    startTime: string | null
    endTime: string | null
    durationMinutes: number
    note?: string | null
    color?: string | null
  }>
}

type DailyHoursSummaryProps = {
  entries: DailyHoursEntry[]
  shiftTypeLabels: Record<ShiftType, string>
}

const toHoursLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h ${String(remaining).padStart(2, "0")}m`
}

const DailyHoursSummary: FC<DailyHoursSummaryProps> = ({ entries, shiftTypeLabels }) => {
  if (!entries.length) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
        <header className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-white">Registro de horas</h2>
          <p className="text-sm text-white/60">
            Todavía no hay turnos con horas registradas. Añade un turno con horario para comenzar.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Registro diario de horas</h2>
          <p className="text-sm text-white/60">
            Revisa cuántas horas se han planificado cada día y el detalle de los turnos asociados.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
          {entries.length} {entries.length === 1 ? "día" : "días"}
        </span>
      </header>

      <div className="mt-6 space-y-4">
        {entries.map((entry) => {
          const totalLabel = toHoursLabel(entry.totalMinutes)
          const formattedDate = format(new Date(entry.date), "EEEE d 'de' MMMM", { locale: es })
          return (
            <article
              key={entry.date}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-blue-500/10"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{formattedDate}</p>
                  <p className="text-xs text-white/60">{entry.shifts.length} {entry.shifts.length === 1 ? "turno" : "turnos"}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                  <span aria-hidden>⏳</span>
                  {totalLabel}
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {entry.shifts.map((shift) => {
                  const rangeLabel = shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : "Todo el día"
                  const durationLabel = toHoursLabel(shift.durationMinutes)
                  const fallbackLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
                  return (
                    <li
                      key={`${entry.date}-${shift.id}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/80"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{fallbackLabel}</p>
                          <p className="text-xs text-white/60">{rangeLabel}</p>
                        </div>
                        <div className="flex flex-col items-start gap-1 text-xs text-white/60 sm:items-end">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                            ⏱️ {durationLabel}
                          </span>
                          {shift.note && <span className="text-[11px] text-white/50">{shift.note}</span>}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default DailyHoursSummary
