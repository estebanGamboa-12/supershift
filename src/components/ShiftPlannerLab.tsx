"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import {
  addDays,
  addMonths,
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
import { useShiftTemplates } from "@/lib/useShiftTemplates"
import { useRotationTemplates } from "@/lib/useRotationTemplates"
import type { RotationTemplate, ShiftTemplate } from "@/types/templates"
import { loadUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"
import { isFestiveDate } from "@/lib/festive-dates"
import { getTemplateDefaultPluses } from "@/lib/template-default-pluses"
import { useConfirmDelete } from "@/lib/ConfirmDeleteContext"

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
  userId?: string | null
  shiftTemplates?: ShiftTemplate[]
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd")
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
  userId = null,
  shiftTemplates: shiftTemplatesProp = [],
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
  const [selectedRotationId, setSelectedRotationId] = useState<number | null>(null)
  const [rotationStart, setRotationStart] = useState(() => toIsoDate(new Date()))
  const [isConfirmingRotation, setIsConfirmingRotation] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastTimeoutsRef = useRef<Map<number, number>>(new Map())
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)

  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded?.preferences) {
      setUserPreferences(loaded.preferences)
    }
  }, [])

  const {
    templates: shiftTemplatesFromHook,
    isLoading: isLoadingShiftTemplates,
  } = useShiftTemplates(userId)
  const shiftTemplates = shiftTemplatesProp.length > 0 ? shiftTemplatesProp : shiftTemplatesFromHook
  const {
    templates: rotationTemplates,
    isLoading: isLoadingRotationTemplates,
    error: rotationTemplatesError,
  } = useRotationTemplates(userId)
  const { confirmDelete } = useConfirmDelete()

  // Debug: Log para verificar que las rotaciones se carguen
  useEffect(() => {
    if (userId) {
      console.log("[ShiftPlannerLab] userId:", userId)
      console.log("[ShiftPlannerLab] rotationTemplates count:", rotationTemplates.length)
      console.log("[ShiftPlannerLab] rotationTemplates:", rotationTemplates)
      console.log("[ShiftPlannerLab] isLoadingRotationTemplates:", isLoadingRotationTemplates)
      console.log("[ShiftPlannerLab] rotationTemplatesError:", rotationTemplatesError)
    } else {
      console.warn("[ShiftPlannerLab] ⚠️ No userId provided! Las rotaciones no se cargarán.")
    }
  }, [userId, rotationTemplates, isLoadingRotationTemplates, rotationTemplatesError])

  useEffect(() => {
    if (
      selectedRotationId != null &&
      !rotationTemplates.some((template) => template.id === selectedRotationId)
    ) {
      setSelectedRotationId(null)
    }
  }, [rotationTemplates, selectedRotationId])

  const activeRotationId = useMemo(() => {
    if (selectedRotationId != null) {
      return selectedRotationId
    }
    return rotationTemplates[0]?.id ?? null
  }, [rotationTemplates, selectedRotationId])

  const shiftTemplatesById = useMemo(
    () => new Map<number, ShiftTemplate>(shiftTemplates.map((item) => [item.id, item])),
    [shiftTemplates],
  )

  const selectedRotationTemplate = useMemo<RotationTemplate | null>(() => {
    if (activeRotationId == null) {
      return null
    }
    return rotationTemplates.find((template) => template.id === activeRotationId) ?? null
  }, [activeRotationId, rotationTemplates])

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
  }, [activeRotationId, rotationStart])

  const getCalendarConfigForMonth = useCallback((month: Date) => {
    const monthStart = startOfMonth(month)
    const daysInMonth = getDaysInMonth(month)
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 })
    const weekday = getDay(monthStart)
    const padStart = (weekday + 6) % 7
    const totalCells = Math.ceil((padStart + daysInMonth) / 7) * 7
    const days: Date[] = []
    for (let i = 0; i < totalCells; i++) {
      days.push(addDays(startWeek, i))
    }
    return { days, firstColumn: padStart + 1 }
  }, [])

  const calendarConfig = useMemo(
    () => getCalendarConfigForMonth(currentMonth),
    [currentMonth, getCalendarConfigForMonth],
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

  const monthMoneySummary = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    let totalMinutes = 0
    let extrasEur = 0
    const extras = userPreferences.shiftExtras ?? []
    const plusKeys: (keyof PlannerPluses)[] = ["night", "holiday", "availability", "other"]

    for (const entry of orderedEntries) {
      const d = parseISO(entry.date)
      if (d >= monthStart && d <= monthEnd) {
        const { minutes } = getShiftDuration(entry.startTime, entry.endTime)
        totalMinutes += minutes
        plusKeys.forEach((key, i) => {
          const count = entry.pluses[key] ?? 0
          const extra = extras[i]
          if (extra?.value != null && count > 0) {
            extrasEur += count * extra.value
          }
        })
      }
    }
    const hours = totalMinutes / 60
    const rate = userPreferences.hourlyRate ?? 0
    const baseEur = hours * rate
    const estimatedEur = baseEur + extrasEur
    const h = Math.floor(hours)
    const m = Math.round((hours % 1) * 60)
    const hoursLabel = `${h}h ${String(m).padStart(2, "0")}m`
    return { hoursLabel, extrasEur, estimatedEur }
  }, [orderedEntries, currentMonth, userPreferences.hourlyRate, userPreferences.shiftExtras])

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

  const rotationStartLabel = useMemo(() => {
    const parsed = parseISO(rotationStart)
    if (Number.isNaN(parsed.getTime())) {
      return rotationStart
    }

    return formatCompactDate(parsed, { includeYear: true })
  }, [rotationStart])

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
    if (!selectedRotationTemplate) {
      pushToast("error", "Selecciona una plantilla de rotación antes de aplicarla.")
      return false
    }

    const parsedStart = parseISO(rotationStart)
    if (Number.isNaN(parsedStart.getTime())) {
      pushToast("error", "Introduce una fecha de inicio válida para la rotación.")
      return false
    }

    const cycleLength = selectedRotationTemplate.daysCount
    if (!cycleLength || cycleLength <= 0) {
      pushToast("error", "La plantilla seleccionada no tiene una duración válida.")
      return false
    }

    const missingTemplates = selectedRotationTemplate.assignments
      .filter((assignment) => assignment.shiftTemplateId != null)
      .filter((assignment) => !shiftTemplatesById.has(assignment.shiftTemplateId ?? -1))

    if (missingTemplates.length > 0) {
      pushToast(
        "error",
        "Faltan plantillas de turno necesarias para esta rotación. Crea o recupera las plantillas antes de aplicarla.",
      )
      return false
    }

    // Calcular fecha de fin: fecha de inicio + días del ciclo - 1
    // Ejemplo: si empieza lunes y son 7 días, termina el domingo (lunes + 6 días)
    const rotationEnd = addDays(parsedStart, cycleLength - 1)

    const assignmentsByDay = new Map(
      selectedRotationTemplate.assignments.map((assignment) => [assignment.dayIndex, assignment]),
    )

    updateEntries((prev) => {
      const updates: Record<string, PlannerEntry> = {}
      let pointer = parsedStart
      let dayIndex = 0

      // Solo aplicar durante los días del ciclo, no repetir durante todo el mes
      while (dayIndex < cycleLength && pointer <= rotationEnd) {
        const iso = toIsoDate(pointer)
        const assignment = assignmentsByDay.get(dayIndex)
        const template = assignment?.shiftTemplateId
          ? shiftTemplatesById.get(assignment.shiftTemplateId)
          : null
        const existing = prev[iso]

        if (!assignment || !template) {
          updates[iso] = {
            date: iso,
            type: "REST",
            note: "",
            color: SHIFT_TYPES.find(({ value }) => value === "REST")?.defaultColor ?? "#64748b",
            label: SHIFT_LABELS.REST,
            pluses: { ...INITIAL_PLUSES },
            startTime: existing?.startTime ?? DEFAULT_PLANNER_START_TIME,
            endTime: existing?.endTime ?? DEFAULT_PLANNER_END_TIME,
          }
        } else {
          const defaultPluses = getTemplateDefaultPluses(template.id)
          updates[iso] = {
            date: iso,
            type: "WORK",
            note: "",
            color: template.color ?? SHIFT_TYPES.find(({ value }) => value === "WORK")?.defaultColor ?? "#2563eb",
            label: template.title,
            pluses: defaultPluses
              ? {
                  night: defaultPluses.night ?? 0,
                  holiday: defaultPluses.holiday ?? 0,
                  availability: defaultPluses.availability ?? 0,
                  other: defaultPluses.other ?? 0,
                }
              : { ...INITIAL_PLUSES },
            startTime: template.startTime || existing?.startTime || DEFAULT_PLANNER_START_TIME,
            endTime: template.endTime || existing?.endTime || DEFAULT_PLANNER_END_TIME,
          }
        }

        pointer = addDays(pointer, 1)
        dayIndex++
      }

      return {
        ...prev,
        ...updates,
      }
    })

    // Establecer el mes actual al mes donde empieza la rotación
    const rotationStartMonth = startOfMonth(parsedStart)
    setCurrentMonth(rotationStartMonth)

    const rotationEndLabel = formatCompactDate(rotationEnd, { includeYear: true })
    const rotationStartLabel = formatCompactDate(parsedStart, { includeYear: true })
    
    pushToast(
      "success",
      `La rotación "${selectedRotationTemplate.title}" se aplicó del ${rotationStartLabel} al ${rotationEndLabel} (${cycleLength} días).`,
    )
    return true
  }, [
    pushToast,
    rotationStart,
    selectedRotationTemplate,
    shiftTemplatesById,
    updateEntries,
  ])

  function confirmApplyRotation() {
    if (!selectedRotationTemplate) {
      pushToast("error", "Selecciona una plantilla de rotación antes de aplicarla.")
      return
    }

    if (monthHasEntries && typeof window !== "undefined") {
      const shouldOverwrite = window.confirm(
        `Ya existe una rotación aplicada en ${rotationTargetMonthLabel}. ¿Quieres reemplazarla con "${selectedRotationTemplate.title}"?`,
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
    <>
    <div className="relative text-white">
      <div className="relative flex flex-col gap-2 p-1 sm:p-2">
        <section className="space-y-2">
          {/* Estadísticas compactas */}
          <div className="grid grid-cols-4 gap-1 text-[9px]">
            <div>
              <p className="text-white/40">Trabajados</p>
              <p className="text-xs font-semibold text-white">{stats.worked}</p>
            </div>
            <div>
              <p className="text-white/40">Descanso</p>
              <p className="text-xs font-semibold text-white">{stats.rested}</p>
            </div>
            <div>
              <p className="text-white/40">Pluses</p>
              <p className="text-xs font-semibold text-white">{stats.totalPluses}</p>
            </div>
            <div>
              <p className="text-white/40">Plan</p>
              <p className="text-xs font-semibold text-white">{orderedEntries.length}</p>
            </div>
          </div>
          {/* Mini resumen conversión: horas / extras / estimado € */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] sm:text-[10px]">
            <p className="mb-0.5 font-semibold uppercase tracking-wider text-white/50">Este mes</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="font-semibold text-white">
                Horas: <span className="text-sky-200">{monthMoneySummary.hoursLabel}</span>
              </span>
              <span className="text-white/60">·</span>
              <span className="font-semibold text-white">
                Extras: <span className="text-amber-200">{monthMoneySummary.extrasEur.toFixed(2)}€</span>
              </span>
              <span className="text-white/60">·</span>
              <span className="font-semibold text-white">
                Estimado: <span className="text-emerald-300">{monthMoneySummary.estimatedEur.toFixed(2)}€</span>
              </span>
            </div>
          </div>

          {/* Modos compactos - más grandes en móviles */}
          <div className="flex gap-2 text-xs sm:text-[10px]">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-lg px-3 py-1.5 sm:px-2 sm:py-0.5 font-semibold transition ${mode === "manual" ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"}`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setMode("rotation")}
              className={`rounded-lg px-3 py-1.5 sm:px-2 sm:py-0.5 font-semibold transition ${mode === "rotation" ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"}`}
            >
              Rotación
            </button>
          </div>

          {mode === "rotation" ? (
            <div className="space-y-3 text-xs sm:text-[9px] text-white/70">
              {rotationTemplatesError ? (
                <div className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 sm:px-2 sm:py-1 text-red-300 text-xs sm:text-[9px]">
                  {rotationTemplatesError}
                </div>
              ) : null}
              {!userId ? (
                <div className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-2 sm:px-2 sm:py-1 text-xs sm:text-[9px] text-amber-200">
                  ⚠️ No se ha identificado el usuario. Por favor, inicia sesión.
                </div>
              ) : rotationTemplatesError ? (
                <div className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 sm:px-2 sm:py-1 text-red-300 text-xs sm:text-[9px]">
                  ❌ Error: {rotationTemplatesError}
                </div>
              ) : isLoadingRotationTemplates ? (
                <div className="flex items-center gap-2 text-xs sm:text-[9px]">
                  <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin text-white/60" />
                  Cargando rotaciones...
                </div>
              ) : rotationTemplates.length === 0 ? (
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 sm:px-2 sm:py-1 text-xs sm:text-[9px] text-white/50">
                  <p className="mb-1">Sin rotaciones encontradas.</p>
                  <p className="text-white/40 text-[8px] mb-1">Usuario ID: {userId}</p>
                  <a href="/templates" className="text-sky-400 hover:text-sky-300 underline font-medium">Crea una en plantillas →</a>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] sm:text-[8px] uppercase tracking-wide text-white/40 mb-2">Selecciona una rotación:</p>
                  <div className="flex flex-wrap gap-2 sm:gap-1">
                    {rotationTemplates.map((template) => {
                      const isSelected = selectedRotationTemplate?.id === template.id
                      const assignedCount = template.assignments.filter(
                        (assignment) => assignment.shiftTemplateId != null,
                      ).length
                      const hasAssignments = assignedCount > 0
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedRotationId(template.id)}
                          className={`flex items-center gap-1.5 sm:gap-1 rounded-lg px-3 py-2 sm:px-2 sm:py-1 text-xs sm:text-[9px] font-medium transition ${
                            isSelected
                              ? "bg-sky-500/30 border-2 border-sky-400/50 text-white shadow-md shadow-sky-500/20"
                              : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20"
                          } ${!hasAssignments ? "opacity-60" : ""}`}
                          title={!hasAssignments ? "Esta rotación no tiene turnos asignados" : `${assignedCount} turnos asignados`}
                        >
                          <span className="text-base sm:text-xs">{template.icon ?? "🔄"}</span>
                          <span className="font-semibold">{template.title}</span>
                          {hasAssignments && (
                            <span className="text-[10px] sm:text-[8px] text-white/50">({assignedCount})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {selectedRotationTemplate && (() => {
                    const assignedCount = selectedRotationTemplate.assignments.filter(
                      (assignment) => assignment.shiftTemplateId != null,
                    ).length
                    return (
                      <div className="mt-2 rounded bg-white/5 border border-white/10 px-2 py-1 text-[9px]">
                        <p className="text-white/80 font-medium mb-0.5">
                          {selectedRotationTemplate.icon ?? "🔄"} {selectedRotationTemplate.title}
                        </p>
                        {selectedRotationTemplate.description && (
                          <p className="text-white/50 text-[8px]">{selectedRotationTemplate.description}</p>
                        )}
                        <p className="text-white/40 text-[8px] mt-0.5">
                          {selectedRotationTemplate.daysCount} días • {assignedCount} turnos asignados
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
              {selectedRotationTemplate && (
                <div className="space-y-3 sm:space-y-2">
                  <label className="flex flex-col gap-1.5 sm:gap-1 text-xs sm:text-[9px]">
                    <span className="text-white/70 font-semibold sm:font-medium">Fecha de inicio de la rotación:</span>
                    <input
                      type="date"
                      value={rotationStart}
                      onChange={(event) => setRotationStart(event.target.value)}
                      className="rounded-lg border-2 border-white/20 bg-white/10 px-4 py-3 sm:px-3 sm:py-1.5 text-sm sm:text-[10px] text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 min-h-[44px] sm:min-h-0"
                    />
                  </label>
                  
                  {isConfirmingRotation && selectedRotationTemplate ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg bg-sky-500/20 border border-sky-400/30 px-3 py-2 sm:px-2 sm:py-1.5 space-y-1 sm:space-y-0.5 text-xs sm:text-[9px]"
                    >
                      <p className="text-white font-semibold sm:font-medium">
                        {monthHasEntries
                          ? `⚠️ Reemplazar turnos en ${rotationTargetMonthLabel}`
                          : `✅ Aplicar rotación en ${rotationTargetMonthLabel}`}
                      </p>
                      <p className="text-white/70">
                        {selectedRotationTemplate.title} · Inicio: {rotationStartLabel}
                      </p>
                    </motion.div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingRotation((value) => !value)}
                      disabled={
                        isCommitting ||
                        isLoadingRotationTemplates ||
                        rotationTemplates.length === 0 ||
                        !selectedRotationTemplate ||
                        isLoadingShiftTemplates ||
                        !selectedRotationTemplate.assignments.some(a => a.shiftTemplateId != null)
                      }
                      className={`rounded-lg px-4 py-2.5 sm:px-3 sm:py-1.5 text-xs sm:text-[9px] font-semibold sm:font-medium transition min-h-[44px] sm:min-h-0 ${
                        isConfirmingRotation
                          ? "bg-white/10 text-white border-2 border-white/20"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                      } ${isCommitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isConfirmingRotation ? "✕ Cancelar" : "👁 Previsualizar"}
                    </button>
                    <button
                      type="button"
                      onClick={confirmApplyRotation}
                      disabled={
                        isCommitting ||
                        isLoadingRotationTemplates ||
                        rotationTemplates.length === 0 ||
                        !selectedRotationTemplate ||
                        isLoadingShiftTemplates ||
                        !selectedRotationTemplate.assignments.some(a => a.shiftTemplateId != null)
                      }
                      className="rounded-lg bg-sky-500 px-4 py-2.5 sm:px-3 sm:py-1.5 text-xs sm:text-[9px] font-bold sm:font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-500/30 min-h-[44px] sm:min-h-0"
                      title={
                        !selectedRotationTemplate?.assignments.some(a => a.shiftTemplateId != null)
                          ? "Esta rotación no tiene turnos asignados. Edítala en Plantillas primero."
                          : "Aplicar la rotación al calendario"
                      }
                    >
                      {isCommitting ? "⏳ Aplicando..." : "✓ Aplicar rotación"}
                    </button>
                    <a
                      href="/templates"
                      className="rounded-lg bg-white/5 px-4 py-2.5 sm:px-3 sm:py-1.5 text-xs sm:text-[9px] text-white/70 transition hover:bg-white/10 hover:text-white border border-white/10 font-semibold sm:font-medium min-h-[44px] sm:min-h-0 flex items-center justify-center"
                    >
                      📋 Plantillas
                    </a>
                  </div>
                  
                  {selectedRotationTemplate && !selectedRotationTemplate.assignments.some(a => a.shiftTemplateId != null) && (
                    <div className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-2 sm:px-2 sm:py-1.5 text-xs sm:text-[8px] text-amber-200">
                      ⚠️ Esta rotación no tiene turnos asignados. <a href="/templates" className="underline font-medium">Edítala en Plantillas</a> para asignar turnos antes de aplicarla.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Navegación del calendario - botones más grandes */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base font-bold text-white/70 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10 sm:text-lg"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/30 sm:px-4 sm:py-2 sm:text-sm"
            >
              Hoy
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`calendar-${monthLabel}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-[100px] text-center text-sm font-semibold text-white sm:text-base"
              >
                {monthLabel}
              </motion.p>
            </AnimatePresence>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base font-bold text-white/70 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10 sm:text-lg"
            >
              ›
            </button>
          </div>

          {/* Calendario principal - más prominente */}
          <div className="overflow-hidden">
            <div className="grid grid-cols-7 gap-1 border-b border-white/5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/60 sm:text-[10px]">
              {Array.from({ length: 7 }).map((_, index) => {
                const reference = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index)
                return (
                  <div key={index} className="text-center text-white/70">
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
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-7 gap-1 py-1"
              >
                    {calendarConfig.days.map((day, index) => {
                      const dayIso = toIsoDate(day)
                      const entry = entries[dayIso]
                      const isCurrentMonth = isSameMonth(day, currentMonth)
                      const isCurrentDay = isToday(day)
                      const isSelected = selectedDate === dayIso
                      const hasEntry = entry != null
                      const isRest = entry?.type === "REST"
                      const isVacation = entry?.type === "VACATION"
                      const shiftLabel = entry?.label || (entry ? SHIFT_LABELS[entry.type] : null)
                      const timeRange = entry?.startTime && entry?.endTime 
                        ? `${entry.startTime}-${entry.endTime}` 
                        : null
                      const showFestive = (userPreferences.showFestiveDays ?? true) && isFestiveDate(day)
                      const festiveColor = userPreferences.festiveDayColor ?? DEFAULT_USER_PREFERENCES.festiveDayColor ?? "#dc2626"
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedDate(dayIso)}
                          className={`relative flex flex-col items-stretch gap-1 rounded-lg transition hover:scale-[1.02] focus:outline-none min-h-[60px] sm:min-h-[70px] ${
                            !isCurrentMonth
                              ? "py-1 px-1 text-white/20"
                              : isSelected
                                ? "bg-sky-500/30 py-1.5 px-1.5 text-white ring-2 ring-sky-400/50"
                                : isCurrentDay
                                  ? "bg-white/10 py-1.5 px-1.5 text-white font-bold ring-1 ring-white/20"
                                  : hasEntry
                                    ? "py-1.5 px-1.5 text-white font-semibold hover:bg-white/10"
                                    : "py-1.5 px-1.5 text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          style={
                            showFestive && isCurrentMonth
                              ? { borderLeft: `3px solid ${festiveColor}` }
                              : undefined
                          }
                        >
                          {/* Número del día */}
                          <span className={`text-xs font-medium sm:text-sm ${isCurrentDay ? "text-white" : "text-white/90"}`}>
                            {format(day, "d", { locale: es })}
                          </span>
                          
                          {/* Barra de color y contenido */}
                          {isCurrentMonth && (
                            <div className="flex-1 flex flex-col gap-0.5">
                              {hasEntry ? (
                                <>
                                  {/* Barra de color prominente */}
                                  <div 
                                    className="h-1.5 w-full rounded-sm shadow-sm"
                                    style={{ 
                                      backgroundColor: entry.color || "#3b82f6",
                                      opacity: isRest || isVacation ? 0.7 : 1
                                    }}
                                  />
                                  
                                  {/* Información del turno */}
                                  <div className="flex flex-col gap-0.5 min-h-0">
                                    {shiftLabel && (
                                      <span className="text-[8px] sm:text-[9px] font-semibold text-white/90 leading-tight truncate">
                                        {shiftLabel}
                                      </span>
                                    )}
                                    {timeRange && (
                                      <span className="text-[7px] sm:text-[8px] text-white/70 leading-tight">
                                        {timeRange}
                                      </span>
                                    )}
                                    {isRest && (
                                      <span className="text-[7px] sm:text-[8px] text-white/60 italic">
                                        Libre
                                      </span>
                                    )}
                                    {isVacation && (
                                      <span className="text-[7px] sm:text-[8px] text-white/60 italic">
                                        Vacaciones
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="flex-1 flex items-center justify-center">
                                  <span className="text-[7px] sm:text-[8px] text-white/40 italic">
                                    Libre
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                </motion.div>
              </AnimatePresence>
          </div>
        </section>

        {/* Footer compacto */}
        <div className="flex items-center justify-between gap-2 text-[9px] text-white/50">
          <p>{isCommitting ? "Guardando..." : "Guardado"}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={orderedEntries.length === 0}
              className="rounded px-2 py-0.5 text-white/60 hover:text-white disabled:opacity-40"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={orderedEntries.length === 0}
              className="rounded px-2 py-0.5 text-white/60 hover:text-white disabled:opacity-40"
            >
              PDF
            </button>
          </div>
          {errorMessage ? <p className="text-[9px] text-rose-300">{errorMessage}</p> : null}
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
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur overflow-y-auto py-4 pb-[calc(6rem+env(safe-area-inset-bottom))]"
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
              className="mx-3 flex w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-2.5 text-white shadow-[0_40px_70px_-30px_rgba(14,165,233,0.5)] sm:max-w-md sm:p-3 my-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-white/50">Editar turno</p>
                  <h3 className="mt-0.5 text-sm font-semibold truncate">{editorDefaults.display}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 p-1 text-white/60 transition hover:border-sky-400/40 hover:text-sky-200 text-sm"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <EditorForm
                customShiftTypes={shiftTemplates.map((t) => ({ id: String(t.id), name: t.title, color: t.color ?? "#3b82f6", defaultStartTime: t.startTime, defaultEndTime: t.endTime }))}
                defaults={editorDefaults}
                dayEntries={Object.values(entries).filter(e => e.date === editorDefaults.date)}
                onRemove={() =>
                  confirmDelete({
                    itemName: `el día ${editorDefaults.display}`,
                    onConfirm: () => handleRemoveEntry(editorDefaults.date),
                  })
                }
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
    </>
  )
}


type EditorFormProps = {
  customShiftTypes: Array<{ id: string; name: string; color: string; icon?: string; defaultStartTime?: string | null; defaultEndTime?: string | null }>
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
  dayEntries: PlannerEntry[] // Todos los turnos del día para calcular totales
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

function EditorForm({ customShiftTypes, defaults, dayEntries, onSave, onRemove }: EditorFormProps) {
  const [type, setType] = useState<ShiftType>(defaults.type)
  const [note, setNote] = useState(defaults.note)
  const [color, setColor] = useState(defaults.color)
  const [label, setLabel] = useState(defaults.label)
  const [startTime, setStartTime] = useState(defaults.startTime ?? "")
  const [endTime, setEndTime] = useState(defaults.endTime ?? "")
  const [pluses, setPluses] = useState<PlannerPluses>({ ...defaults.pluses })
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)

  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded) {
      setUserPreferences(loaded.preferences)
    }
  }, [])

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

  // Calcular horas totales del día (sumando todos los turnos del día)
  const totalDayHours = useMemo(() => {
    return dayEntries.reduce((total, entry) => {
      const { minutes } = getShiftDuration(entry.startTime, entry.endTime)
      return total + minutes / 60
    }, 0)
  }, [dayEntries])

  const formattedTotalDayHours = `${Math.floor(totalDayHours)}h ${String(
    Math.round((totalDayHours % 1) * 60),
  ).padStart(2, "0")}m`

  // Calcular extras seleccionados y total ganado
  const selectedExtras = useMemo(() => {
    const extras: string[] = []
    if (pluses.night > 0) extras.push("night")
    if (pluses.holiday > 0) extras.push("holiday")
    if (pluses.availability > 0) extras.push("availability")
    if (pluses.other > 0) extras.push("other")
    return extras
  }, [pluses])

  const totalEarned = useMemo(() => {
    const hourlyRate = userPreferences.hourlyRate ?? 0
    const hoursEarned = totalDayHours * hourlyRate
    
    const extrasEarned = selectedExtras.reduce((total, extraId) => {
      const extra = userPreferences.shiftExtras?.find(e => e.id === extraId)
      return total + (extra?.value ?? 0)
    }, 0)

    return hoursEarned + extrasEarned
  }, [totalDayHours, selectedExtras, userPreferences])

  return (
    <form
      className="mt-2 space-y-2 pb-1"
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
      <div className="space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/40">Tipo de turno</p>
          {customShiftTypes.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-2 text-[10px] text-white/50">
              No tienes plantillas de turno. Créalas en{" "}
              <Link href="/templates" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                Plantillas
              </Link>{" "}
              y aparecerán aquí.
            </p>
          ) : (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {customShiftTypes.map((ct) => {
                const isSelected = type === "CUSTOM" && label === ct.name && color === ct.color
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => {
                      setType("CUSTOM")
                      setLabel(ct.name)
                      setColor(ct.color)
                      if (ct.defaultStartTime) setStartTime(ct.defaultStartTime)
                      if (ct.defaultEndTime) setEndTime(ct.defaultEndTime)
                    }}
                    className={`rounded-lg border px-1.5 py-1 text-left text-[10px] font-semibold transition ${isSelected ? "border-white/80 bg-white/10" : "border-white/10 bg-white/5 hover:border-sky-400/40"}`}
                    style={{ color: ct.color }}
                  >
                    {ct.icon ? `${ct.icon} ` : ""}{ct.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-[10px] text-white/70">
          Texto del turno
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
            placeholder="Etiqueta que verás en el calendario"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-white/70">
            Entrada
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-white/70">
            Salida
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40">Horas turno</p>
            <p className="text-sm font-semibold text-white">{formattedDuration}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40">Horas día</p>
            <p className="text-sm font-semibold text-white">{formattedTotalDayHours}</p>
          </div>
          {totalEarned > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/40">Total</p>
              <p className="text-sm font-semibold text-emerald-400">{totalEarned.toFixed(2)}€</p>
            </div>
          )}
          <p className="text-[9px] text-white/50">
            {usingFallbackTimes
              ? `Por defecto ${DEFAULT_PLANNER_START_TIME}-${DEFAULT_PLANNER_END_TIME}`
              : crossesMidnight
                ? "Termina al día siguiente."
                : "Mismo día."}
          </p>
          <label className="ml-auto flex items-center gap-1.5 text-[10px] text-white/70">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-6 w-10 rounded-lg border border-white/20 bg-transparent"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Extras</p>
          {(userPreferences.shiftExtras ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-2 text-[10px] text-white/50">
              Si quieres añadir extras, créalos en{" "}
              <Link href="/extras" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                Extras
              </Link>{" "}
              y aparecerán aquí.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {(userPreferences.shiftExtras ?? []).map((extra, index) => {
                    const plusKeys: (keyof PlannerPluses)[] = ["night", "holiday", "availability", "other"]
                    const key = index < 4 ? plusKeys[index] : "other"
                    const isSelected = pluses[key] > 0 && index < 4
                    if (index >= 4) return null
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition cursor-pointer ${
                          isSelected
                            ? "border-white/30 bg-white/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                        style={isSelected ? { borderColor: (extra.color ?? "#3b82f6") + "60", backgroundColor: (extra.color ?? "#3b82f6") + "15" } : {}}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            setPluses((prev) => ({
                              ...prev,
                              [key]: event.target.checked ? 1 : 0,
                            }))
                          }
                          className="h-3 w-3 rounded border-white/20 bg-white/5 accent-sky-500 flex-shrink-0"
                        />
                        <span className="flex-1 font-medium text-white/90 truncate text-[9px]">{extra.name}</span>
                        <span className="text-[9px] font-semibold text-white/60 whitespace-nowrap">{extra.value}€</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              {(userPreferences.shiftExtras ?? []).length > 4 && (
                <p className="mt-2 text-[8px] text-white/40 italic">
                  Nota: Solo los primeros 4 extras se pueden asignar por turno. Gestiona tus extras en Extras.
                </p>
              )}
              {selectedExtras.length > 0 && (
                <p className="mt-2 text-[9px] text-white/50">
                  Extras: {selectedExtras.map(id => {
                    const extra = userPreferences.shiftExtras?.find(e => e.id === id)
                    return extra ? `${extra.name} (+${extra.value}€)` : null
                  }).filter(Boolean).join(", ")}
                </p>
              )}
            </>
          )}
        </div>

        <label className="flex flex-col gap-1 text-[10px] text-white/70">
          Nota
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={1}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40 min-h-[36px]"
            placeholder="Incidencias, guardias, recordatorios"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
        >
          Borrar día
        </button>
        <div className="flex flex-wrap gap-1.5">
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
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10"
          >
            Restablecer
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110"
          >
            Guardar turno
          </button>
        </div>
      </div>
    </form>
  )
}

