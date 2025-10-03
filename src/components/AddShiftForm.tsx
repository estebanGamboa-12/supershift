"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { ShiftType } from "@/types/shifts"

type Props = {
  onAdd: (shift: { date: string; type: ShiftType; note?: string }) => Promise<void>
  selectedDate?: string | null
  onDateConsumed?: () => void
}

const shiftTypeLabels: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

function Spinner() {
  return (
    <motion.div
      className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  )
}

export default function AddShiftForm({ onAdd, selectedDate, onDateConsumed }: Props) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedDateLabel = useMemo(() => {
    if (!date) return "Selecciona una fecha para el turno"
    try {
      const parsed = new Date(date)
      return parsed.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    } catch {
      return "Selecciona una fecha válida"
    }
  }, [date])

  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate)
      onDateConsumed?.()
    }
  }, [selectedDate, onDateConsumed])

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
      setDate("")
      setType("WORK")
      setNote("")
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold text-white">Añadir turno manualmente</h2>
        <p className="text-xs text-white/60">
          Selecciona una fecha, el tipo de turno y deja una nota opcional para recordatorios.
        </p>
        <div className="mt-3 inline-flex flex-col rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-100">
          <span className="text-sm font-bold text-blue-200">{selectedDateLabel}</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="text-xs uppercase tracking-wide text-white/40">
            Detalles del turno
          </legend>

          <label htmlFor="date" className="flex flex-col gap-1 text-sm text-white/70">
            Fecha
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>

          <label htmlFor="type" className="flex flex-col gap-1 text-sm text-white/70">
            Tipo de turno
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value as ShiftType)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {Object.entries(shiftTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="note" className="flex flex-col gap-1 text-sm text-white/70">
            Nota (opcional)
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Añade detalles como incidencias, recordatorios o metas"
              rows={3}
              className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
        </fieldset>

        {/* Botón */}
        <div className="flex flex-col gap-2">
          {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
          {submitError && <span role="alert" className="text-sm text-red-400">{submitError}</span>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!date || isSubmitting}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Spinner /> Guardando...
              </>
            ) : (
              "Guardar turno"
            )}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
