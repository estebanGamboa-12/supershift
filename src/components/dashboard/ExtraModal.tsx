"use client"

import { useEffect, useState } from "react"
import type { FC } from "react"
import type { ShiftExtra } from "@/types/preferences"
import NumberInput from "@/components/NumberInput"

export type ExtraFormPayload = {
  name: string
  value: number
  color: string
}

type ExtraModalProps = {
  open: boolean
  onClose: () => void
  /** null = crear, ShiftExtra = editar */
  extra: ShiftExtra | null
  onSubmit: (data: ExtraFormPayload) => Promise<void>
}

const ExtraModal: FC<ExtraModalProps> = ({ open, onClose, extra, onSubmit }) => {
  const [name, setName] = useState("")
  const [value, setValue] = useState(0)
  const [color, setColor] = useState("#3b82f6")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = extra != null

  useEffect(() => {
    if (!open) return
    if (extra) {
      setName(extra.name)
      setValue(extra.value)
      setColor(extra.color ?? "#3b82f6")
    } else {
      setName("")
      setValue(0)
      setColor("#3b82f6")
    }
    setError(null)
    setIsSubmitting(false)
  }, [open, extra])

  useEffect(() => {
    if (!open) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Escribe un nombre para el extra.")
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ name: trimmedName, value, color })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extra-modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
          <h2 id="extra-modal-title" className="text-lg font-semibold text-white">
            {isEdit ? "Editar extra" : "Crear extra"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="rounded-xl bg-red-500/20 border border-red-400/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Nocturno, Festivo"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Valor (€)
            </label>
            <NumberInput
              value={value}
              onChange={setValue}
              min={0}
              step={0.01}
              suffix="€"
              allowEmpty={false}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-white/20 bg-white/5"
                title="Color"
              />
              <span className="text-sm text-white/70">{color}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExtraModal
