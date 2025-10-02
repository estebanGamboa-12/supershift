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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-950 text-white shadow-2xl shadow-blue-500/20">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
              Editar turno
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              {shiftTypeLabels[shift.type]}
            </h2>
            <p className="text-sm text-white/60">
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
            className="rounded-full border border-white/10 bg-white/5 p-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <label className="flex flex-col gap-1 text-sm text-white/70">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Tipo de turno
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ShiftType)}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            >
              {Object.entries(shiftTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Nota del día
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Añade recordatorios, incidencias o comentarios"
              rows={4}
              className="resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
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
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400/30 ${
                isDeleting
                  ? "border-red-500 bg-red-500 text-white hover:bg-red-400"
                  : "border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/20"
              }`}
            >
              {isDeleting ? "Confirmar borrado" : "Eliminar turno"}
            </button>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!date}
                className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:opacity-50"
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
