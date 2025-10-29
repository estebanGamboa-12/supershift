"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type { SVGProps } from "react"
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { AnimatePresence, motion } from "framer-motion"
import { formatCompactDate, formatCompactMonth } from "@/lib/formatDate"

const WEEK_STARTS_ON = 1

type InlineCalendarProps = {
  selectedDates: Date[]
  onSelectDate: (date: Date) => void
}

function InlineCalendar({ selectedDates, onSelectDate }: InlineCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const calendarStart = useMemo(
    () => startOfWeek(startOfMonth(currentMonth), { weekStartsOn: WEEK_STARTS_ON }),
    [currentMonth],
  )

  const calendarDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index)),
    [calendarStart],
  )

  const weekdays = useMemo(() => {
    const weekRef = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON })
    return Array.from({ length: 7 }, (_, index) =>
      format(addDays(weekRef, index), "EEEEEE", { locale: es }),
    )
  }, [])

  const selectedKeys = useMemo(() => {
    return new Set(
      selectedDates
        .map((date) => format(date, "yyyy-MM-dd"))
        .filter((value) => typeof value === "string"),
    )
  }, [selectedDates])

  const goToPreviousMonth = () => {
    setCurrentMonth((month) => subMonths(month, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((month) => addMonths(month, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <div className="space-y-4">
      <header className="surface-card--muted flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 text-xs sm:text-[13px]">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-brand-muted transition hover:border-brand-accent/60 hover:text-brand-text"
          >
            Ant.
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="accent-action rounded-full px-4 py-1.5 text-xs font-semibold sm:text-[13px]"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-brand-muted transition hover:border-brand-accent/60 hover:text-brand-text"
          >
            Sig.
          </button>
        </div>

        <div className="text-right">
          <p className="text-base font-semibold text-brand-text sm:text-lg">
            {formatCompactMonth(currentMonth)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-brand-muted/70">Calendario</p>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,24,40,0.65)]">
        <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-[rgba(15,24,40,0.65)] text-[11px] font-semibold uppercase tracking-wide text-brand-muted sm:text-xs">
          {weekdays.map((day) => (
            <div key={day} className="bg-[rgba(11,18,32,0.85)] py-2 text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 grid-rows-6 gap-px bg-[rgba(12,20,34,0.6)]">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const isSelected = selectedKeys.has(key)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isCurrentDay = isToday(day)

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(day)}
                  className={`flex h-full flex-col gap-1 rounded-2xl border border-transparent p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/70 ${
                    isCurrentMonth ? "text-white/90" : "text-white/40"
                  } ${
                    isSelected
                      ? "bg-brand-accent/25 text-brand-text shadow-[0_8px_24px_rgba(96,165,250,0.35)]"
                      : "bg-[rgba(11,18,32,0.65)] hover:border-brand-accent/30 hover:bg-[rgba(14,25,42,0.75)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition ${
                      isCurrentDay
                      ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/50"
                      : "bg-white/5 text-white/80"
                    } ${isSelected ? "ring-2 ring-brand-accent/60" : ""}`}
                >
                  {format(day, "d")}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-white/40">
                  {format(day, "EEE", { locale: es })}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const iconStrokeProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <rect x={3} y={4} width={18} height={17} rx={2.5} ry={2.5} />
      <line x1={3} y1={9} x2={21} y2={9} />
      <line x1={8} y1={2.5} x2={8} y2={6} />
      <line x1={16} y1={2.5} x2={16} y2={6} />
    </svg>
  )
}

function Sparkles(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <path d="M8 4.5 9.5 9l4.5 1.5L9.5 12 8 16.5 6.5 12 2 10.5 6.5 9 8 4.5Z" />
      <path d="M16 5 17 7l2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      <path d="M15 14.5 16 17l2.5.75L16 18.5l-1 2.5-1-2.5-2.5-.75L15 17Z" />
    </svg>
  )
}

function Trash2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <path d="M4 7h16" />
      <path d="M9 4h6l1 2H8Z" />
      <path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
      <line x1={10} y1={11} x2={10} y2={17} />
      <line x1={14} y1={11} x2={14} y2={17} />
    </svg>
  )
}

function XCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <circle cx={12} cy={12} r={9} />
      <line x1={9} y1={9} x2={15} y2={15} />
      <line x1={15} y1={9} x2={9} y2={15} />
    </svg>
  )
}

function Loader2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <path d="M12 4a8 8 0 1 1-5.657 2.343" />
    </svg>
  )
}

function AlertCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} {...iconStrokeProps}>
      <circle cx={12} cy={12} r={9} />
      <line x1={12} y1={8} x2={12} y2={12.5} />
      <circle cx={12} cy={16} r={0.5} fill="currentColor" stroke="none" />
    </svg>
  )
}

const SHIFT_TYPES = ["WORK", "REST", "NIGHT", "VACATION", "CUSTOM"] as const

type ShiftType = (typeof SHIFT_TYPES)[number]

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  WORK: "from-sky-400/70 to-blue-500/70",
  REST: "from-emerald-400/70 to-teal-500/70",
  NIGHT: "from-purple-400/70 to-violet-500/70",
  VACATION: "from-amber-400/70 to-orange-500/70",
  CUSTOM: "from-pink-400/70 to-fuchsia-500/70",
}

const SHIFT_TYPE_HEX_COLORS: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#22c55e",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

type ShiftPluses = {
  night: number
  holiday: number
  availability: number
  other: number
}

type RotationDay = {
  date: string
  type: ShiftType
  pluses: ShiftPluses
  note?: string
  color?: string
  label?: string
  startTime?: string | null
  endTime?: string | null
}

type RotationSummary = {
  totalDays: number
  totalAmount: number
  byType: Record<ShiftType, number>
  pluses: ShiftPluses
}

type ManualRotationBuilderProps = {
  initialDays?: RotationDay[]
  onConfirm?: (days: RotationDay[], summary: RotationSummary) => void | Promise<void>
  confirmLabel?: string
  disabled?: boolean
  errorMessage?: string | null
}

type EditorState = {
  date: Date
  type: ShiftType
  pluses: ShiftPluses
  color: string
  label: string
  startTime: string | null
  endTime: string | null
}

const INITIAL_PLUSES: ShiftPluses = {
  night: 0,
  holiday: 0,
  availability: 0,
  other: 0,
}

export function ManualRotationBuilder({
  initialDays = [],
  onConfirm,
  confirmLabel = "Confirmar",
  disabled = false,
  errorMessage = null,
}: ManualRotationBuilderProps) {
  const [days, setDays] = useState<RotationDay[]>(() =>
    initialDays.map((day) => ({
      ...day,
      color: day.color ?? SHIFT_TYPE_HEX_COLORS[day.type],
      label: day.label ?? SHIFT_TYPE_LABELS[day.type],
      pluses: { ...INITIAL_PLUSES, ...day.pluses },
    })),
  )
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  const summary = useMemo<RotationSummary>(() => {
    const totals = {
      totalDays: days.length,
      totalAmount: 0,
      byType: {
        WORK: 0,
        REST: 0,
        NIGHT: 0,
        VACATION: 0,
        CUSTOM: 0,
      },
      pluses: { ...INITIAL_PLUSES },
    }

    for (const day of days) {
      totals.byType[day.type] += 1
      totals.pluses.night += day.pluses.night
      totals.pluses.holiday += day.pluses.holiday
      totals.pluses.availability += day.pluses.availability
      totals.pluses.other += day.pluses.other
    }

    totals.totalAmount =
      totals.pluses.night +
      totals.pluses.holiday +
      totals.pluses.availability +
      totals.pluses.other

    return totals
  }, [days])

  useEffect(() => {
    setDays(
      initialDays.map((day) => ({
        ...day,
        color: day.color ?? SHIFT_TYPE_HEX_COLORS[day.type],
        label: day.label ?? SHIFT_TYPE_LABELS[day.type],
        pluses: { ...INITIAL_PLUSES, ...day.pluses },
      })),
    )
  }, [initialDays])

  const selectedDates = useMemo(
    () =>
      days
        .map((day) => parseISO(day.date))
        .filter((date) => !Number.isNaN(date.getTime())),
    [days],
  )

  const handleDayClick = (date: Date) => {
    if (Number.isNaN(date.getTime())) return

    const isoDate = format(date, "yyyy-MM-dd")
    const existing = days.find((day) => day.date === isoDate)
    const type = existing?.type ?? "WORK"
    const color = existing?.color ?? SHIFT_TYPE_HEX_COLORS[type]
    const label = existing?.label ?? SHIFT_TYPE_LABELS[type]

    setEditor({
      date,
      type,
      pluses: existing?.pluses ?? { ...INITIAL_PLUSES },
      color,
      label,
      startTime: existing?.startTime ?? null,
      endTime: existing?.endTime ?? null,
    })
  }

  const handleSaveDay = () => {
    if (!editor) return

    const isoDate = format(editor.date, "yyyy-MM-dd")
    const defaultColor = SHIFT_TYPE_HEX_COLORS[editor.type]
    const sanitizedColor = editor.color || defaultColor
    const trimmedLabel = editor.label.trim()
    const resolvedLabel =
      trimmedLabel.length > 0 ? trimmedLabel : SHIFT_TYPE_LABELS[editor.type]

    setDays((prev) => {
      const next = prev.filter((item) => item.date !== isoDate)
      next.push({
        date: isoDate,
        type: editor.type,
        pluses: { ...editor.pluses },
        color: sanitizedColor,
        label: resolvedLabel,
        startTime: editor.startTime,
        endTime: editor.endTime,
      })
      return next.sort((a, b) => a.date.localeCompare(b.date))
    })

    setEditor(null)
  }

  const handleRemoveDay = (date: string) => {
    setDays((prev) => prev.filter((item) => item.date !== date))
  }

  const handleClear = () => {
    setDays([])
  }

  const handleConfirm = () => {
    if (disabled || days.length === 0) return

    const payload = days
    const snapshot = summary

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(35)
    }

    if (!onConfirm) return

    setIsLoading(true)
    startTransition(() => {
      Promise.resolve(onConfirm(payload, snapshot)).finally(() => {
        setIsLoading(false)
      })
    })
  }

  const isConfirmDisabled = disabled || isPending || isLoading || days.length === 0

  return (
    <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 p-6 text-slate-100 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.12),transparent_55%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <header className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-white/20">
              <CalendarIcon className="h-6 w-6 text-sky-300" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Constructor manual</h2>
              <p className="text-sm text-slate-200/70">
                Pulsa un día para añadirlo, asigna un tipo de turno, personaliza el color y define los pluses en niveles enteros.
              </p>
            </div>
          </header>

          <div className="p-2">
            <InlineCalendar selectedDates={selectedDates} onSelectDate={handleDayClick} />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Días seleccionados</h3>
              <button
                type="button"
                onClick={handleClear}
                disabled={days.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpiar
              </button>
            </div>

            <div className="mt-5">
              <AnimatePresence initial={false}>
                {days.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-6 text-center text-sm text-slate-400"
                  >
                    No hay días seleccionados todavía. Selecciona fechas en el calendario para empezar.
                  </motion.p>
                ) : (
                  days.map((day) => {
                    const parsed = parseISO(day.date)
                    const isValid = !Number.isNaN(parsed.getTime())
                    const dateLabel = isValid
                      ? formatCompactDate(parsed)
                      : day.date
                    const accent = day.color ?? SHIFT_TYPE_HEX_COLORS[day.type]
                    return (
                      <motion.article
                        key={day.date}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="mb-3 flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-4 shadow-xl shadow-slate-950/40 md:flex-row md:items-center"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold capitalize text-white">{dateLabel}</p>
                          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                            <span
                              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider shadow-sm shadow-black/20"
                              style={{
                                backgroundColor: `${accent}1a`,
                                color: accent,
                                border: `1px solid ${accent}33`,
                              }}
                            >
                              {day.label ?? SHIFT_TYPE_LABELS[day.type]}
                            </span>
                            <span className="text-[0.7rem] text-slate-200/70">
                              Pluses: {day.pluses.night + day.pluses.holiday + day.pluses.availability + day.pluses.other} niveles
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditor({
                                date: parseISO(day.date),
                                type: day.type,
                                pluses: { ...day.pluses },
                                color: day.color ?? SHIFT_TYPE_HEX_COLORS[day.type],
                                label: day.label ?? SHIFT_TYPE_LABELS[day.type],
                                startTime: day.startTime ?? null,
                                endTime: day.endTime ?? null,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(day.date)}
                            className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          >
                            Quitar
                          </button>
                        </div>
                      </motion.article>
                    )
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/10 to-white/5 p-6 text-slate-100 shadow-lg shadow-slate-950/30">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-sky-300" />
              <h3 className="text-lg font-semibold">Resumen global</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm shadow-inner shadow-slate-950/60"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">Total días</p>
                <motion.p
                  key={summary.totalDays}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mt-1 text-3xl font-bold text-white"
                >
                  {summary.totalDays}
                </motion.p>
              </motion.div>

              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm shadow-inner shadow-slate-950/60"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">Total pluses (niveles)</p>
                <motion.p
                  key={summary.totalAmount}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mt-1 text-3xl font-bold text-emerald-300"
                >
                  {summary.totalAmount}
                </motion.p>
              </motion.div>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              {SHIFT_TYPES.map((type) => (
                <motion.div
                  key={type}
                  layout
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/30 px-4 py-3"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                    <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${SHIFT_TYPE_COLORS[type]}`} />
                    {SHIFT_TYPE_LABELS[type]}
                  </span>
                  <motion.span
                    key={summary.byType[type]}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base font-semibold text-white"
                  >
                    {summary.byType[type]}
                  </motion.span>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <span className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                <span>Plus nocturno</span>
                <strong className="text-slate-50">{summary.pluses.night}</strong>
              </span>
              <span className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                <span>Plus festivo</span>
                <strong className="text-slate-50">{summary.pluses.holiday}</strong>
              </span>
              <span className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                <span>Disponibilidad</span>
                <strong className="text-slate-50">{summary.pluses.availability}</strong>
              </span>
              <span className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                <span>Otros pluses</span>
                <strong className="text-slate-50">{summary.pluses.other}</strong>
              </span>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_20px_40px_-20px_rgba(14,165,233,0.65)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-500 ease-out group-hover:translate-y-0" />
                <span className="relative flex items-center gap-2">
                  {isLoading || isPending ? (
                    <motion.span
                      className="flex h-4 w-4 items-center justify-center"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }}
                    >
                      <Loader2 className="h-4 w-4" />
                    </motion.span>
                  ) : null}
                  {confirmLabel}
                </span>
              </button>
            </div>

            {errorMessage ? (
              <div className="mt-4 inline-flex w-full items-start gap-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-100">
                <span className="mt-1">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {editor ? (
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
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 text-slate-100 shadow-[0_40px_80px_-40px_rgba(15,23,42,1)]"
            >
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Cerrar"
              >
                <XCircle className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-semibold text-white">Configurar día</h3>
              <p className="mt-1 text-sm text-slate-300">
                {formatCompactDate(editor.date, { includeYear: true })}
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo de turno</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {SHIFT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setEditor((prev) => {
                            if (!prev) return prev
                            const shouldResetColor =
                              !prev.color ||
                              prev.color === SHIFT_TYPE_HEX_COLORS[prev.type]
                            const shouldResetLabel =
                              !prev.label ||
                              prev.label.trim().length === 0 ||
                              prev.label === SHIFT_TYPE_LABELS[prev.type]

                            return {
                              ...prev,
                              type,
                              color: shouldResetColor
                                ? SHIFT_TYPE_HEX_COLORS[type]
                                : prev.color,
                              label: shouldResetLabel
                                ? SHIFT_TYPE_LABELS[type]
                                : prev.label,
                            }
                          })
                        }
                        className={`group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r ${SHIFT_TYPE_COLORS[type]} px-4 py-3 text-left text-sm font-medium text-white shadow-lg shadow-black/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${editor.type === type ? "ring-2 ring-white/80" : "opacity-80 hover:opacity-100"}`}
                      >
                        <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                          {SHIFT_TYPE_LABELS[type]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs text-white/70">
                    Texto del turno
                    <input
                      type="text"
                      value={editor.label}
                      onChange={(event) =>
                        setEditor((prev) =>
                          prev
                            ? { ...prev, label: event.target.value }
                            : prev,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/90 shadow-inner shadow-black/40 placeholder:text-white/40 focus-visible:border-sky-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                      placeholder="Etiqueta que verás en el calendario"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-xs text-white/70">
                    Color del turno
                    <input
                      type="color"
                      value={editor.color}
                      onChange={(event) =>
                        setEditor((prev) =>
                          prev
                            ? { ...prev, color: event.target.value }
                            : prev,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pluses (nivel 0-3)</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["night", "Nocturno"],
                        ["holiday", "Festivo"],
                        ["availability", "Disponibilidad"],
                        ["other", "Otros"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/90 shadow-inner shadow-black/20"
                      >
                        <span className="text-xs uppercase tracking-wide text-slate-300">{label}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={3}
                          step={1}
                          value={editor.pluses[key]}
                          onChange={(event) => {
                            const parsed = Number.parseInt(event.target.value, 10)
                            const safeValue = Number.isNaN(parsed)
                              ? 0
                              : Math.min(3, Math.max(0, parsed))
                            setEditor((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    pluses: {
                                      ...prev.pluses,
                                      [key]: safeValue,
                                    },
                                  }
                                : prev,
                            )
                          }}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/90 shadow-inner shadow-black/40 transition focus-visible:border-sky-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-100/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDay}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_20px_40px_-20px_rgba(14,165,233,0.65)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Guardar día
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export type { RotationDay as ManualRotationDay, RotationSummary }

export default ManualRotationBuilder
