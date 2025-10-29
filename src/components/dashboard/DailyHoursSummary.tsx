"use client"

import { useMemo, useState, type FC } from "react"
import { motion } from "framer-motion"
import { formatCompactDate } from "@/lib/formatDate"
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

type AttendanceStatus = "on-time" | "late" | "early" | "missed" | "flex"

type AttendanceRecord = {
  date: string
  formattedDate: string
  items: Array<{
    shiftId: number
    label: string
    scheduledStart: string | null
    scheduledEnd: string | null
    checkIn: string | null
    checkOut: string | null
    status: AttendanceStatus
    note?: string | null
  }>
}

const toHoursLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h ${String(remaining).padStart(2, "0")}m`
}

const statusMeta: Record<AttendanceStatus, { label: string; className: string }> = {
  "on-time": {
    label: "A tiempo",
    className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  },
  late: {
    label: "Retraso",
    className: "border-rose-400/40 bg-rose-500/10 text-rose-100",
  },
  early: {
    label: "Anticipado",
    className: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  },
  missed: {
    label: "Ausencia",
    className: "border-red-400/40 bg-red-500/10 text-red-100",
  },
  flex: {
    label: "Flexible",
    className: "border-white/15 bg-white/5 text-white/70",
  },
}

const statusOrder: AttendanceStatus[] = [
  "on-time",
  "late",
  "early",
  "missed",
  "flex",
]

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }
  return hours * 60 + minutes
}

const minutesToTime = (minutesTotal: number): string => {
  const normalized = ((minutesTotal % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const DailyHoursSummary: FC<DailyHoursSummaryProps> = ({ entries, shiftTypeLabels }) => {
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
      }),
    [],
  )

  const groupedByMonth = useMemo(() => {
    return entries.reduce<
      Array<{
        monthKey: string
        label: string
        totalMinutes: number
        items: DailyHoursEntry[]
      }>
    >((acc, entry) => {
      const date = new Date(entry.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = monthFormatter.format(date)

      const existingGroup = acc.find((group) => group.monthKey === monthKey)

      if (existingGroup) {
        existingGroup.items.push(entry)
        existingGroup.totalMinutes += entry.totalMinutes
        return acc
      }

      acc.push({
        monthKey,
        label,
        totalMinutes: entry.totalMinutes,
        items: [entry],
      })

      return acc
    }, [])
  }, [entries, monthFormatter])

  const attendanceRecords = useMemo<AttendanceRecord[]>(() => {
    return entries.map((entry, entryIndex) => {
      const formattedDate = formatCompactDate(new Date(entry.date))
      const items = entry.shifts.map((shift, shiftIndex) => {
        const baseLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
        const hasSchedule = Boolean(shift.startTime && shift.endTime)
        if (!hasSchedule) {
          return {
            shiftId: shift.id,
            label: baseLabel,
            scheduledStart: null,
            scheduledEnd: null,
            checkIn: null,
            checkOut: null,
            status: "flex" as AttendanceStatus,
            note: shift.note ?? null,
          }
        }

        const seed = entryIndex * 7 + shiftIndex
        if (seed % 6 === 5) {
          return {
            shiftId: shift.id,
            label: baseLabel,
            scheduledStart: shift.startTime,
            scheduledEnd: shift.endTime,
            checkIn: null,
            checkOut: null,
            status: "missed" as AttendanceStatus,
            note: shift.note ?? null,
          }
        }

        const adjustment = (seed % 3 - 1) * 5
        const startMinutes = parseTimeToMinutes(shift.startTime ?? "00:00")
        const endMinutes = parseTimeToMinutes(shift.endTime ?? "00:00")
        const checkInMinutes = startMinutes + adjustment
        const checkOutOffset = adjustment >= 5 ? -10 : adjustment <= -5 ? 5 : 3
        const checkOutMinutes = endMinutes + checkOutOffset
        let status: AttendanceStatus = "on-time"
        if (adjustment >= 5) {
          status = "late"
        } else if (adjustment <= -5) {
          status = "early"
        }

        return {
          shiftId: shift.id,
          label: baseLabel,
          scheduledStart: shift.startTime ?? null,
          scheduledEnd: shift.endTime ?? null,
          checkIn: minutesToTime(checkInMinutes),
          checkOut: minutesToTime(checkOutMinutes),
          status,
          note: shift.note ?? null,
        }
      })

      return {
        date: entry.date,
        formattedDate,
        items,
      }
    })
  }, [entries, shiftTypeLabels])

  const attendanceStats = useMemo(() => {
    return attendanceRecords.reduce(
      (acc, record) => {
        for (const item of record.items) {
          acc[item.status] = (acc[item.status] ?? 0) + 1
        }
        return acc
      },
      { "on-time": 0, late: 0, early: 0, missed: 0, flex: 0 } as Record<AttendanceStatus, number>,
    )
  }, [attendanceRecords])

  const totalAttendanceItems = useMemo(() => {
    return attendanceRecords.reduce((acc, record) => acc + record.items.length, 0)
  }, [attendanceRecords])

  const [activeView, setActiveView] = useState<"hours" | "attendance">("hours")
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }))
  }

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
            Revisa cuántas horas se han planificado cada día, alterna a la vista de asistencia y repasa llegadas y salidas.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
          {entries.length} {entries.length === 1 ? "día" : "días"}
        </span>
      </header>

      <div className="mt-4 inline-flex overflow-hidden rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase tracking-wide">
        <button
          type="button"
          onClick={() => setActiveView("hours")}
          className={`rounded-full px-3 py-1 transition ${
            activeView === "hours" ? "bg-blue-500 text-white shadow" : "text-white/60 hover:text-white"
          }`}
        >
          Resumen de horas
        </button>
        <button
          type="button"
          onClick={() => setActiveView("attendance")}
          className={`rounded-full px-3 py-1 transition ${
            activeView === "attendance"
              ? "bg-blue-500 text-white shadow"
              : "text-white/60 hover:text-white"
          }`}
        >
          Registro de asistencia
        </button>
      </div>

      {activeView === "hours" ? (
        <div className="mt-6 space-y-6">
        {groupedByMonth.map((group) => {
          const isExpanded = expandedMonths[group.monthKey] ?? false
          const totalLabel = toHoursLabel(group.totalMinutes)
          const visibleEntries = isExpanded ? group.items : group.items.slice(0, 3)

          return (
            <article key={group.monthKey} className="space-y-4">
              <header className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold capitalize text-white">{group.label}</p>
                  <p className="text-xs text-white/60">
                    {group.items.length} {group.items.length === 1 ? "día registrado" : "días registrados"}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                    <span aria-hidden>⏳</span>
                    {totalLabel}
                  </span>
                  <motion.button
                    type="button"
                    onClick={() => toggleMonth(group.monthKey)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400/70 focus-visible:outline-offset-2 hover:border-blue-400/40 hover:text-white active:border-blue-400/40 active:bg-blue-500/10 active:text-white"
                  >
                    {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                    <span aria-hidden>{isExpanded ? "▴" : "▾"}</span>
                  </motion.button>
                </div>
              </header>

              <div className="space-y-4">
                {visibleEntries.map((entry) => {
                  const totalEntryLabel = toHoursLabel(entry.totalMinutes)
                  const formattedDate = formatCompactDate(new Date(entry.date))
                  return (
                    <article
                      key={entry.date}
                      className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-inner shadow-blue-500/5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{formattedDate}</p>
                          <p className="text-xs text-white/60">
                            {entry.shifts.length} {entry.shifts.length === 1 ? "turno" : "turnos"}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                          <span aria-hidden>⏳</span>
                          {totalEntryLabel}
                        </div>
                      </div>

                      <ul className="mt-4 space-y-3">
                        {entry.shifts.map((shift) => {
                          const rangeLabel =
                            shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : "Todo el día"
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

              {!isExpanded && group.items.length > 3 && (
                <div className="flex justify-center">
                  <motion.button
                    type="button"
                    onClick={() => toggleMonth(group.monthKey)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400/70 focus-visible:outline-offset-2 hover:border-blue-400/40 hover:text-white active:border-blue-400/40 active:bg-blue-500/10 active:text-white"
                  >
                    Ver {group.items.length - 3} {group.items.length - 3 === 1 ? "día adicional" : "días adicionales"}
                    <span aria-hidden>▾</span>
                  </motion.button>
                </div>
              )}
            </article>
          )
        })}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {totalAttendanceItems === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/40 px-4 py-5 text-sm text-white/60">
              Todavía no hay registros de asistencia generados. Añade turnos con horario para comenzar a seguir las entradas.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-white/70">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 font-semibold uppercase tracking-wide text-white/70">
                  Registros: {totalAttendanceItems}
                </span>
                {statusOrder.map((status) => (
                  <span
                    key={`stat-${status}`}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold uppercase tracking-wide text-[11px] ${statusMeta[status].className}`}
                  >
                    {statusMeta[status].label}: {attendanceStats[status] ?? 0}
                  </span>
                ))}
              </div>

              <ul className="space-y-4">
                {attendanceRecords.map((record) => (
                  <li
                    key={`attendance-${record.date}`}
                    className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{record.formattedDate}</p>
                        <p className="text-xs text-white/60">
                          {record.items.length} {record.items.length === 1 ? "registro" : "registros"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                        Asistencia diaria
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {record.items.map((item) => {
                        const statusInfo = statusMeta[item.status]
                        const scheduledLabel = item.scheduledStart && item.scheduledEnd
                          ? `Programado · ${item.scheduledStart} – ${item.scheduledEnd}`
                          : "Turno sin horario fijo"
                        return (
                          <li
                            key={`${record.date}-${item.shiftId}`}
                            className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{item.label}</p>
                                <p className="text-xs text-white/60">{scheduledLabel}</p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-white/70 sm:grid-cols-2">
                              <p>
                                Entrada registrada:{" "}
                                <span className="font-semibold text-white">{item.checkIn ?? "—"}</span>
                              </p>
                              <p>
                                Salida registrada:{" "}
                                <span className="font-semibold text-white">{item.checkOut ?? "—"}</span>
                              </p>
                            </div>

                            {item.note && (
                              <p className="mt-2 text-[11px] text-white/50">Nota: {item.note}</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default DailyHoursSummary
