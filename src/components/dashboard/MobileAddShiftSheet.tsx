"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { ShiftType } from "@/types/shifts"

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
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
  initialStartTime?: string
  initialEndTime?: string
  onDateConsumed?: () => void
}

export default function MobileAddShiftSheet({
  open,
  onClose,
  onAdd,
  selectedDate,
  initialStartTime,
  initialEndTime,
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
    if (initialStartTime) {
      setStartTime(initialStartTime)
    }
    if (initialEndTime) {
      setEndTime(initialEndTime)
    }
  }, [open, selectedDate, initialStartTime, initialEndTime, onDateConsumed])

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
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 flex flex-col gap-4 p-5 max-h-[90vh] overflow-y-auto"
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
          <h2 className="text-xl font-bold text-white pr-10">Nuevo turno</h2>
          <p className="mt-0.5 text-sm text-white/50">Rellena los datos y guarda</p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Fecha</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field flex-1 text-base min-h-[44px] touch-manipulation"
              />
              <span className="rounded-lg bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-200 whitespace-nowrap">
                {selectedDateLabel}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">Tipo de turno</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ShiftType)}
              className="input-field w-full text-base min-h-[44px] touch-manipulation"
            >
              {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Horario</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">Inicio</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field w-full text-base min-h-[44px] touch-manipulation"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">Fin</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field w-full text-base min-h-[44px] touch-manipulation"
                  required
                />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Nota <span className="font-normal normal-case text-white/40">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ej: reunión matinal, cubrir a María..."
              className="input-field w-full resize-none text-sm placeholder:text-white/40"
            />
          </div>

          {(error || submitError) && (
            <p className="text-sm text-rose-400">{error || submitError}</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 py-4 text-lg font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-sky-500 disabled:opacity-60 touch-manipulation min-h-[52px]"
        >
          {isSubmitting ? "Guardando…" : "Guardar turno"}
        </motion.button>
      </form>
    </div>
  )
}
