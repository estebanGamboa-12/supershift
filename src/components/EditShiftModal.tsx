'use client'

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import type { ShiftEvent, ShiftType, ShiftPluses } from "@/types/shifts"
import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { loadUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"
import type { ShiftTemplate } from "@/types/templates"
import { getTemplateDefaultPluses } from "@/lib/template-default-pluses"
import { useConfirmDelete } from "@/contexts/ConfirmDeleteContext"

type Props = {
  shift: ShiftEvent
  dayShifts?: ShiftEvent[] // Todos los turnos del día para calcular totales
  onSave: (updatedShift: {
    id: number
    date: string
    type: ShiftType
    startTime: string
    endTime: string
    note?: string
    label?: string
    color?: string
    pluses?: ShiftPluses
  }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onClose: () => void
  userId?: string | null
  shiftTemplates?: ShiftTemplate[]
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

const shiftTypeColors: Record<ShiftType, string> = {
  WORK: "#3b82f6",
  REST: "#94a3b8",
  NIGHT: "#a855f7",
  VACATION: "#10b981",
  CUSTOM: "#f59e0b",
}

export default function EditShiftModal({ shift, dayShifts = [], onSave, onDelete, onClose, shiftTemplates = [] }: Props) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("CUSTOM")
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [note, setNote] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [pluses, setPluses] = useState<ShiftPluses>({
    night: 0,
    holiday: 0,
    availability: 0,
    other: 0,
  })
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const { confirmDelete } = useConfirmDelete()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deleteError, setDeleteError] = useState("")

  // Cargar preferencias al montar y al abrir el modal (shift) para tener siempre los extras actualizados
  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded) {
      setUserPreferences(loaded.preferences)
    }
  }, [shift])

  useEffect(() => {
    if (shift) {
      setDate(shift.date)
      setType(shift.type)
      setLabel(shift.label || shiftTypeLabels[shift.type])
      setColor(shift.color || shiftTypeColors[shift.type])
      setNote(shift.note || "")
      setStartTime(shift.startTime ?? "09:00")
      setEndTime(shift.endTime ?? "17:00")
      const norm = (c: string | null | undefined) =>
        (c ?? "#3b82f6").toString().trim().toLowerCase().replace(/^(?!#)/, "#")
      const shiftColor = norm(shift.color)
      const match = shiftTemplates.find((t) => {
        const sameLabel = (t.title ?? "").trim() === (shift.label ?? "").trim()
        return sameLabel && norm(t.color) === shiftColor
      })
      const hasPluses = shift.pluses && Object.values(shift.pluses).some((v) => v > 0)
      if (hasPluses) {
        setPluses(shift.pluses!)
      } else if (match) {
        const defaultPluses = getTemplateDefaultPluses(match.id)
        setPluses(
          defaultPluses
            ? {
                night: defaultPluses.night ?? 0,
                holiday: defaultPluses.holiday ?? 0,
                availability: defaultPluses.availability ?? 0,
                other: defaultPluses.other ?? 0,
              }
            : { night: 0, holiday: 0, availability: 0, other: 0 }
        )
      } else {
        setPluses({ night: 0, holiday: 0, availability: 0, other: 0 })
      }
      setIsProcessingDelete(false)
      setSaveError("")
      setDeleteError("")
      setSelectedTemplateId(match?.id ?? null)
    }
  }, [shift, shiftTemplates])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  // Calcular horas del turno (hooks deben ir antes de cualquier return)
  const shiftHours = useMemo(() => {
    const start = startTime ? new Date(`1970-01-01T${startTime}:00`) : null
    const end = endTime ? new Date(`1970-01-01T${endTime}:00`) : null
    if (!start || !end) return 0
    const endDate = new Date(end)
    if (endDate <= start) {
      endDate.setDate(endDate.getDate() + 1)
    }
    const diffMinutes = Math.round((endDate.getTime() - start.getTime()) / 60000)
    return diffMinutes / 60
  }, [startTime, endTime])

  const formattedShiftHours = shift ? `${Math.floor(shiftHours)}h ${String(Math.round((shiftHours % 1) * 60)).padStart(2, "0")}m` : ""

  // Calcular horas totales del día
  const totalDayHours = useMemo(() => {
    if (!shift) return 0
    const allShifts = dayShifts.length > 0 ? dayShifts : [shift]
    return allShifts.reduce((total, s) => {
      if (!s.startTime || !s.endTime) return total
      const start = new Date(`1970-01-01T${s.startTime}:00`)
      const end = new Date(`1970-01-01T${s.endTime}:00`)
      const endDate = new Date(end)
      if (endDate <= start) {
        endDate.setDate(endDate.getDate() + 1)
      }
      const diffMinutes = Math.round((endDate.getTime() - start.getTime()) / 60000)
      return total + diffMinutes / 60
    }, 0)
  }, [dayShifts, shift])

  const formattedTotalDayHours = shift ? `${Math.floor(totalDayHours)}h ${String(Math.round((totalDayHours % 1) * 60)).padStart(2, "0")}m` : ""

  // Extras seleccionados: ids reales de userPreferences.shiftExtras (por índice con plusKeys)
  const selectedExtras = useMemo(() => {
    const list = userPreferences.shiftExtras ?? []
    const ids: string[] = []
    const plusKeys: (keyof ShiftPluses)[] = ["night", "holiday", "availability", "other"]
    plusKeys.forEach((key, index) => {
      if ((pluses[key] ?? 0) > 0 && list[index]) ids.push(list[index].id)
    })
    return ids
  }, [pluses, userPreferences.shiftExtras])

  const totalEarned = useMemo(() => {
    const hourlyRate = userPreferences.hourlyRate ?? 0
    const hoursEarned = totalDayHours * hourlyRate
    const extrasEarned = selectedExtras.reduce((total, extraId) => {
      const extra = userPreferences.shiftExtras?.find((e) => e.id === extraId)
      return total + (extra?.value ?? 0)
    }, 0)
    return hoursEarned + extrasEarned
  }, [totalDayHours, selectedExtras, userPreferences])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !startTime || !endTime || isSaving) return
    setSaveError("")
    try {
      setIsSaving(true)
      const finalType: ShiftType = "CUSTOM"
      const finalLabel = label.trim() ? label.trim() : undefined
      const finalColor = color || "#3b82f6"

      await onSave({
        id: shift.id,
        date,
        type: finalType,
        startTime,
        endTime,
        note: note.trim() ? note.trim() : undefined,
        label: finalLabel,
        color: finalColor,
        pluses: Object.values(pluses).some(v => v > 0) ? pluses : undefined,
      })
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el turno.")
    } finally {
      setIsSaving(false)
    }
  }

  const formattedDate = date ? format(new Date(date + "T00:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es }) : ""

  if (!shift) return null

  return (
    <AnimatePresence>
      {shift && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-2xl px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-[calc(100vw-2rem)] max-w-2xl flex flex-col rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/85 p-4 sm:p-5 text-white shadow-[0_30px_80px_-48px_rgba(59,130,246,0.6)] my-4 mb-8"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Editar turno</h2>
                {formattedDate && (
                  <p className="mt-0.5 text-xs text-white/60 capitalize">{formattedDate}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 text-xl"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Form - No internal scroll */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-2 min-h-0">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-white">
                  Fecha
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2.5 text-sm font-medium text-white focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    required
                  />
                </label>
                <div className="sm:col-span-2 flex flex-col gap-3">
                  <span className="text-sm font-semibold text-white">Tipo de turno</span>
                  {shiftTemplates.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs text-white/60">
                      No tienes plantillas de turno. Créalas en{" "}
                      <Link href="/templates" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                        Plantillas
                      </Link>{" "}
                      (Trabajo, Nocturno, Descanso, etc.) y aparecerán aquí.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {shiftTemplates.map((tpl) => {
                        const tplColor = tpl.color ?? "#3b82f6"
                        const isSelected = selectedTemplateId === tpl.id
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(tpl.id)
                              setType("CUSTOM")
                              setLabel(tpl.title)
                              setColor(tplColor)
                              setStartTime(tpl.startTime)
                              setEndTime(tpl.endTime)
                              const defaultPluses = getTemplateDefaultPluses(tpl.id)
                              setPluses(
                                defaultPluses
                                  ? {
                                      night: defaultPluses.night ?? 0,
                                      holiday: defaultPluses.holiday ?? 0,
                                      availability: defaultPluses.availability ?? 0,
                                      other: defaultPluses.other ?? 0,
                                    }
                                  : { night: 0, holiday: 0, availability: 0, other: 0 }
                              )
                            }}
                            className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/50 ${
                              isSelected
                                ? "border-white/40 text-white shadow-lg"
                                : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: tplColor + "40", borderColor: tplColor }
                                : { borderColor: "rgba(255,255,255,0.15)" }
                            }
                          >
                            {tpl.icon ? `${tpl.icon} ` : ""}{tpl.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <label className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 shadow-lg" style={{ backgroundColor: color + "30", borderColor: color + "60" }}>
                    <span className="sr-only">Color</span>
                    <div className="h-full w-full rounded-lg" style={{ backgroundColor: color }} />
                  </label>
                  <label className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-semibold text-white">Color</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-2 border-white/20 bg-white/10 shadow-md hover:scale-110 transition-transform"
                      title="Seleccionar color"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">
                    Texto del turno
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder={shiftTypeLabels[type]}
                      className="mt-1 w-full rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-inner shadow-black/20 focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-white">
                    Nota
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Comentario o recordatorio..."
                      rows={2}
                      className="mt-1 w-full resize-none rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-inner shadow-black/20 placeholder:text-white/50 focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40 min-h-[50px]"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-white">
                  Hora de entrada
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-white">
                  Hora de salida
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    required
                  />
                </label>
              </div>
              <p className="text-sm text-white/80">
                Duración: <span className="font-semibold text-white">{formattedShiftHours}</span>
                {totalEarned > 0 && (
                  <>
                    {" · "}
                    Estimado: <span className="font-semibold text-emerald-400">{totalEarned.toFixed(2).replace(".", ",")}€</span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Horas turno</p>
                  <p className="text-base font-bold text-white">{formattedShiftHours}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Horas día</p>
                  <p className="text-base font-bold text-white">{formattedTotalDayHours}</p>
                </div>
                {totalEarned > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Total</p>
                    <p className="text-base font-bold text-emerald-400">{totalEarned.toFixed(2)}€</p>
                  </div>
                )}
              </div>

              {/* Añadir extras a este turno (misma estructura que el sheet de nuevo turno) */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Extras</p>
                {(userPreferences.shiftExtras ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-3 text-[11px] text-white/50">
                    Si quieres añadir extras a este turno (nocturno, festivo, disponibilidad…), créalos en{" "}
                    <Link href="/extras" className="font-semibold text-sky-400 hover:text-sky-300 underline">
                      Extras
                    </Link>{" "}
                    y podrás elegirlos aquí.
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border-2 border-white/20 bg-white/10 p-2">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(userPreferences.shiftExtras ?? []).slice(0, 4).map((extra, index) => {
                          const plusKeys: (keyof ShiftPluses)[] = ["night", "holiday", "availability", "other"]
                          const key = plusKeys[index]
                          const isSelected = (pluses[key] ?? 0) > 0
                          const inputId = `edit-shift-extra-${shift.id}-${extra.id}`
                          return (
                            <label
                              key={extra.id}
                              htmlFor={inputId}
                              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-xs font-semibold transition select-none touch-manipulation ${
                                isSelected
                                  ? "border-white/40 bg-white/15 shadow-md"
                                  : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10 active:bg-white/15"
                              }`}
                              style={isSelected ? { borderColor: (extra.color ?? "#3b82f6") + "80", backgroundColor: (extra.color ?? "#3b82f6") + "20" } : {}}
                            >
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  setPluses((prev) => ({ ...prev, [key]: checked ? 1 : 0 }))
                                }}
                                className="h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-white/30 bg-white/10 accent-sky-500"
                                aria-label={`Extra: ${extra.name}`}
                              />
                              <span className="min-w-0 flex-1 truncate font-semibold text-white">{extra.name}</span>
                              <span className="shrink-0 text-xs font-bold text-white/80">{extra.value}€</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    {selectedExtras.length > 0 && (
                      <p className="mt-2 text-[9px] text-white/50">
                        Extras: {selectedExtras.map(id => {
                          const extra = userPreferences.shiftExtras?.find(e => e.id === id)
                          return extra ? `${extra.name} (+${extra.value}€)` : null
                        }).filter(Boolean).join(", ")}
                      </p>
                    )}
                    {(userPreferences.shiftExtras ?? []).length > 4 && (
                      <p className="mt-2 text-[8px] text-white/40 italic">
                        Nota: Solo los primeros 4 extras se pueden asignar por turno. Gestiona tus extras en Extras.
                      </p>
                    )}
                  </>
                )}
              </div>

              {(saveError || deleteError) && (
                <div className="rounded-2xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {saveError || deleteError}
                </div>
              )}
            </form>

            {/* Botones fijos abajo */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  confirmDelete({
                    itemName: "este turno",
                    onConfirm: async () => {
                      try {
                        setIsProcessingDelete(true)
                        await onDelete(shift.id)
                        onClose()
                      } catch (error) {
                        setDeleteError(error instanceof Error ? error.message : "Error al eliminar.")
                      } finally {
                        setIsProcessingDelete(false)
                      }
                    },
                  })
                }}
                disabled={isProcessingDelete}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-300 transition hover:border-red-400/50 hover:bg-red-500/20 ${isProcessingDelete ? "opacity-60" : ""}`}
              >
                {isProcessingDelete ? (
                  <>
                    <Spinner /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Eliminar
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.querySelector('form') as HTMLFormElement
                    if (form) form.requestSubmit()
                  }}
                  disabled={!date || isSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_20px_45px_-22px_rgba(14,165,233,0.6)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
