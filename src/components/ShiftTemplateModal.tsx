"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import type { ShiftTemplate, ShiftTemplateInput } from "@/types/templates"
import type { ShiftPluses } from "@/types/shifts"
import { loadUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"

const DEFAULT_PLUSES: ShiftPluses = {
  night: 0,
  holiday: 0,
  availability: 0,
  other: 0,
}

type CustomShiftTypeItem = {
  id: string
  name: string
  color: string
  icon?: string
  defaultStartTime?: string | null
  defaultEndTime?: string | null
}

export type ShiftTemplateSubmitPayload = ShiftTemplateInput & { defaultPluses?: ShiftPluses }

type ShiftTemplateModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: ShiftTemplateSubmitPayload) => Promise<void>
  template?: ShiftTemplate | null
  /** Extras por defecto para esta plantilla (p. ej. desde localStorage). */
  initialDefaultPluses?: ShiftPluses | null
  title?: string
  customShiftTypes?: CustomShiftTypeItem[]
}

export default function ShiftTemplateModal({
  open,
  onClose,
  onSubmit,
  template,
  initialDefaultPluses,
  title = "Nueva plantilla de turno",
  customShiftTypes = [],
}: ShiftTemplateModalProps) {
  const [formTitle, setFormTitle] = useState("")
  const [icon, setIcon] = useState("🗓️")
  const [color, setColor] = useState("#3b82f6")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [location, setLocation] = useState("")
  const [defaultPluses, setDefaultPluses] = useState<ShiftPluses>({ ...DEFAULT_PLUSES })
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const loaded = loadUserPreferences()
    if (loaded?.preferences) setUserPreferences(loaded.preferences)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (template) {
      setFormTitle(template.title)
      setIcon(template.icon ?? "🗓️")
      setColor(template.color ?? "#3b82f6")
      setStartTime(template.startTime)
      setEndTime(template.endTime)
      setLocation(template.location ?? "")
      setDefaultPluses(initialDefaultPluses ?? { ...DEFAULT_PLUSES })
    } else {
      setFormTitle("")
      setIcon("🗓️")
      setColor("#3b82f6")
      setStartTime("09:00")
      setEndTime("17:00")
      setLocation("")
      setDefaultPluses({ ...DEFAULT_PLUSES })
    }
    setError(null)
    setIsSubmitting(false)
  }, [open, template, initialDefaultPluses])

  const isValid = useMemo(() => {
    return formTitle.trim().length > 0 && startTime.trim() && endTime.trim()
  }, [formTitle, startTime, endTime])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const payload: ShiftTemplateSubmitPayload = {
        title: formTitle.trim(),
        icon: icon.trim().length > 0 ? icon : "🗓️",
        color: color,
        startTime,
        endTime,
        breakMinutes: null,
        alertMinutes: null,
        location: location.trim() || null,
        defaultPluses: Object.values(defaultPluses).some((v) => v > 0) ? defaultPluses : undefined,
      }

      await onSubmit(payload)
      onClose()
    } catch (submitError) {
      console.error("Error guardando la plantilla de turno", submitError)
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la plantilla de turno. Inténtalo de nuevo.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-2xl px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/85 p-6 text-white shadow-[0_30px_80px_-48px_rgba(59,130,246,0.6)] my-4 mb-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">Plantillas</p>
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm text-white/60">
                  Configura un turno base con horarios, descansos y alertas reutilizables.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!template && customShiftTypes.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    Crear desde tipo de turno
                  </p>
                  <select
                    value=""
                    onChange={(e) => {
                      const id = e.target.value
                      if (!id) return
                      const ct = customShiftTypes.find((t) => t.id === id)
                      if (ct) {
                        setFormTitle(ct.name)
                        setColor(ct.color)
                        setIcon(ct.icon?.slice(0, 2) ?? "🗓️")
                        if (ct.defaultStartTime) setStartTime(ct.defaultStartTime)
                        if (ct.defaultEndTime) setEndTime(ct.defaultEndTime)
                        e.target.value = ""
                      }
                    }}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  >
                    <option value="">Elige un tipo para rellenar título y horario</option>
                    {customShiftTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.icon ? `${ct.icon} ` : ""}{ct.name}
                        {ct.defaultStartTime && ct.defaultEndTime ? ` (${ct.defaultStartTime}-${ct.defaultEndTime})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="flex flex-col items-center gap-2">
                  <label className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl shadow-inner shadow-black/30" style={{ backgroundColor: color + "20", borderColor: color + "40" }}>
                    <span className="sr-only">Icono</span>
                    <input
                      type="text"
                      value={icon}
                      onChange={(event) => setIcon(event.target.value)}
                      maxLength={2}
                      className="h-full w-full bg-transparent text-center text-3xl outline-none"
                    />
                  </label>
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-xs text-white/60">Color</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                      title="Seleccionar color"
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/80">
                    Título
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(event) => setFormTitle(event.target.value)}
                      placeholder="Turno de mañana"
                      className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 shadow-inner shadow-black/20 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-white/80">
                    Ubicación
                    <input
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Clínica central"
                      className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 shadow-inner shadow-black/20 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-white/80">
                  Hora de inicio
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/80">
                  Hora de fin
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    required
                  />
                </label>
              </div>

              {/* Extras por defecto para esta plantilla */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Extras por defecto</p>
                {(userPreferences.shiftExtras ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-3 text-[11px] text-white/50">
                    Si quieres que esta plantilla lleve extras (nocturno, festivo…), créalos en{" "}
                    <Link href="/extras" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                      Extras
                    </Link>{" "}
                    y podrás elegirlos aquí. Al usar la plantilla en un turno se aplicarán estos extras.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(userPreferences.shiftExtras ?? []).slice(0, 4).map((extra, index) => {
                      const plusKeys: (keyof ShiftPluses)[] = ["night", "holiday", "availability", "other"]
                      const key = plusKeys[index]
                      const isSelected = (defaultPluses[key] ?? 0) > 0
                      return (
                        <label
                          key={extra.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition ${
                            isSelected
                              ? "border-white/40 bg-white/15"
                              : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          }`}
                          style={isSelected ? { borderColor: (extra.color ?? "#3b82f6") + "80", backgroundColor: (extra.color ?? "#3b82f6") + "20" } : {}}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setDefaultPluses((prev) => ({ ...prev, [key]: e.target.checked ? 1 : 0 }))
                            }
                            className="h-4 w-4 rounded border-2 border-white/30 bg-white/10 accent-sky-500"
                          />
                          <span className="flex-1 truncate text-white">{extra.name}</span>
                          <span className="text-xs font-bold text-white/80">{extra.value}€</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_20px_45px_-22px_rgba(14,165,233,0.6)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
