"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import type { ShiftType, ShiftPluses } from "@/types/shifts"
import type { ShiftTemplate } from "@/types/templates"
import { loadUserPreferences } from "@/lib/user-preferences"
import { getTemplateDefaultPluses } from "@/lib/template-default-pluses"

const DEFAULT_PLUSES: ShiftPluses = {
  night: 0,
  holiday: 0,
  availability: 0,
  other: 0,
}

type MobileAddShiftSheetProps = {
  open: boolean
  onClose: () => void
  onAdd: (shift: {
    date: string
    type: ShiftType
    note?: string
    label?: string
    color?: string
    startTime: string
    endTime: string
    pluses?: ShiftPluses
  }) => Promise<void>
  selectedDate?: string | null
  initialStartTime?: string
  initialEndTime?: string
  onDateConsumed?: () => void
  userId?: string | null
  shiftTemplates?: ShiftTemplate[]
}

export default function MobileAddShiftSheet({
  open,
  onClose,
  onAdd,
  selectedDate,
  initialStartTime,
  initialEndTime,
  onDateConsumed,
  userId,
  shiftTemplates = [],
}: MobileAddShiftSheetProps) {
  const [date, setDate] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [error, setError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pluses, setPluses] = useState<ShiftPluses>({ ...DEFAULT_PLUSES })

  useEffect(() => {
    if (!open) {
      setError("")
      return
    }
    if (selectedDate) {
      setDate(selectedDate)
      onDateConsumed?.()
    }
    if (initialStartTime) {
      setStartTime(initialStartTime)
    }
    if (initialEndTime) {
      setEndTime(initialEndTime)
    }
    if (shiftTemplates.length > 0 && selectedTemplateId === null) {
      const first = shiftTemplates[0]
      setSelectedTemplateId(first.id)
      if (!initialStartTime) setStartTime(first.startTime)
      if (!initialEndTime) setEndTime(first.endTime)
      const defaultPluses = getTemplateDefaultPluses(first.id)
      setPluses(defaultPluses ? { ...defaultPluses } : { ...DEFAULT_PLUSES })
    }
  }, [open, selectedDate, initialStartTime, initialEndTime, onDateConsumed, shiftTemplates, selectedTemplateId])

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setDate("")
        setSelectedTemplateId(null)
        setNote("")
        setStartTime("09:00")
        setEndTime("17:00")
        setPluses({ ...DEFAULT_PLUSES })
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [open])

  const selectedDateLabel = useMemo(() => {
    if (!date) return "Selecciona una fecha"
    try {
      return new Date(date).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    } catch {
      return "Selecciona una fecha válida"
    }
  }, [date])

  const [hourlyRate, setHourlyRate] = useState(0)
  const [shiftExtras, setShiftExtras] = useState<{ id: string; name: string; value: number; color?: string }[]>([])
  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded?.preferences) {
      if (loaded.preferences.hourlyRate != null) setHourlyRate(loaded.preferences.hourlyRate)
      setShiftExtras(loaded.preferences.shiftExtras ?? [])
    }
  }, [open])

  const plusKeys: (keyof ShiftPluses)[] = ["night", "holiday", "availability", "other"]
  const { durationLabel, estimatedEur, extrasEur } = useMemo(() => {
    const start = startTime ? new Date(`1970-01-01T${startTime}:00`) : null
    const end = endTime ? new Date(`1970-01-01T${endTime}:00`) : null
    if (!start || !end) {
      return { durationMinutes: 0, durationLabel: "0h 00m", estimatedEur: 0, extrasEur: 0 }
    }
    const endDate = new Date(end)
    if (endDate <= start) endDate.setDate(endDate.getDate() + 1)
    const minutes = Math.round((endDate.getTime() - start.getTime()) / 60000)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const label = `${h}h ${String(m).padStart(2, "0")}m`
    const rate = hourlyRate
    const fromHours = (minutes / 60) * rate
    let extrasSum = 0
    shiftExtras.slice(0, 4).forEach((extra, i) => {
      const key = plusKeys[i]
      const count = pluses[key] ?? 0
      extrasSum += count * extra.value
    })
    return {
      durationLabel: label,
      estimatedEur: fromHours + extrasSum,
      extrasEur: extrasSum,
    }
  }, [startTime, endTime, hourlyRate, shiftExtras, pluses])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!date) {
      setError("Selecciona una fecha para el turno")
      return
    }

    if (!startTime || !endTime) {
      setError("Indica la hora de inicio y finalización")
      return
    }

    setError("")
    setSubmitError("")
    try {
      setIsSubmitting(true)
      const tpl = selectedTemplateId != null ? shiftTemplates.find((t) => t.id === selectedTemplateId) : null
      await onAdd({
        date,
        type: "CUSTOM",
        note: note.trim() ? note.trim() : undefined,
        label: tpl?.title,
        color: tpl?.color ?? "#3b82f6",
        startTime,
        endTime,
        pluses: Object.values(pluses).some((v) => v > 0) ? pluses : undefined,
      })
      onClose()
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar el turno. Inténtalo más tarde."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0"
        aria-label="Cerrar"
      />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 flex flex-col gap-3 p-4"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div>
          <h2 className="text-lg font-bold text-white pr-10">Nuevo turno</h2>
          <p className="mt-0.5 text-xs text-white/50">Rellena los datos y guarda</p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Fecha</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field flex-1 text-sm min-h-[40px] touch-manipulation"
              />
              <span className="rounded-lg bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-200 whitespace-nowrap">
                {selectedDateLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Tipo de turno</p>
            {shiftTemplates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-3 text-[11px] text-white/50">
                No tienes plantillas de turno. Créalas en{" "}
                <Link href="/templates" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                  Plantillas
                </Link>{" "}
                (Trabajo, Nocturno, Descanso, etc.) y aparecerán aquí.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {shiftTemplates.map((tpl) => {
                  const tplColor = tpl.color ?? "#3b82f6"
                  const isSelected = selectedTemplateId === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id)
                        setStartTime(tpl.startTime)
                        setEndTime(tpl.endTime)
                        const defaultPluses = getTemplateDefaultPluses(tpl.id)
                        if (defaultPluses) setPluses({ ...defaultPluses })
                        else setPluses({ ...DEFAULT_PLUSES })
                      }}
                      className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold transition touch-manipulation ${
                        isSelected ? "border-white/40 text-white" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: tplColor + "40", borderColor: tplColor }
                          : undefined
                      }
                    >
                      {tpl.icon ? `${tpl.icon} ` : ""}{tpl.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Horario</p>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">Inicio</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field w-full text-sm min-h-[40px] touch-manipulation"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">Fin</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field w-full text-sm min-h-[40px] touch-manipulation"
                  required
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-white/70">
              Duración: <span className="font-semibold text-white">{durationLabel}</span>
              {estimatedEur > 0 && (
                <>
                  {" · "}
                  Estimado: <span className="font-semibold text-emerald-400">{estimatedEur.toFixed(2).replace(".", ",")}€</span>
                  {extrasEur > 0 && (
                    <span className="text-white/50"> (horas + {extrasEur.toFixed(2).replace(".", ",")}€ extras)</span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Extras</p>
            {shiftExtras.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-3 text-[11px] text-white/50">
                Si quieres añadir extras a este turno (nocturno, festivo, disponibilidad…), créalos en{" "}
                <Link href="/extras" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                  Extras
                </Link>{" "}
                y podrás elegirlos aquí.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {shiftExtras.slice(0, 4).map((extra, index) => {
                  const key = plusKeys[index]
                  const isSelected = (pluses[key] ?? 0) > 0
                  return (
                    <label
                      key={extra.id}
                      className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold transition cursor-pointer touch-manipulation ${
                        isSelected
                          ? "border-white/40 bg-white/15"
                          : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: (extra.color ?? "#3b82f6") + "80",
                              backgroundColor: (extra.color ?? "#3b82f6") + "20",
                            }
                          : {}
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          setPluses((prev) => ({
                            ...prev,
                            [key]: e.target.checked ? 1 : 0,
                          }))
                        }
                        className="h-4 w-4 rounded border-2 border-white/30 bg-white/10 accent-sky-500 flex-shrink-0"
                      />
                      <span className="flex-1 truncate text-white">{extra.name}</span>
                      <span className="text-[10px] font-bold text-white/80 whitespace-nowrap">+{extra.value}€</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Nota <span className="font-normal normal-case text-white/40">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              placeholder="Ej: reunión matinal, cubrir a María..."
              className="input-field w-full resize-none text-sm min-h-[40px] placeholder:text-white/40"
            />
          </div>

          {(error || submitError) && (
            <p className="text-xs text-rose-400">{error || submitError}</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting || shiftTemplates.length === 0}
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 py-3 text-base font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-sky-500 disabled:opacity-60 touch-manipulation min-h-[44px]"
        >
          {isSubmitting ? "Guardando…" : shiftTemplates.length === 0 ? "Crea plantillas en Plantillas" : "Guardar turno"}
        </motion.button>
      </form>
    </div>
  )
}
