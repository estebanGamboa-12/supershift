"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, CalendarDays, Check, Sparkles, X } from "lucide-react"
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
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
import { formatCompactDate, formatCompactMonth } from "@/lib/formatDate"

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
  startTime: string | null
  endTime: string | null
}

const SHIFT_TYPES: { value: ShiftType; label: string; defaultColor: string }[] = [
  { value: "WORK", label: "Día", defaultColor: "#3b82f6" },
  { value: "NIGHT", label: "Noche", defaultColor: "#a855f7" },
  { value: "REST", label: "Descanso", defaultColor: "#94a3b8" },
  { value: "VACATION", label: "Vacaciones", defaultColor: "#22c55e" },
  { value: "CUSTOM", label: "Personalizado", defaultColor: "#0ea5e9" },
]

const SHIFT_ABBREVIATIONS: Record<ShiftType, string> = {
  WORK: "Tra",
  REST: "Des",
  NIGHT: "Noc",
  VACATION: "Vac",
  CUSTOM: "Per",
}

const SHIFT_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const DEFAULT_PLANNER_START_TIME = "09:00"
const DEFAULT_PLANNER_END_TIME = "17:00"

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

type ToastType = "success" | "error"

type ToastMessage = {
  id: number
  type: ToastType
  message: string
}

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

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) {
    return null
  }

  const [hoursPart, minutesPart] = value.split(":")
  const hours = Number.parseInt(hoursPart ?? "", 10)
  const minutes = Number.parseInt(minutesPart ?? "", 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function getShiftDuration(
  startTime?: string | null,
  endTime?: string | null,
): { minutes: number; crossesMidnight: boolean } {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)

  if (startMinutes === null || endMinutes === null) {
    return { minutes: 0, crossesMidnight: false }
  }

  if (endMinutes >= startMinutes) {
    return { minutes: endMinutes - startMinutes, crossesMidnight: false }
  }

  const minutesUntilMidnight = 24 * 60 - startMinutes
  return { minutes: minutesUntilMidnight + endMinutes, crossesMidnight: true }
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
    startTime: day.startTime ?? null,
    endTime: day.endTime ?? null,
  }
}

function buildEntriesMap(days: ManualRotationDay[] = []): Record<string, PlannerEntry> {
  return days.reduce<Record<string, PlannerEntry>>((acc, day) => {
    acc[day.date] = toPlannerEntry(day)
    return acc
  }, {})
}

export default function ShiftPlannerLab({
  initialEntries,
  onCommit,
  isCommitting = false,
  errorMessage = null,
  resetSignal,
}: ShiftPlannerLabProps) {
  const stableInitialEntries = useMemo(
    () => initialEntries ?? [],
    [initialEntries],
  )
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [entries, setEntries] = useState<Record<string, PlannerEntry>>(() =>
    buildEntriesMap(stableInitialEntries),
  )
  const [mode, setMode] = useState<Mode>("manual")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [rotationPattern, setRotationPattern] = useState<[number, number]>(
    ROTATION_PATTERNS[0]?.cycle ?? [4, 2],
  )
  const [rotationStart, setRotationStart] = useState(() => toIsoDate(new Date()))
  const [isConfirmingRotation, setIsConfirmingRotation] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastTimeoutsRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    setEntries(buildEntriesMap(stableInitialEntries))
    setSelectedDate(null)
  }, [stableInitialEntries])

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
        startTime: entry.startTime ?? DEFAULT_PLANNER_START_TIME,
        endTime: entry.endTime ?? DEFAULT_PLANNER_END_TIME,
        ...(entry.note ? { note: entry.note } : {}),
        ...(entry.color ? { color: entry.color } : {}),
        ...(entry.label ? { label: entry.label } : {}),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    void Promise.resolve().then(() => callback(payload))
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

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timeout = toastTimeoutsRef.current.get(id)
    if (timeout !== undefined) {
      window.clearTimeout(timeout)
      toastTimeoutsRef.current.delete(id)
    }
  }, [])

  const pushToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message }])

      const timeout = window.setTimeout(() => {
        removeToast(id)
      }, 4000)

      toastTimeoutsRef.current.set(id, timeout)
    },
    [removeToast],
  )

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current
    return () => {
      timeouts.forEach((timeout) => {
        window.clearTimeout(timeout)
      })
      timeouts.clear()
    }
  }, [])

  useEffect(() => {
    setIsConfirmingRotation(false)
  }, [rotationPattern, rotationStart])

  const getCalendarConfigForMonth = useCallback((month: Date) => {
    const monthStart = startOfMonth(month)
    const daysInMonth = getDaysInMonth(month)
    const days = Array.from({ length: daysInMonth }, (_, index) => addDays(monthStart, index))
    const weekday = getDay(monthStart)
    const firstColumn = ((weekday + 6) % 7) + 1
    return { days, firstColumn }
  }, [])

  const calendarConfig = useMemo(
    () => getCalendarConfigForMonth(currentMonth),
    [currentMonth, getCalendarConfigForMonth],
  )

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
    () => formatCompactMonth(currentMonth),
    [currentMonth],
  )

  const rotationTargetMonth = useMemo(() => {
    const parsed = parseISO(rotationStart)
    if (Number.isNaN(parsed.getTime())) {
      return startOfMonth(currentMonth)
    }

    return startOfMonth(parsed)
  }, [currentMonth, rotationStart])

  const rotationTargetMonthLabel = useMemo(
    () => formatCompactMonth(rotationTargetMonth),
    [rotationTargetMonth],
  )

  const monthHasEntries = useMemo(() => {
    const monthStart = rotationTargetMonth
    const monthEnd = endOfMonth(rotationTargetMonth)

    return Object.values(entries).some((entry) => {
      const entryDate = parseISO(entry.date)
      return entryDate >= monthStart && entryDate <= monthEnd
    })
  }, [entries, rotationTargetMonth])

  const rotationPatternLabel = useMemo(
    () => `${rotationPattern[0]}×${rotationPattern[1]}`,
    [rotationPattern],
  )

  const rotationStartLabel = useMemo(() => {
    const parsed = parseISO(rotationStart)
    if (Number.isNaN(parsed.getTime())) {
      return rotationStart
    }

    return formatCompactDate(parsed, { includeYear: true })
  }, [rotationStart])

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

  const handleApplyRotation = useCallback(() => {
    if (!rotationPattern?.length || rotationPattern.some((value) => value <= 0)) {
      pushToast("error", "Selecciona un patrón de rotación válido antes de aplicarlo.")
      return false
    }

    const [workLength, restLength] = rotationPattern
    const parsedStart = parseISO(rotationStart)
    if (Number.isNaN(parsedStart.getTime())) {
      pushToast("error", "Introduce una fecha de inicio válida para la rotación.")
      return false
    }

    const targetMonth = rotationTargetMonth
    const monthStart = startOfMonth(targetMonth)
    const monthEnd = endOfMonth(targetMonth)

    updateEntries((prev) => {
      const updates: Record<string, PlannerEntry> = {}
      const cycleLength = workLength + restLength
      let pointer = monthStart

      while (pointer <= monthEnd) {
        const iso = toIsoDate(pointer)
        const diff = differenceInCalendarDays(pointer, parsedStart)
        const normalized = ((diff % cycleLength) + cycleLength) % cycleLength
        const shiftType: ShiftType = normalized < workLength ? "WORK" : "REST"
        const existing = prev[iso]
        const palette =
          SHIFT_TYPES.find(({ value }) => value === shiftType)?.defaultColor ??
          (shiftType === "REST" ? "#64748b" : "#2563eb")

        updates[iso] = {
          date: iso,
          type: shiftType,
          note: "",
          color: palette,
          label: SHIFT_LABELS[shiftType],
          pluses: { ...INITIAL_PLUSES },
          startTime: existing?.startTime ?? DEFAULT_PLANNER_START_TIME,
          endTime: existing?.endTime ?? DEFAULT_PLANNER_END_TIME,
        }

        pointer = addDays(pointer, 1)
      }

      return {
        ...prev,
        ...updates,
      }
    })

    setCurrentMonth(monthStart)
    pushToast(
      "success",
      monthHasEntries
        ? `La rotación anterior se reemplazó con el nuevo patrón en ${rotationTargetMonthLabel}.`
        : `La rotación se aplicó correctamente en ${rotationTargetMonthLabel}.`,
    )
    return true
  }, [
    monthHasEntries,
    pushToast,
    rotationPattern,
    rotationStart,
    rotationTargetMonth,
    rotationTargetMonthLabel,
    updateEntries,
  ])

  function confirmApplyRotation() {
    if (monthHasEntries && typeof window !== "undefined") {
      const shouldOverwrite = window.confirm(
        `Ya existe una rotación aplicada en ${rotationTargetMonthLabel}. ¿Quieres reemplazarla con el nuevo patrón?`,
      )

      if (!shouldOverwrite) {
        return
      }
    }

    const applied = handleApplyRotation()
    if (applied) {
      setIsConfirmingRotation(false)
    }
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
      display: formatCompactDate(baseDate, { includeYear: true }),
      type: baseType,
      note: existing?.note ?? "",
      color: palette,
      label: existing?.label ?? SHIFT_LABELS[baseType],
      pluses: existing?.pluses ? { ...existing.pluses } : { ...INITIAL_PLUSES },
      startTime: existing?.startTime ?? DEFAULT_PLANNER_START_TIME,
      endTime: existing?.endTime ?? DEFAULT_PLANNER_END_TIME,
    }
  }, [selectedDate, activeEntry])
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 text-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.95)] lg:rounded-3xl lg:border-white/15 lg:shadow-[0_50px_120px_-40px_rgba(59,130,246,0.25),0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_55%)] lg:bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.22),transparent_50%),_radial-gradient(circle_at_80%_100%,rgba(139,92,246,0.18),transparent_50%)]" />
      <div className="relative flex flex-col gap-6 p-0 sm:p-6 lg:gap-8 lg:p-8">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 backdrop-blur-xl lg:space-y-4 lg:rounded-3xl lg:border-white/10 lg:bg-white/[0.07] lg:p-5">
          <header className="border-b border-white/10 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Plan mensual</p>
                <span className="hidden text-white/30 sm:inline">·</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-200"
                    aria-label="Mes anterior"
                  >
                    <span className="text-base leading-none">‹</span>
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-200"
                    aria-label="Mes siguiente"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="text-base leading-none">›</span>
                  </button>
                </div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={monthLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-lg font-semibold text-white"
                >
                  {monthLabel}
                </motion.p>
              </AnimatePresence>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2 text-xs sm:grid-cols-4 sm:p-3">
            <div>
              <p className="uppercase tracking-wide text-[10px] text-white/40">Días trabajados</p>
              <p className="text-lg font-semibold text-emerald-300 sm:text-xl">{stats.worked}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${progressWorked}%` }} />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-wide text-[10px] text-white/40">Días descanso</p>
              <p className="text-lg font-semibold text-sky-300 sm:text-xl">{stats.rested}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-sky-400" style={{ width: `${progressRested}%` }} />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-wide text-[10px] text-white/40">Total pluses (niveles)</p>
              <p className="text-lg font-semibold text-fuchsia-300 sm:text-xl">{stats.totalPluses}</p>
              <p className="text-[9px] uppercase tracking-wider text-white/30">{stats.totalPluses * 12} niv. anuales</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-[10px] text-white/40">Plan actual</p>
              <p className="text-sm text-white/70">{orderedEntries.length} días</p>
              <p className="text-[9px] text-white/30">Rotación + ajustes</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2 text-xs font-semibold uppercase tracking-wider text-white/60 sm:p-2.5">
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
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs text-white/70 sm:p-4">
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
                {isConfirmingRotation ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 p-4 text-left text-xs text-white/70 shadow-lg shadow-slate-950/40"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_55%),_radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),transparent_60%)]" />
                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">Aplicar nueva rotación</p>
                          <p className="text-xs text-white/70">
                            {monthHasEntries
                              ? `Se reemplazarán los turnos configurados en ${rotationTargetMonthLabel} por el nuevo patrón seleccionado.`
                              : "Confirma si quieres aplicar el patrón seleccionado sobre el calendario mostrado."}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <Sparkles className="mt-1 h-4 w-4 text-sky-300" />
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-white/40">Patrón</p>
                            <p className="text-sm font-semibold text-white">{rotationPatternLabel}</p>
                            <p className="text-[10px] text-white/50">
                              {rotationPattern[0]} días de trabajo · {rotationPattern[1]} de descanso
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CalendarDays className="mt-1 h-4 w-4 text-fuchsia-300" />
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wide text-white/40">Inicio</p>
                            <p className="text-sm font-semibold text-white">{rotationStartLabel}</p>
                            <p className="text-[10px] text-white/50">Se aplicará al mes de {rotationTargetMonthLabel}.</p>
                          </div>
                        </div>
                      </div>

                      {monthHasEntries ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            Se sustituirán los turnos existentes en {rotationTargetMonthLabel}.
                          </span>
                        </div>
                      ) : null}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={confirmApplyRotation}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-950 shadow shadow-emerald-500/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-slate-950"
                        >
                          <Check className="h-4 w-4" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingRotation(false)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-slate-950"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingRotation(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-fuchsia-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/30 transition hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    <Sparkles className="h-4 w-4" />
                    Aplicar patrón
                  </button>
                )}
              </label>
              <p className="text-[11px] text-white/50">Usa el patrón como base y edita manualmente los días que necesites.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-white/70 sm:p-4">
              <p>
                Pulsa cualquier día del calendario para asignar turno, color, notas y pluses personalizados. Puedes copiar el patrón automático y luego afinar turno por turno.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/50 p-1.5 sm:p-2 lg:bg-slate-950/60 lg:px-3 lg:py-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 transition hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-200 sm:h-9 sm:w-9"
              aria-label="Mes anterior"
            >
              <span className="text-lg font-bold leading-none">‹</span>
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:border-sky-400/60 hover:bg-sky-500/15 sm:inline-flex"
              >
                Ant.
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="rounded-full border border-sky-500/70 bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-400 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:border-sky-400/60 hover:bg-sky-500/15 sm:inline-flex"
              >
                Sig.
              </button>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`calendar-${monthLabel}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-xs font-semibold text-sky-200 sm:text-sm lg:text-base"
                >
                  {monthLabel}
                </motion.p>
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 transition hover:border-sky-400/60 hover:bg-sky-500/15 hover:text-sky-200 sm:h-9 sm:w-9"
              aria-label="Mes siguiente"
            >
              <span className="text-lg font-bold leading-none">›</span>
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10 bg-slate-950/50 lg:rounded-3xl lg:border-white/15 lg:bg-slate-950/60 lg:shadow-inner lg:shadow-black/20">
            <div className="min-w-[280px] sm:min-w-[340px]">
              <div className="grid grid-cols-7 gap-1 border-b border-white/5 bg-slate-950/40 px-1.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/60 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[10px]">
                {Array.from({ length: 7 }).map((_, index) => {
                  const reference = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index)
                  return (
                    <div key={index} className="rounded bg-slate-900/50 py-1 text-center text-white/70 sm:py-1.5">
                      {format(reference, "EEE", { locale: es })}
                    </div>
                  )
                })}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={monthLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="grid grid-cols-7 gap-1 bg-transparent px-1.5 pb-1.5 pt-1.5 sm:gap-1.5 sm:px-2 sm:pb-2 sm:pt-2"
                >
                  {calendarConfig.days.map((day, index) => {
                    const key = toIsoDate(day)
                    const entry = entries[key]
                    const isCurrent = isSameMonth(day, currentMonth)
                    const isCurrentDay = isToday(day)
                    const accentColor = entry
                      ? entry.color ||
                        SHIFT_TYPES.find(({ value }) => value === entry.type)?.defaultColor ||
                        "#2563eb"
                      : "#2563eb"
                    const fullLabel = entry ? entry.label || SHIFT_LABELS[entry.type] : ""
                    const compactLabel = entry
                      ? (entry.label ? entry.label.slice(0, 3) : SHIFT_ABBREVIATIONS[entry.type])
                      : ""
                    const style: CSSProperties | undefined =
                      index === 0 ? { gridColumnStart: calendarConfig.firstColumn } : undefined
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openEditor(day)}
                        style={style}
                        className={`group relative flex min-h-[52px] flex-col gap-0.5 rounded-lg border border-transparent p-1.5 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:min-h-[56px] sm:p-2 ${
                          isCurrent ? "text-white/90" : "text-white/40"
                        } ${
                          entry
                            ? "bg-slate-950/80 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-sky-400/50 hover:ring-1 hover:ring-sky-400/30 hover:shadow-md hover:shadow-sky-500/10 active:scale-[0.99]"
                            : "bg-slate-950/40 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-900/70 hover:border-white/10 hover:ring-1 hover:ring-sky-400/20 hover:shadow-sm active:scale-[0.99]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors sm:h-6 sm:w-6 sm:text-xs ${
                            isCurrentDay
                              ? "bg-sky-500 text-white shadow-md shadow-sky-500/50 ring-2 ring-sky-400/40"
                              : "bg-white/10 text-white/60 group-hover:bg-white/15"
                          } group-active:bg-sky-500/80 group-active:text-white`}
                        >
                          {format(day, "d")}
                        </span>
                        {entry ? (
                          <motion.span
                            whileHover={{ scale: 1.03, boxShadow: `0 0 12px ${accentColor}44` }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 320, damping: 20 }}
                            className="mt-0.5 inline-flex min-h-[1.25rem] w-full items-center justify-center rounded border border-white/10 px-1.5 py-0.5 text-center text-[9px] font-semibold capitalize leading-tight text-white sm:min-h-[1.375rem] sm:text-[10px]"
                            style={{
                              backgroundColor: `${accentColor}28`,
                              color: accentColor,
                              transformOrigin: "center",
                            }}
                          >
                            <span className="whitespace-nowrap capitalize sm:hidden">{compactLabel}</span>
                            <span className="hidden whitespace-nowrap sm:inline">{fullLabel}</span>
                          </motion.span>
                        ) : (
                          <>
                            <span className="sr-only">Añadir turno</span>
                            <span className="pointer-events-none absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-white/15 bg-white/5 text-[9px] font-semibold text-white/40 opacity-0 transition group-hover:border-sky-400/50 group-hover:opacity-100 group-hover:text-sky-200 group-hover:bg-sky-500/20 group-active:opacity-100 sm:right-1.5 sm:top-1.5 sm:h-5 sm:w-5">
                              +
                            </span>
                          </>
                        )}
                        {entry?.note ? (
                          <span className="mt-0.5 line-clamp-1 text-[8px] text-white/50 sm:text-[9px]">{entry.note}</span>
                        ) : null}
                        {entry && sumPluses(entry.pluses) > 0 ? (
                          <span className="mt-0.5 text-[8px] font-medium text-emerald-200 sm:text-[9px]">{sumPluses(entry.pluses)} niv.</span>
                        ) : null}
                      </button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
              <div className="hidden border-t border-white/5 bg-slate-950/50 px-2 py-2 lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-3 lg:px-4 lg:py-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Tipos:</span>
                {SHIFT_TYPES.map(({ value, label, defaultColor }) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-[10px] font-medium text-white/80"
                    style={{ backgroundColor: `${defaultColor}18`, color: defaultColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: defaultColor }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/70 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-emerald-200">
            {isCommitting ? "Guardando cambios en tu calendario..." : "Cambios guardados automáticamente"}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                role={toast.type === "error" ? "alert" : "status"}
                className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
                  toast.type === "success"
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400/60 bg-rose-500/10 text-rose-100"
                }`}
              >
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="mx-3 flex w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-3 text-white shadow-[0_40px_70px_-30px_rgba(14,165,233,0.5)] sm:max-w-md sm:p-4"
              style={{ maxHeight: "min(90vh, 520px)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Editar turno</p>
                  <h3 className="mt-1 text-lg font-semibold truncate">{editorDefaults.display}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:border-sky-400/40 hover:text-sky-200"
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
                    startTime: data.startTime,
                    endTime: data.endTime,
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
    startTime: string | null
    endTime: string | null
  }
  onSave: (entry: {
    type: ShiftType
    note: string
    color: string
    label: string
    pluses: PlannerPluses
    startTime: string | null
    endTime: string | null
  }) => void
  onRemove: () => void
}

function EditorForm({ defaults, onSave, onRemove }: EditorFormProps) {
  const [type, setType] = useState<ShiftType>(defaults.type)
  const [note, setNote] = useState(defaults.note)
  const [color, setColor] = useState(defaults.color)
  const [label, setLabel] = useState(defaults.label)
  const [startTime, setStartTime] = useState(defaults.startTime ?? "")
  const [endTime, setEndTime] = useState(defaults.endTime ?? "")
  const [pluses, setPluses] = useState<PlannerPluses>({ ...defaults.pluses })

  useEffect(() => {
    setType(defaults.type)
    setNote(defaults.note)
    setColor(defaults.color)
    setLabel(defaults.label)
    setStartTime(defaults.startTime ?? "")
    setEndTime(defaults.endTime ?? "")
    setPluses({ ...defaults.pluses })
  }, [defaults])

  const trimmedStartTime = startTime.trim()
  const trimmedEndTime = endTime.trim()
  const hasStartTime = trimmedStartTime.length > 0
  const hasEndTime = trimmedEndTime.length > 0
  const hasCompleteRange = hasStartTime && hasEndTime
  const effectiveStartTime = hasStartTime
    ? trimmedStartTime
    : DEFAULT_PLANNER_START_TIME
  const effectiveEndTime = hasEndTime
    ? trimmedEndTime
    : DEFAULT_PLANNER_END_TIME
  const { minutes: totalMinutes, crossesMidnight } = useMemo(
    () => getShiftDuration(effectiveStartTime, effectiveEndTime),
    [effectiveEndTime, effectiveStartTime],
  )
  const formattedDuration = `${Math.floor(totalMinutes / 60)}h ${String(
    totalMinutes % 60,
  ).padStart(2, "0")}m`
  const usingFallbackTimes = !hasCompleteRange

  return (
    <form
      className="mt-3 space-y-3 pb-2"
      onSubmit={(event) => {
        event.preventDefault()
          onSave({
            type,
            note: note.trim(),
            color,
            label: label.trim().length > 0 ? label.trim() : SHIFT_LABELS[type],
            pluses,
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
          })
        }}
    >
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/40">Tipo de turno</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
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
                className={`rounded-xl border px-2 py-1.5 text-left text-xs font-semibold transition ${type === option.value ? "border-white/80 bg-white/10" : "border-white/10 bg-white/5 hover:border-sky-400/40"}`}
                style={{ color: option.defaultColor }}
              >
                {SHIFT_LABELS[option.value]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-white/70">
            Texto del turno
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
              placeholder="Etiqueta en calendario"
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-white/70">
              Entrada
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-white/70">
              Salida
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40">Horas</p>
            <p className="text-base font-semibold text-white">{formattedDuration}</p>
          </div>
          <p className="text-[10px] text-white/50">
            {usingFallbackTimes
              ? `Por defecto ${DEFAULT_PLANNER_START_TIME}-${DEFAULT_PLANNER_END_TIME}`
              : crossesMidnight
                ? "Termina al día siguiente."
                : "Mismo día."}
          </p>
          <label className="ml-auto flex items-center gap-2 text-[11px] text-white/70">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-7 w-12 rounded-lg border border-white/20 bg-transparent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[11px] text-white/70">
          Nota
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
            placeholder="Incidencias, guardias, recordatorios"
          />
        </label>

        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["night", "Noct."],
              ["holiday", "Fest."],
              ["availability", "Disp."],
              ["other", "Extra"],
            ] as const
          ).map(([key, shortLabel]) => (
            <label key={key} className="flex flex-col gap-0.5 text-[10px] text-white/70">
              {shortLabel}
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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
        >
          Borrar día
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setType(defaults.type)
              setNote(defaults.note)
              setColor(defaults.color)
              setLabel(defaults.label)
              setStartTime(defaults.startTime ?? "")
              setEndTime(defaults.endTime ?? "")
              setPluses({ ...defaults.pluses })
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10"
          >
            Restablecer
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110"
          >
            Guardar turno
          </button>
        </div>
      </div>
    </form>
  )
}

