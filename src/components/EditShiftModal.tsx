'use client'

import { useEffect, useState } from "react"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type Props = {
  shift: ShiftEvent
  onSave: (updatedShift: ShiftEvent) => void
  onDelete: (id: number) => void
  onClose: () => void
}

const shiftTypeLabels: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

export default function EditShiftModal({ shift, onSave, onDelete, onClose }: Props) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")
  const [note, setNote] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (shift) {
      setDate(shift.date)
      setType(shift.type)
      setNote(shift.note || "")
      setIsDeleting(false)
    }
  }, [shift])

  // Cerrar con Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  if (!shift) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    onSave({
      ...shift,
      date,
      type,
      note: note.trim() ? note.trim() : undefined,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Editar turno</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{shiftTypeLabels[shift.type]}</h2>
            <p className="text-sm text-slate-500">
              {new Date(shift.date).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Tipo de turno
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ShiftType)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {Object.entries(shiftTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nota del día
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Añade recordatorios, incidencias o comentarios"
              rows={4}
              className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isDeleting) {
                  setIsDeleting(true)
                  return
                }
                onDelete(shift.id)
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-200 ${
                isDeleting
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100"
              }`}
            >
              {isDeleting ? "Confirmar borrado" : "Eliminar turno"}
            </button>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!date}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
