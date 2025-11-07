"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type {
  RotationTemplate,
  RotationTemplateAssignment,
  RotationTemplateInput,
  ShiftTemplate,
} from "@/types/templates"

type EditRotationModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: RotationTemplateInput) => Promise<void>
  template?: RotationTemplate | null
  shiftTemplates: ShiftTemplate[]
}

function buildAssignments(length: number, seed?: RotationTemplateAssignment[]): RotationTemplateAssignment[] {
  const next: RotationTemplateAssignment[] = []
  for (let index = 0; index < length; index += 1) {
    const existing = seed?.find((assignment) => assignment.dayIndex === index)
    next.push({ dayIndex: index, shiftTemplateId: existing?.shiftTemplateId ?? null })
  }
  return next
}

export default function EditRotationModal({
  open,
  onClose,
  onSubmit,
  template,
  shiftTemplates,
}: EditRotationModalProps) {
  const isEditing = Boolean(template && template.id > 0)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("🔄")
  const [description, setDescription] = useState("")
  const [daysCount, setDaysCount] = useState(7)
  const [assignments, setAssignments] = useState<RotationTemplateAssignment[]>(() => buildAssignments(7))
  const [activeDay, setActiveDay] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    if (template) {
      setName(template.title)
      setIcon(template.icon ?? "🔄")
      setDescription(template.description ?? "")
      setDaysCount(template.daysCount)
      setAssignments(buildAssignments(template.daysCount, template.assignments))
      setActiveDay(0)
    } else {
      setName("")
      setIcon("🔄")
      setDescription("")
      setDaysCount(7)
      setAssignments(buildAssignments(7))
      setActiveDay(0)
    }
    setError(null)
    setIsSubmitting(false)
  }, [open, template])

  useEffect(() => {
    setAssignments((current) => buildAssignments(daysCount, current))
    setActiveDay((current) => (current >= daysCount ? 0 : current))
  }, [daysCount])

  const activeAssignment = assignments[activeDay] ?? { dayIndex: activeDay, shiftTemplateId: null }

  const activeTemplate = useMemo(() => {
    if (activeAssignment.shiftTemplateId == null) {
      return null
    }
    return shiftTemplates.find((item) => item.id === activeAssignment.shiftTemplateId) ?? null
  }, [activeAssignment.shiftTemplateId, shiftTemplates])

  const handleSelectTemplate = (templateId: number | null) => {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.dayIndex === activeAssignment.dayIndex
          ? { ...assignment, shiftTemplateId: templateId }
          : assignment,
      ),
    )
  }

  const handleApplyToAll = (templateId: number | null) => {
    setAssignments((current) =>
      current.map((assignment) => ({ ...assignment, shiftTemplateId: templateId })),
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError("Indica un nombre para la rotación")
      return
    }
    if (daysCount <= 0) {
      setError("La rotación debe tener al menos un día")
      return
    }
    if (isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const payload: RotationTemplateInput = {
        title: name.trim(),
        icon: icon.trim() || "🔄",
        description: description.trim() || null,
        daysCount,
        assignments: assignments.map((assignment) => ({
          dayIndex: assignment.dayIndex,
          shiftTemplateId: assignment.shiftTemplateId ?? null,
        })),
      }
      await onSubmit(payload)
      onClose()
    } catch (submitError) {
      console.error("Error guardando la plantilla de rotación", submitError)
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la plantilla de rotación. Inténtalo de nuevo.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl px-3"
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
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-4xl rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/80 p-6 text-white shadow-[0_40px_100px_-60px_rgba(56,189,248,0.65)]"
          >
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">Rotaciones</p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {isEditing ? "Editar rotación" : "Nueva rotación"}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Define un patrón circular asignando plantillas de turno a cada día del ciclo.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="self-start rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                <label className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl shadow-inner shadow-black/30">
                  <span className="sr-only">Icono</span>
                  <input
                    type="text"
                    value={icon}
                    onChange={(event) => setIcon(event.target.value)}
                    maxLength={2}
                    className="h-full w-full bg-transparent text-center text-3xl outline-none"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-white/80">
                    Nombre de la rotación
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Rotación principal"
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-white/80">
                    Días del ciclo
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={daysCount}
                      onChange={(event) => setDaysCount(Math.min(31, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-2 text-sm text-white/80">
                    Descripción
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Resumen del patrón o indicaciones para el equipo"
                      rows={3}
                      className="resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-72 w-72 max-w-full">
                    <div className="absolute inset-[15%] rounded-full border border-sky-400/30 bg-sky-500/10" aria-hidden />
                    {assignments.map((assignment, index) => {
                      const angle = (index / assignments.length) * Math.PI * 2 - Math.PI / 2
                      const radius = 115
                      const x = 120 + Math.cos(angle) * radius
                      const y = 120 + Math.sin(angle) * radius
                      const isActive = activeDay === index
                      const label =
                        assignment.shiftTemplateId != null
                          ? shiftTemplates.find((item) => item.id === assignment.shiftTemplateId)?.icon ?? "🗓️"
                          : "○"
                      return (
                        <button
                          key={assignment.dayIndex}
                          type="button"
                          onClick={() => setActiveDay(index)}
                          className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xl transition ${
                            isActive
                              ? "border-sky-400 bg-sky-500/30 text-white shadow-lg shadow-sky-500/40"
                              : "border-white/10 bg-white/5 text-white/70 hover:border-sky-400/40 hover:text-white"
                          }`}
                          style={{ left: `${x}px`, top: `${y}px` }}
                          aria-label={`Día ${index + 1}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center rounded-full border border-white/10 bg-white/5 px-6 py-6 text-center text-sm text-white/70">
                        <span className="text-3xl">{icon}</span>
                        <span>{daysCount} días</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/50">
                    Selecciona un día para asignar o cambiar su plantilla de turno.
                  </p>
                </div>

                <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/40">Día seleccionado</p>
                      <h3 className="text-xl font-semibold">Día {activeAssignment.dayIndex + 1}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(null)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-red-400/40 hover:text-red-200"
                    >
                      Limpiar
                    </button>
                  </header>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/80">
                      Seleccionar plantilla
                      <select
                        value={activeAssignment.shiftTemplateId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value
                          handleSelectTemplate(value ? Number.parseInt(value, 10) : null)
                        }}
                        className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      >
                        <option value="">Sin turno asignado</option>
                        {shiftTemplates.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.icon ?? "🗓️"} {item.title} ({item.startTime} - {item.endTime})
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-2 text-xs text-white/60">
                      <p>
                        <span className="block text-[11px] uppercase tracking-[0.3em] text-white/40">
                          Turno asignado
                        </span>
                        {activeTemplate
                          ? `${activeTemplate.title} · ${activeTemplate.startTime} - ${activeTemplate.endTime}`
                          : "Sin turno"}
                      </p>
                      <p>
                        <span className="block text-[11px] uppercase tracking-[0.3em] text-white/40">
                          Ubicación
                        </span>
                        {activeTemplate?.location ?? "No especificada"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Asignar rápidamente</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shiftTemplates.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTemplate(item.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-sky-400/50 hover:text-white"
                        >
                          <span className="text-base">{item.icon ?? "🗓️"}</span>
                          {item.title}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleApplyToAll(activeAssignment.shiftTemplateId ?? null)}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 shadow hover:bg-sky-400/30"
                      >
                        Aplicar a todos
                      </button>
                    </div>
                  </div>
                </div>
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
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_24px_48px_-28px_rgba(16,185,129,0.65)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear rotación"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
