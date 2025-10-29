"use client"

import { useMemo, type FC } from "react"

import { formatMinutesAsDuration, type WeeklyShiftSummary } from "@/lib/shiftStatistics"
import type { ShiftType } from "@/types/shifts"

type WeeklyShiftBalanceCardProps = {
  summaries: WeeklyShiftSummary[]
  shiftTypeLabels: Record<ShiftType, string>
  maxWeeks?: number
}

const formatWeekRange = (summary: WeeklyShiftSummary, formatter: Intl.DateTimeFormat) => {
  const start = formatter.format(new Date(`${summary.weekStart}T00:00:00`))
  const end = formatter.format(new Date(`${summary.weekEnd}T00:00:00`))

  if (start === end) {
    return start
  }

  return `${start} – ${end}`
}

const WeeklyShiftBalanceCard: FC<WeeklyShiftBalanceCardProps> = ({
  summaries,
  shiftTypeLabels,
  maxWeeks = 4,
}) => {
  const weeklySummaries = useMemo(
    () => summaries.slice(0, maxWeeks),
    [summaries, maxWeeks],
  )

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
      }),
    [],
  )

  if (!weeklySummaries.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/5">
        <p className="text-sm font-semibold text-white">Balance semanal de turnos</p>
        <p className="mt-2 text-xs text-white/60">
          Registra turnos con duración para ver la distribución semanal por tipo de turno.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/10">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Balance semanal</p>
          <h3 className="text-xl font-semibold text-white">Distribución de horas por tipo</h3>
        </div>
        <span className="text-xs text-white/50">Últimas {weeklySummaries.length} semanas</span>
      </header>

      <div className="mt-5 space-y-5">
        {weeklySummaries.map((summary) => {
          const rangeLabel = formatWeekRange(summary, dateFormatter)
          const totalDuration = formatMinutesAsDuration(summary.totalMinutes)

          return (
            <article
              key={summary.weekStart}
              className="rounded-xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-blue-500/5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{rangeLabel}</p>
                  <p className="text-xs text-white/60">
                    {summary.shiftCount} {summary.shiftCount === 1 ? "turno" : "turnos"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                  <span aria-hidden>⏱️</span>
                  {totalDuration}
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {summary.typeSummaries.map((typeSummary) => {
                  const width = `${Math.round(typeSummary.percentage)}%`
                  const label = shiftTypeLabels[typeSummary.type] ?? typeSummary.type
                  const durationLabel = formatMinutesAsDuration(typeSummary.totalMinutes)

                  return (
                    <li key={`${summary.weekStart}-${typeSummary.type}`} className="space-y-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <div className="text-xs text-white/60">
                          {durationLabel} · {typeSummary.percentage.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400"
                          style={{ width }}
                          aria-hidden
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default WeeklyShiftBalanceCard
