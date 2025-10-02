"use client"

import { useEffect, useMemo, useState } from "react"
import type { ShiftType } from "@/types/shifts"

type Props = {
  onAdd: (shift: { date: string; type: ShiftType; note?: string }) => void
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

export default function AddShiftForm({ onAdd, selectedDate, onDateConsumed }: Props) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const selectedDateLabel = useMemo(() => {
    if (!date) return "Selecciona una fecha para el turno"
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

  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate)
      onDateConsumed?.()
    }
  }, [selectedDate, onDateConsumed])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!date) {
      setError("Selecciona una fecha para el turno")
      return
    }
    setError("")
    onAdd({ date, type, note: note.trim() ? note.trim() : undefined })
    setDate("")
    setType("WORK")
    setNote("")
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/80 to-slate-950/90 shadow-2xl shadow-blue-500/10 backdrop-blur">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Añadir turno manualmente</h2>
            <p className="text-sm text-white/60">
              Selecciona una fecha, el tipo de turno y deja una nota opcional para recordatorios o incidencias.
            </p>
          </div>
          <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/50 sm:inline-flex">
            Entrada rápida
          </span>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-100">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-300" aria-hidden />
          {selectedDateLabel}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:items-start md:grid-cols-4"
      >
        <label htmlFor="date" className="flex flex-col gap-1 text-sm text-white/70">
          Fecha
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <label htmlFor="type" className="flex flex-col gap-1 text-sm text-white/70">
          Tipo de turno
          <select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value as ShiftType)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {Object.entries(shiftTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="note" className="flex flex-col gap-1 text-sm text-white/70 md:col-span-2">
          Nota (opcional)
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Añade detalles como incidencias, recordatorios o metas"
            rows={2}
            className="min-h-[2.5rem] resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:col-span-4">
          {error && (
            <span role="alert" className="text-sm text-red-300">
              {error}
            </span>
          )}
          <button
            type="submit"
            disabled={!date}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400/60 sm:ml-auto sm:w-auto"
          >
            Guardar turno
          </button>
        </div>
      </form>
    </div>
  )
}
