'use client'

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import { CalendarDays, Trash2, Save, X } from "lucide-react"

type Props = {
  shift: ShiftEvent
  onSave: (updatedShift: { id: number; date: string; type: ShiftType; note?: string }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onClose: () => void
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

export default function EditShiftModal({ shift, onSave, onDelete, onClose }: Props) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")
  const [note, setNote] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    if (shift) {
      setDate(shift.date)
      setType(shift.type)
      setNote(shift.note || "")
      setIsDeleting(false)
      setIsProcessingDelete(false)
      setSaveError("")
      setDeleteError("")
    }
  }, [shift])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  if (!shift) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || isSaving) return
    setSaveError("")
    try {
      setIsSaving(true)
      await onSave({ id: shift.id, date, type, note: note.trim() ? note.trim() : undefined })
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el turno.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {shift && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm sm:max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/95 text-white shadow-xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                <h2 className="text-base font-semibold tracking-wide">
                  {shiftTypeLabels[shift.type]}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
              <div>
                <label className="text-xs text-white/70">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
              </div>

              <div>
                <label className="text-xs text-white/70">Tipo de turno</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ShiftType)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                >
                  {Object.entries(shiftTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white/70">Nota</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Comentario o recordatorio..."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-400/30"
                />
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!isDeleting) return setIsDeleting(true)
                    try {
                      setIsProcessingDelete(true)
                      await onDelete(shift.id)
                      onClose()
                    } catch (error) {
                      setDeleteError(error instanceof Error ? error.message : "Error al eliminar.")
                      setIsProcessingDelete(false)
                    }
                  }}
                  disabled={isProcessingDelete}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    isDeleting
                      ? "border-red-500 bg-red-500 text-white hover:bg-red-400"
                      : "border-red-400/30 bg-red-500/10 text-red-300 hover:border-red-400/50 hover:bg-red-500/20"
                  } ${isProcessingDelete ? "opacity-60" : ""}`}
                >
                  {isProcessingDelete ? (
                    <>
                      <Spinner /> Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      {isDeleting ? "Confirmar" : "Eliminar"}
                    </>
                  )}
                </button>

                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!date || isSaving}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Spinner /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Guardar
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
