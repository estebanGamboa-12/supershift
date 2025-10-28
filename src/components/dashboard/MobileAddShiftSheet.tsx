"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { ShiftType } from "@/types/shifts"

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "tra",
  REST: "des",
  NIGHT: "noc",
  VACATION: "vac",
  CUSTOM: "per",
}

type MobileAddShiftSheetProps = {
  open: boolean
  onClose: () => void
  onAdd: (shift: {
    date: string
    type: ShiftType
    note?: string
    startTime: string
    endTime: string
  }) => Promise<void>
  selectedDate?: string | null
  onDateConsumed?: () => void
}

export default function MobileAddShiftSheet({
  open,
  onClose,
  onAdd,
  selectedDate,
  onDateConsumed,
}: MobileAddShiftSheetProps) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")
  const [note, setNote] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [error, setError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setError("")
      return
    }
    if (selectedDate) {
      setDate(selectedDate)
      onDateConsumed?.()
    }
  }, [open, selectedDate, onDateConsumed])

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setDate("")
        setType("WORK")
        setNote("")
        setStartTime("09:00")
        setEndTime("17:00")
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
      await onAdd({
        date,
        type,
        note: note.trim() ? note.trim() : undefined,
        startTime,
        endTime,
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xl">
      {/* Fondo clickable para cerrar */}
      <button
        type="button"
        onClick={onClose}
        className="flex-1"
        aria-label="Cerrar formulario rápido"
      />

      {/* Sheet */}
      <form
        onSubmit={handleSubmit}
        className="mt-auto flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-4xl border border-white/10 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950/98 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-white shadow-[0_-30px_80px_rgba(56,189,248,0.25)] transition-transform duration-300 ease-out"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-1 h-1.5 w-16 rounded-full bg-white/25" />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">
              Nuevo turno
            </p>
            <h2 className="text-2xl font-semibold text-white">Añadir rápidamente</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/5 p-2 text-white/70 transition hover:border-white/40 hover:text-white focus-visible:border-white/60"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-sky-400/30 bg-gradient-to-r from-sky-500/20 via-blue-600/20 to-indigo-500/20 px-4 py-3 text-sm text-sky-100">
          <span aria-hidden className="text-lg">📆</span>
          <span className="font-semibold text-sky-50">{selectedDateLabel}</span>
        </div>

        {/* Campos */}
        <label className="flex flex-col gap-2 text-sm text-white/90">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-[15px] text-white shadow-inner shadow-sky-500/10 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/90">
          Tipo de turno
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ShiftType)}
            className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-[15px] text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-sm text-white/90">
            Hora de inicio
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-[15px] text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/90">
            Hora de finalización
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-[15px] text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-white/90">
          Nota (opcional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Añade recordatorios o detalles clave"
            className="resize-none rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/45 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </label>

        {error && <p className="text-sm text-rose-300">{error}</p>}
        {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Guardar turno"}
        </motion.button>
      </form>
    </div>
  )
}
