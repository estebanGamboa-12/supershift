"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"
import type { ShiftType } from "@/types/shifts"

type PlannerPluses = {
  night: number
  holiday: number
  availability: number
  other: number
}

type PlannerEntry = {
  date: string
  type: ShiftType
  note: string
  color: string
  label: string
  pluses: PlannerPluses
}

const SHIFT_TYPES: { value: ShiftType; label: string; defaultColor: string }[] = [
  { value: "WORK", label: "Día", defaultColor: "#2563eb" },
  { value: "NIGHT", label: "Noche", defaultColor: "#7c3aed" },
  { value: "REST", label: "Descanso", defaultColor: "#64748b" },
  { value: "VACATION", label: "Vacaciones", defaultColor: "#f97316" },
  { value: "CUSTOM", label: "Personalizado", defaultColor: "#0ea5e9" },
]

const SHIFT_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const WORKLIKE_TYPES: ShiftType[] = ["WORK", "NIGHT", "CUSTOM"]
const RESTLIKE_TYPES: ShiftType[] = ["REST", "VACATION"]

const INITIAL_PLUSES: PlannerPluses = {
  night: 0,
  holiday: 0,
  availability: 0,
  other: 0,
}

const ROTATION_PATTERNS: { label: string; cycle: [number, number] }[] = [
  { label: "4x2", cycle: [4, 2] },
  { label: "5x3", cycle: [5, 3] },
  { label: "6x3", cycle: [6, 3] },
  { label: "7x7", cycle: [7, 7] },
]

type Mode = "manual" | "rotation"

type ShiftPlannerLabProps = {
  initialEntries?: ManualRotationDay[]
  onCommit?: (days: ManualRotationDay[]) => Promise<void> | void
  isCommitting?: boolean
  errorMessage?: string | null
  resetSignal?: number
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function ensureNumber(value: string): number {
  const normalized = value.replace(/,/g, "").trim()
  const parsed = Number.parseInt(normalized, 10)
  if (Number.isNaN(parsed)) {
    return 0
  }
  return Math.max(0, Math.min(3, parsed))
}

function sumPluses(pluses: PlannerPluses): number {
  return (
    pluses.night + pluses.holiday + pluses.availability + pluses.other
  )
}

function normalizePluses(pluses?: ManualRotationDay["pluses"]): PlannerPluses {
  if (!pluses) {
    return { ...INITIAL_PLUSES }
  }
  return {
    night: pluses.night ?? 0,
    holiday: pluses.holiday ?? 0,
    availability: pluses.availability ?? 0,
    other: pluses.other ?? 0,
  }
}

function toPlannerEntry(day: ManualRotationDay): PlannerEntry {
  return {
    date: day.date,
    type: day.type,
    note: day.note ?? "",
    color: day.color ?? "",
    label: day.label ?? SHIFT_LABELS[day.type],
    pluses: normalizePluses(day.pluses),
  }
}

function buildEntriesMap(days: ManualRotationDay[] = []): Record<string, PlannerEntry> {
  return days.reduce<Record<string, PlannerEntry>>((acc, day) => {
    acc[day.date] = toPlannerEntry(day)
    return acc
  }, {})
}

export default function ShiftPlannerLab({
  initialEntries = [],
  onCommit,
  isCommitting = false,
  errorMessage = null,
  resetSignal,
}: ShiftPlannerLabProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [entries, setEntries] = useState<Record<string, PlannerEntry>>(() =>
    buildEntriesMap(initialEntries),
  )
  const [mode, setMode] = useState<Mode>("manual")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [rotationPattern, setRotationPattern] = useState<[number, number]>(
    ROTATION_PATTERNS[0]?.cycle ?? [4, 2],
  )
  const [rotationStart, setRotationStart] = useState(() => toIsoDate(new Date()))

  useEffect(() => {
    setEntries(buildEntriesMap(initialEntries))
    setSelectedDate(null)
  }, [initialEntries])

  useEffect(() => {
    setSelectedDate(null)
  }, [resetSignal])

  const onCommitRef = useRef(onCommit)

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  const commitEntries = useCallback((map: Record<string, PlannerEntry>) => {
    const callback = onCommitRef.current
    if (!callback) {
      return
    }

    const payload: ManualRotationDay[] = Object.values(map)
      .map((entry) => ({
        date: entry.date,
        type: entry.type,
        pluses: { ...entry.pluses },
        ...(entry.note ? { note: entry.note } : {}),
        ...(entry.color ? { color: entry.color } : {}),
        ...(entry.label ? { label: entry.label } : {}),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    void Promise.resolve(callback(payload))
  }, [])

  const updateEntries = useCallback(
    (updater: (previous: Record<string, PlannerEntry>) => Record<string, PlannerEntry>) => {
      setEntries((previous) => {
        const next = updater(previous)
        commitEntries(next)
        return next
      })
    },
    [commitEntries],
  )

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index))
  }, [currentMonth])

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth],
  )

  const orderedEntries = useMemo(() => {
    return Object.values(entries).sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  const stats = useMemo(() => {
    const summary = {
      worked: 0,
      rested: 0,
      totalPluses: 0,
      pluses: { ...INITIAL_PLUSES },
      byType: Object.fromEntries(
        SHIFT_TYPES.map(({ value }) => [value, 0]),
      ) as Record<ShiftType, number>,
    }

    for (const entry of orderedEntries) {
      if (WORKLIKE_TYPES.includes(entry.type)) {
        summary.worked += 1
      }
      if (RESTLIKE_TYPES.includes(entry.type)) {
        summary.rested += 1
      }
      summary.byType[entry.type] += 1
      summary.totalPluses += sumPluses(entry.pluses)
      summary.pluses.night += entry.pluses.night
      summary.pluses.holiday += entry.pluses.holiday
      summary.pluses.availability += entry.pluses.availability
      summary.pluses.other += entry.pluses.other
    }

    return summary
  }, [orderedEntries])

  const monthLabel = useMemo(
    () => format(currentMonth, "MMMM yyyy", { locale: es }),
    [currentMonth],
  )

  const progressWorked = monthDays.length
    ? Math.min(100, Math.round((stats.worked / monthDays.length) * 100))
    : 0
  const progressRested = monthDays.length
    ? Math.min(100, Math.round((stats.rested / monthDays.length) * 100))
    : 0

  function handlePrevMonth() {
    setCurrentMonth((month) => subMonths(month, 1))
  }

  function handleNextMonth() {
    setCurrentMonth((month) => addMonths(month, 1))
  }

  function handleGoToday() {
    const today = startOfMonth(new Date())
    setCurrentMonth(today)
  }

  function openEditor(day: Date) {
    setSelectedDate(toIsoDate(day))
  }

  function closeEditor() {
    setSelectedDate(null)
  }

  function handleSaveEntry(entry: PlannerEntry) {
    updateEntries((prev) => ({
      ...prev,
      [entry.date]: entry,
    }))
    closeEditor()
  }

  function handleRemoveEntry(date: string) {
    updateEntries((prev) => {
      const next = { ...prev }
      delete next[date]
      return next
    })
    closeEditor()
  }

  function handleApplyRotation() {
    if (!rotationPattern?.length || rotationPattern.some((value) => value <= 0)) {
      return
    }

    const [workLength, restLength] = rotationPattern
    const parsedStart = parseISO(rotationStart)
    if (Number.isNaN(parsedStart.getTime())) {
      return
    }

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    let pointer = parsedStart < monthStart ? monthStart : parsedStart
    let isWork = true
    let remaining = workLength

    updateEntries((prev) => {
      const updates: Record<string, PlannerEntry> = {}

      while (pointer <= monthEnd) {
        const iso = toIsoDate(pointer)
        const existing = prev[iso]
        const shiftType: ShiftType = isWork ? "WORK" : "REST"
        const palette = SHIFT_TYPES.find(({ value }) => value === shiftType)?.defaultColor
        updates[iso] = {
          date: iso,
          type: shiftType,
          note: existing?.note ?? "",
          color: existing?.color ?? palette ?? "#2563eb",
          label: existing?.label ?? SHIFT_LABELS[shiftType],
          pluses: existing?.pluses ? { ...existing.pluses } : { ...INITIAL_PLUSES },
        }

        remaining -= 1
        if (remaining <= 0) {
          isWork = !isWork
          remaining = isWork ? workLength : restLength
        }

        pointer = addDays(pointer, 1)
      }

      return {
        ...prev,
        ...updates,
      }
    })
  }

  function handleExportCSV() {
    if (orderedEntries.length === 0) {
      return
    }

    const header = [
      "Fecha",
      "Tipo",
      "Etiqueta",
      "Color",
      "Nota",
      "Plus nocturnidad",
      "Plus festivo",
      "Disponibilidad",
      "Horas extra",
      "Total plus",
    ]

    const rows = orderedEntries.map((entry) => [
      entry.date,
      SHIFT_LABELS[entry.type],
      entry.label,
      entry.color,
      entry.note.replace(/"/g, '""'),
      String(entry.pluses.night),
      String(entry.pluses.holiday),
      String(entry.pluses.availability),
      String(entry.pluses.other),
      String(sumPluses(entry.pluses)),
    ])

    const csvContent = [header, ...rows]
      .map((columns) =>
        columns
          .map((column) => (column.includes(",") ? `"${column}"` : column))
          .join(","),
      )
      .join("\n")

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `turnos-${format(currentMonth, "yyyy-MM")}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleExportPdf() {
    if (orderedEntries.length === 0) {
      return
    }

    const newWindow = window.open("", "_blank", "width=900,height=700")
    if (!newWindow) {
      return
    }

    const rowsHtml = orderedEntries
      .map((entry) => {
        const total = sumPluses(entry.pluses)
        return `<tr>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.date}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${SHIFT_LABELS[entry.type]}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.label}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.note || "-"}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.pluses.night}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.pluses.holiday}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.pluses.availability}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${entry.pluses.other}</td>
          <td style="padding:8px;border:1px solid #e2e8f0; font-weight:600;">${total}</td>
        </tr>`
      })
      .join("")

    newWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Resumen de turnos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 24px; margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; }
            thead { background-color: #0f172a; color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Resumen de turnos · ${monthLabel}</h1>
          <table>
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #e2e8f0;">Fecha</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Tipo</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Etiqueta</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Nota</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Nocturnidad</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Festivo</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Disponibilidad</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Horas extra</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Total</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`)
    newWindow.document.close()
    newWindow.focus()
    newWindow.print()
  }

  const activeEntry = selectedDate ? entries[selectedDate] : null
  const editorDefaults = useMemo(() => {
    if (!selectedDate) return null

    const baseDate = parseISO(selectedDate)
    if (Number.isNaN(baseDate.getTime())) {
      return null
    }

    const existing = activeEntry
    const baseType = existing?.type ?? "WORK"
    const palette = existing?.color
      ? existing.color
      : SHIFT_TYPES.find(({ value }) => value === baseType)?.defaultColor ?? "#2563eb"

    return {
      date: selectedDate,
      display: format(baseDate, "EEEE d 'de' MMMM yyyy", { locale: es }),
      type: baseType,
      note: existing?.note ?? "",
      color: palette,
      label: existing?.label ?? SHIFT_LABELS[baseType],
      pluses: existing?.pluses ? { ...existing.pluses } : { ...INITIAL_PLUSES },
    }
  }, [selectedDate, activeEntry])
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 text-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_55%)]" />
      <div className="relative grid gap-6 p-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-sky-400/60 hover:text-sky-200"
              >
                Ant.
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="rounded-full border border-sky-500/70 bg-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-sky-400"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-sky-400/60 hover:text-sky-200"
              >
                Sig.
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">{monthLabel}</p>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Plan mensual</p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs sm:grid-cols-4">
            <div>
              <p className="uppercase tracking-wide text-white/40">Días trabajados</p>
              <p className="text-2xl font-semibold text-emerald-300">{stats.worked}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${progressWorked}%` }} />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-wide text-white/40">Días descanso</p>
              <p className="text-2xl font-semibold text-sky-300">{stats.rested}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-sky-400" style={{ width: `${progressRested}%` }} />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-wide text-white/40">Total pluses (niveles)</p>
              <p className="text-2xl font-semibold text-fuchsia-300">{stats.totalPluses}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Equivale a {stats.totalPluses * 12} niveles anuales</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-white/40">Plan actual</p>
              <p className="text-sm text-white/70">{orderedEntries.length} días configurados</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Puedes combinar rotación + ajustes</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-xs font-semibold uppercase tracking-wider text-white/60">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-full px-3 py-1 transition ${mode === "manual" ? "bg-sky-500 text-white shadow shadow-sky-500/30" : "bg-white/5 hover:bg-white/10"}`}
            >
              Modo manual
            </button>
            <button
              type="button"
              onClick={() => setMode("rotation")}
              className={`rounded-full px-3 py-1 transition ${mode === "rotation" ? "bg-sky-500 text-white shadow shadow-sky-500/30" : "bg-white/5 hover:bg-white/10"}`}
            >
              Modo rotación
            </button>
            <span className="ml-auto text-[11px] lowercase text-white/40">Cambia de modo en cualquier momento</span>
          </div>

          {mode === "rotation" ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-white/70">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Patrón automático</p>
              <div className="flex flex-wrap items-center gap-3">
                {ROTATION_PATTERNS.map((pattern) => (
                  <button
                    key={pattern.label}
                    type="button"
                    onClick={() => setRotationPattern(pattern.cycle)}
                    className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition ${rotationPattern[0] === pattern.cycle[0] && rotationPattern[1] === pattern.cycle[1] ? "border-sky-400/70 bg-sky-500/20 text-sky-200" : "border-white/10 bg-white/5 hover:border-sky-400/40 hover:text-sky-200"}`}
                  >
                    {pattern.label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-2 text-xs text-white/70 sm:flex-row sm:items-center">
                <span className="uppercase tracking-wide text-white/40">Inicio</span>
                <input
                  type="date"
                  value={rotationStart}
                  onChange={(event) => setRotationStart(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 sm:max-w-[180px]"
                />
                <button
                  type="button"
                  onClick={handleApplyRotation}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110"
                >
                  Aplicar patrón
                </button>
              </label>
              <p className="text-[11px] text-white/50">Usa el patrón como base y edita manualmente los días que necesites.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/70">
              <p>
                Pulsa cualquier día del calendario para asignar turno, color, notas y pluses personalizados. Puedes copiar el patrón automático y luego afinar turno por turno.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
            <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              {Array.from({ length: 7 }).map((_, index) => {
                const reference = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index)
                return (
                  <div key={index} className="bg-slate-950/40 py-2 text-center">
                    {format(reference, "EEE", { locale: es })}
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-7 grid-rows-6 gap-px bg-slate-900/60">
              {calendarDays.map((day) => {
                const key = toIsoDate(day)
                const entry = entries[key]
                const isCurrent = isSameMonth(day, currentMonth)
                const isCurrentDay = isToday(day)
                const accentColor = entry
                  ? entry.color ||
                    SHIFT_TYPES.find(({ value }) => value === entry.type)?.defaultColor ||
                    "#2563eb"
                  : "#2563eb"

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openEditor(day)}
                    className={`flex flex-col gap-1 rounded-2xl border border-transparent p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${isCurrent ? "text-white/90" : "text-white/40"} ${entry ? "bg-slate-950/80 hover:border-sky-400/40" : "bg-slate-950/40 hover:bg-slate-900/60"}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isCurrentDay ? "bg-sky-500 text-white shadow shadow-sky-500/40" : "bg-white/5 text-white/80"}`}>
                      {format(day, "d")}
                    </span>
                    {entry ? (
                      <span
                        className="mt-1 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                      >
                        {entry.label || SHIFT_LABELS[entry.type]}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-white/30">Configurar</span>
                    )}
                    {entry?.note ? (
                      <span className="line-clamp-2 text-[10px] text-white/50">{entry.note}</span>
                    ) : null}
                    {entry && sumPluses(entry.pluses) > 0 ? (
                      <span className="text-[10px] font-medium text-emerald-200">{sumPluses(entry.pluses)} niveles</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <header>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Resumen mensual</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Control de pluses por nivel</h3>
            </header>

            <div className="space-y-3 text-sm text-white/70">
              <p>
                Total de pluses del mes: <strong className="text-emerald-300">{stats.totalPluses}</strong>
              </p>
              <p className="text-xs text-white/50">Ajusta los niveles por turno para nocturnidad, festivos, disponibilidad y horas extra.</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(stats.pluses) as [keyof PlannerPluses, number][]).map(([key, value]) => {
                const labels: Record<keyof PlannerPluses, string> = {
                  night: "Nocturnidad",
                  holiday: "Festivos",
                  availability: "Disponibilidad",
                  other: "Horas extra",
                }
                const maxValue = Math.max(stats.totalPluses, 1)
                const width = Math.min(100, Math.round((value / maxValue) * 100))
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{labels[key]}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-fuchsia-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 text-xs text-white/40">
              <p className="uppercase tracking-[0.3em]">Distribución de turnos</p>
              <div className="grid gap-2 text-sm">
                {SHIFT_TYPES.map(({ value, label }) => (
                  <div
                    key={value}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SHIFT_TYPES.find((type) => type.value === value)?.defaultColor }} />
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-white">{stats.byType[value] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 text-xs">
              <p className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-center font-semibold uppercase tracking-wide text-emerald-200">
                {isCommitting
                  ? "Guardando cambios en tu calendario..."
                  : "Cambios guardados automáticamente"}
              </p>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={orderedEntries.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={orderedEntries.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Exportar PDF
              </button>
              {errorMessage ? <p className="text-center text-sm text-rose-300">{errorMessage}</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-white/70">
            <p>
              Combina los modos manual y automático para ajustar turnos especiales, vacaciones o guardias. Los cambios se aplican automáticamente sobre tu calendario real y podrás seguir editando desde la vista general.
            </p>
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {editorDefaults ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 text-white shadow-[0_50px_90px_-40px_rgba(14,165,233,0.5)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Editar turno</p>
                  <h3 className="mt-2 text-2xl font-semibold">{editorDefaults.display}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:border-sky-400/40 hover:text-sky-200"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <EditorForm
                defaults={editorDefaults}
                onRemove={() => handleRemoveEntry(editorDefaults.date)}
                onSave={(data) =>
                  handleSaveEntry({
                    date: editorDefaults.date,
                    type: data.type,
                    note: data.note,
                    color: data.color,
                    label: data.label,
                    pluses: data.pluses,
                  })
                }
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}


type EditorFormProps = {
  defaults: {
    date: string
    display: string
    type: ShiftType
    note: string
    color: string
    label: string
    pluses: PlannerPluses
  }
  onSave: (entry: {
    type: ShiftType
    note: string
    color: string
    label: string
    pluses: PlannerPluses
  }) => void
  onRemove: () => void
}

function EditorForm({ defaults, onSave, onRemove }: EditorFormProps) {
  const [type, setType] = useState<ShiftType>(defaults.type)
  const [note, setNote] = useState(defaults.note)
  const [color, setColor] = useState(defaults.color)
  const [label, setLabel] = useState(defaults.label)
  const [pluses, setPluses] = useState<PlannerPluses>({ ...defaults.pluses })

  useEffect(() => {
    setType(defaults.type)
    setNote(defaults.note)
    setColor(defaults.color)
    setLabel(defaults.label)
    setPluses({ ...defaults.pluses })
  }, [defaults])

  return (
    <form
      className="mt-6 space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({
          type,
          note: note.trim(),
          color,
          label: label.trim().length > 0 ? label.trim() : SHIFT_LABELS[type],
          pluses,
        })
      }}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40">Tipo de turno</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SHIFT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setType(option.value)
                  const isUsingDefaultColor =
                    color === defaults.color ||
                    color === SHIFT_TYPES.find((item) => item.value === type)?.defaultColor
                  if (!defaults.color || defaults.type === option.value || isUsingDefaultColor) {
                    setColor(option.defaultColor)
                  }
                  if (
                    label.trim().length === 0 ||
                    label === SHIFT_LABELS[type] ||
                    label === defaults.label
                  ) {
                    setLabel(SHIFT_LABELS[option.value])
                  }
                }}
                className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${type === option.value ? "border-white/80 bg-white/10" : "border-white/10 bg-white/5 hover:border-sky-400/40"}`}
                style={{ color: option.defaultColor }}
              >
                {SHIFT_LABELS[option.value]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-xs text-white/70">
          Texto del turno
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            placeholder="Etiqueta que verás en el calendario"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs text-white/70">
          Color del turno
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 w-20 rounded-xl border border-white/20 bg-transparent"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs text-white/70">
          Nota
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            placeholder="Anota incidencias, guardias o recordatorios"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["night", "Nocturnidad"],
              ["holiday", "Festivo"],
              ["availability", "Disponibilidad"],
              ["other", "Horas extra"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-2 text-xs text-white/70">
              {label}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={3}
                step={1}
                value={pluses[key]}
                onChange={(event) =>
                  setPluses((prev) => ({
                    ...prev,
                    [key]: ensureNumber(event.target.value),
                  }))
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
        >
          Borrar día
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setType(defaults.type)
              setNote(defaults.note)
              setColor(defaults.color)
              setLabel(defaults.label)
              setPluses({ ...defaults.pluses })
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10"
          >
            Restablecer
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110"
          >
            Guardar turno
          </button>
        </div>
      </div>
    </form>
  )
}

