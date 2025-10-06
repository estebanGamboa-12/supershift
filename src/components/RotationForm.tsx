"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftType } from "@/types/shifts"

type ManualRotationDraftEntry = {
  date: string
  type: ShiftType
}

type ManualRotationPanelProps = {
  draft: ManualRotationDraftEntry[]
  onChangeType: (date: string, type: ShiftType) => void
  onRemoveDate: (date: string) => void
  onClear: () => void
  onCommit: () => void | Promise<void>
  isCommitting?: boolean
  error?: string | null
}

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const SHIFT_TYPE_BADGE: Record<ShiftType, string> = {
  WORK: "bg-blue-500/20 border-blue-400/40 text-blue-200",
  REST: "bg-slate-500/20 border-slate-400/40 text-slate-200",
  NIGHT: "bg-purple-500/20 border-purple-400/40 text-purple-200",
  VACATION: "bg-amber-500/20 border-amber-400/40 text-amber-200",
  CUSTOM: "bg-cyan-500/20 border-cyan-400/40 text-cyan-200",
}

function getFormattedDate(date: string) {
  try {
    const parsed = parseISO(date)
    if (Number.isNaN(parsed.getTime())) {
      return { formatted: date, short: date }
    }

    const formatted = format(parsed, "EEEE d 'de' MMMM yyyy", { locale: es })
    const short = format(parsed, "dd/MM/yyyy", { locale: es })
    return { formatted, short }
  } catch {
    return { formatted: date, short: date }
  }
}

export default function ManualRotationPanel({
  draft,
  onChangeType,
  onRemoveDate,
  onClear,
  onCommit,
  isCommitting = false,
  error,
}: ManualRotationPanelProps) {
  const orderedDraft = useMemo(() => {
    return [...draft].sort((a, b) => {
      const left = parseISO(a.date)
      const right = parseISO(b.date)
      const leftTime = Number.isNaN(left.getTime()) ? 0 : left.getTime()
      const rightTime = Number.isNaN(right.getTime()) ? 0 : right.getTime()
      return leftTime - rightTime
    })
  }, [draft])

  const hasDraft = orderedDraft.length > 0

  return (
    <section className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500/10 via-fuchsia-500/5 to-transparent opacity-80" />

      <div className="relative space-y-6">
        <header className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
            Planificación manual
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Pulsa un día del calendario para añadirlo al borrador y asigna el tipo de turno que corresponda.
          </p>
        </header>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-4 text-left">
          <div className="space-y-1 text-sm text-white/70">
            <p>
              Gestiona las fechas seleccionadas antes de confirmarlas. Puedes ajustar cada tipo de turno o eliminarlas si te equivocas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasDraft || isCommitting}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>

        <div className="space-y-3">
          {hasDraft ? (
            <ul className="flex flex-col gap-3">
              {orderedDraft.map((entry) => {
                const display = getFormattedDate(entry.date)
                return (
                  <li
                    key={entry.date}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize text-white">
                        {display.formatted}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-white/50">
                        {display.short}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${SHIFT_TYPE_BADGE[entry.type]}`}
                      >
                        {SHIFT_TYPE_LABELS[entry.type]}
                      </span>
                      <select
                        value={entry.type}
                        onChange={(event) =>
                          onChangeType(entry.date, event.target.value as ShiftType)
                        }
                        disabled={isCommitting}
                        className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onRemoveDate(entry.date)}
                        disabled={isCommitting}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-white/60">
              No hay fechas seleccionadas todavía. Usa el calendario para crear tu borrador.
            </div>
          )}
        </div>

        {error && (
          <p className="text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <motion.button
          whileTap={{ scale: hasDraft && !isCommitting ? 0.97 : 1 }}
          type="button"
          onClick={onCommit}
          disabled={!hasDraft || isCommitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCommitting ? (
            <>
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
              Guardando...
            </>
          ) : (
            "Confirmar rotación"
          )}
        </motion.button>

        <p className="text-center text-[11px] tracking-[0.25em] text-white/40">
          Planifica sin complicaciones
        </p>
      </div>
    </section>
  )
}

export type { ManualRotationDraftEntry, ManualRotationPanelProps }
