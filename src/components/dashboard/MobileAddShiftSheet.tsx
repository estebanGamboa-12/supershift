"use client"

import { useEffect, useMemo, useState } from "react"
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
  onAdd: (shift: { date: string; type: ShiftType; note?: string }) => Promise<void>
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

    setError("")
    setSubmitError("")
    try {
      setIsSubmitting(true)
      await onAdd({
        date,
        type,
        note: note.trim() ? note.trim() : undefined,
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-md">
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
        className="mt-auto flex max-h-[85vh] w-full flex-col gap-5 overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/95 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white shadow-2xl transition-transform duration-300 ease-out translate-y-0"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200/80">Nuevo turno</p>
            <h2 className="text-2xl font-semibold">Añadir rápidamente</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/5 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          <span className="font-semibold text-blue-50">{selectedDateLabel}</span>
        </div>

        {/* Campos */}
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/80">
          Tipo de turno
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ShiftType)}
            className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-white/80">
          Nota (opcional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Añade recordatorios o detalles clave"
            className="resize-none rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {submitError && <p className="text-sm text-red-400">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar turno"}
        </button>
      </form>
    </div>
  )
}
