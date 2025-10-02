"use client"

import { useEffect, useState } from "react"
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
    onAdd({ date, type, note: note.trim() ? note.trim() : undefined })
    setDate("")
    setType("WORK")
    setNote("")
    setError("")
  }

  return (
    <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800">Añadir turno manualmente</h2>
        <p className="text-sm text-slate-500">
          Selecciona una fecha, el tipo de turno y deja una nota opcional para recordatorios o
          incidencias.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Tipo de turno
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ShiftType)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {Object.entries(shiftTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
          Nota (opcional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Añade detalles como incidencias, recordatorios o metas"
            rows={1}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          />
        </label>
        <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3">
          {error && <span className="text-sm text-red-500">{error}</span>}
          <button
            type="submit"
            className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Guardar turno
          </button>
        </div>
      </form>
    </div>
  )
}
