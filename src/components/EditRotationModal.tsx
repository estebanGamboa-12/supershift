"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type {
  RotationTemplate,
  RotationTemplateAssignment,
  RotationTemplateInput,
  ShiftTemplate,
} from "@/types/templates"
import ScreenInfoIcon from "@/components/ui/ScreenInfoIcon"

type EditRotationModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: RotationTemplateInput) => Promise<void>
  template?: RotationTemplate | null
  shiftTemplates: ShiftTemplate[]
  onUpdateShiftTemplate?: (id: number, payload: { icon?: string | null; color?: string | null }) => Promise<void>
  /** Lanza el tour de onboarding del formulario (desde el botón Ver tutorial del popover) */
  onLaunchTour?: () => void
}

const MAX_ROTATION_DAYS_DESKTOP = 31
const MAX_ROTATION_DAYS_MOBILE = 31

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
  onUpdateShiftTemplate,
  onLaunchTour,
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
  const [isMobile, setIsMobile] = useState(false)
  const [templateColors, setTemplateColors] = useState<Map<number, string>>(new Map())
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [editingIcon, setEditingIcon] = useState("")
  const [editingColor, setEditingColor] = useState("#3b82f6")

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const maxDays = isMobile ? MAX_ROTATION_DAYS_MOBILE : MAX_ROTATION_DAYS_DESKTOP

  const n = assignments.length
  const spacing = n >= 28 ? 3 : 4

  // Desktop: círculo grande, misma lógica de siempre
  const desktopButtonSize = useMemo(() => {
    if (n >= 28) return 30
    if (n >= 25) return 32
    if (n > 20) return 36
    if (n > 14) return 42
    return 48
  }, [n])

  const desktopRadius = useMemo(() => {
    const circumference = n * (desktopButtonSize + spacing)
    const r = circumference / (2 * Math.PI)
    if (n >= 28) return Math.max(130, Math.min(200, r))
    if (n >= 25) return Math.max(120, Math.min(180, r))
    if (n > 20) return Math.max(110, Math.min(165, r))
    return Math.max(100, r)
  }, [n, desktopButtonSize, spacing])

  const desktopSize = useMemo(() => {
    const base = desktopRadius * 2 + desktopButtonSize
    if (n >= 28) return Math.max(320, Math.min(450, base))
    if (n >= 25) return Math.max(300, Math.min(420, base))
    if (n > 20) return Math.max(280, Math.min(380, base))
    return base + 20
  }, [desktopButtonSize, desktopRadius, n])

  // Móvil: contenedor fijo (cabe en pantalla), botones y radio calculados para una sola circunferencia perfecta
  const MOBILE_BOX = 268
  const mobileButtonSize = useMemo(() => {
    const maxB = (MOBILE_BOX - (n * spacing) / Math.PI) / (n / Math.PI + 1)
    const minSize = n >= 28 ? 18 : n > 14 ? 22 : 28
    return Math.max(minSize, Math.min(36, Math.floor(maxB)))
  }, [n, spacing])

  const mobileRadius = useMemo(() => {
    const circumference = n * (mobileButtonSize + spacing)
    return circumference / (2 * Math.PI)
  }, [n, mobileButtonSize, spacing])

  const mobileSize = MOBILE_BOX
  const mobileCenter = MOBILE_BOX / 2

  const circleButtonSize = isMobile ? mobileButtonSize : desktopButtonSize
  const circleRadius = isMobile ? mobileRadius : desktopRadius
  const circleSize = isMobile ? mobileSize : desktopSize
  const circleCenter = isMobile ? mobileCenter : desktopSize / 2

  const showIconOnCircle = n <= 18

  useEffect(() => {
    if (!open) {
      return
    }

    if (template) {
      setName(template.title)
      setIcon(template.icon ?? "🔄")
      setDescription(template.description ?? "")
      const clampedDays = Math.min(maxDays, template.daysCount)
      setDaysCount(clampedDays)
      setAssignments(buildAssignments(clampedDays, template.assignments))
      setActiveDay(0)
    } else {
      setName("")
      setIcon("🔄")
      setDescription("")
      setDaysCount(7)
      setAssignments(buildAssignments(7))
      setActiveDay(0)
    }
    
    // Cargar colores desde las plantillas
    const colorsMap = new Map<number, string>()
    shiftTemplates.forEach((t) => {
      if (t.color) {
        colorsMap.set(t.id, t.color)
      }
    })
    setTemplateColors(colorsMap)
    
    setError(null)
    setIsSubmitting(false)
    setEditingTemplateId(null)
  }, [open, template, shiftTemplates])

  useEffect(() => {
    setAssignments((current) => buildAssignments(daysCount, current))
    setActiveDay((current) => (current >= daysCount ? 0 : current))
  }, [daysCount, maxDays])

  const shiftTemplateMap = useMemo(() => {
    const map = new Map<number, ShiftTemplate>()
    shiftTemplates.forEach((template) => {
      map.set(template.id, template)
    })
    return map
  }, [shiftTemplates])

  const activeAssignment = assignments[activeDay] ?? { dayIndex: activeDay, shiftTemplateId: null }

  const handleSelectTemplate = (templateId: number | null) => {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.dayIndex === activeAssignment.dayIndex
          ? { ...assignment, shiftTemplateId: templateId }
          : assignment,
      ),
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
      const clampedDays = Math.min(maxDays, Math.max(1, daysCount))
      const payload: RotationTemplateInput = {
        title: name.trim(),
        icon: icon.trim() || "🔄",
        description: description.trim() || null,
        daysCount: clampedDays,
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950 px-3 py-4 backdrop-blur-2xl sm:px-4 sm:py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-y-auto"
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
            className="relative flex w-full flex-col rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-white shadow-[0_40px_100px_-60px_rgba(56,189,248,0.65)] sm:rounded-3xl sm:max-w-[95vw] lg:max-w-[1400px] my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-3 py-2 sm:px-4 sm:py-3">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                {isEditing ? "Editar rotación" : "Nueva rotación"}
              </h2>
              <div className="flex items-center gap-2">
                {onLaunchTour ? (
                  <ScreenInfoIcon
                    title="Nueva rotación"
                    placement="bottom"
                    onLaunchTour={onLaunchTour}
                  >
                    <p className="mb-2">Define una rotación: nombre, número de días y qué plantilla de turno corresponde a cada día. Luego la aplicas en el calendario al mes.</p>
                    <p className="text-white/80">Pulsa <strong>Ver tutorial</strong> para un recorrido paso a paso.</p>
                  </ScreenInfoIcon>
                ) : null}
                <button
                type="button"
                onClick={onClose}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-7 sm:w-7"
                aria-label="Cerrar"
              >
                ×
              </button>
              </div>
            </header>

            <div className="flex flex-1 flex-col px-3 py-2 sm:px-4 sm:py-3">
              <form id="rotation-form" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
              {/* Layout dividido: círculo a la izquierda, formulario a la derecha */}
              <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr]">
                {/* Mitad izquierda: Círculo de días. En móvil mismo círculo perfecto en caja fija 268px */}
                <div className="flex flex-col items-center justify-center min-h-0 order-2 lg:order-1 overflow-visible" data-tour="rotation-circle">
                  <div
                    className="relative flex-shrink-0 mx-auto"
                    style={{
                      width: `${circleSize}px`,
                      height: `${circleSize}px`,
                    }}
                  >
                    {/* Círculo de fondo decorativo */}
                    <div
                      className="absolute rounded-full border border-sky-400/30 bg-sky-500/10"
                      style={{ inset: `${Math.max(20, circleButtonSize * 0.85)}px` }}
                      aria-hidden
                    />
                    {assignments.map((assignment, index) => {
                      const angle = (index / assignments.length) * Math.PI * 2 - Math.PI / 2
                      const x = circleCenter + Math.cos(angle) * circleRadius
                      const y = circleCenter + Math.sin(angle) * circleRadius
                      const isActive = activeDay === index
                      const shiftTpl =
                        assignment.shiftTemplateId != null
                          ? shiftTemplateMap.get(assignment.shiftTemplateId)
                          : null
                      const templateIcon = shiftTpl?.icon ?? "○"
                      const dayColor = shiftTpl?.color ?? null
                      const dayNumber = index + 1
                      const bgStyle = dayColor
                        ? { backgroundColor: `${dayColor}40`, borderColor: `${dayColor}99` }
                        : {}
                      return (
                        <button
                          key={assignment.dayIndex}
                          type="button"
                          onClick={() => setActiveDay(index)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 flex rounded-full border p-0 transition ${
                            isActive
                              ? "border-sky-400 text-white shadow-lg shadow-sky-500/40"
                              : "border-white/10 text-white/70 hover:border-sky-400/40 hover:text-white"
                          } ${!dayColor && !isActive ? "bg-white/5" : ""} ${isActive && !dayColor ? "bg-sky-500/30" : ""}`}
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                            width: circleButtonSize,
                            height: circleButtonSize,
                            ...(dayColor ? (isActive ? { backgroundColor: `${dayColor}70`, borderColor: dayColor } : bgStyle) : {}),
                          }}
                          aria-label={`Día ${dayNumber}`}
                        >
                          <span className="flex h-full w-full flex-col items-center justify-center gap-0 text-center">
                            <span
                              className="flex items-center justify-center font-black leading-none text-white select-none tabular-nums"
                              style={{
                                fontSize: `${Math.max(11, Math.min(18, circleButtonSize * 0.5))}px`,
                                lineHeight: 1,
                                fontWeight: 800,
                                textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.6)",
                              }}
                            >
                              {dayNumber}
                            </span>
                            {showIconOnCircle && templateIcon !== "○" && (
                              <span
                                className="flex items-center justify-center leading-none opacity-70 select-none"
                                style={{ fontSize: `${Math.max(6, circleButtonSize * 0.22)}px` }}
                              >
                                {templateIcon}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="flex flex-col items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-3 text-center text-white/70 sm:px-4 sm:py-4"
                        style={{ 
                          minWidth: circleButtonSize * 2, 
                          minHeight: circleButtonSize * 2,
                          fontSize: "0.8rem"
                        }}
                      >
                        <span className="text-2xl">{icon}</span>
                        <span className="text-xs">{daysCount} días</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mitad derecha: Formulario (nombre, días, descripción) y selector de plantillas */}
                <div className="flex flex-col gap-2 overflow-hidden min-h-0 order-1 lg:order-2">
                  {/* Formulario de información básica */}
                  <div className="flex-shrink-0 space-y-2">
                    <div className="flex items-center gap-2" data-tour="rotation-name">
                      <label className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg shadow-inner shadow-black/30 sm:h-10 sm:w-10 sm:text-xl">
                        <input
                          type="text"
                          value={icon}
                          onChange={(event) => setIcon(event.target.value)}
                          maxLength={2}
                          className="h-full w-full bg-transparent text-center text-lg outline-none sm:text-xl"
                        />
                      </label>
                      <label className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[10px] text-white/60 sm:text-xs">Nombre</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Rotación principal"
                          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40 sm:px-3 sm:py-1.5 sm:text-sm"
                          required
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2" data-tour="rotation-days">
                      <label className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[10px] text-white/60 sm:text-xs">Días</span>
                        <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400/40">
                          <button
                            type="button"
                            onClick={() => setDaysCount((c) => Math.max(1, c - 1))}
                            disabled={daysCount <= 1}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-l-md text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9"
                            aria-label="Menos días"
                          >
                            <span className="text-lg font-bold leading-none">−</span>
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={maxDays}
                            value={daysCount}
                            onChange={(event) => {
                              const v = Number.parseInt(event.target.value, 10)
                              if (!Number.isNaN(v)) {
                                setDaysCount(Math.min(maxDays, Math.max(1, v)))
                              }
                            }}
                            className="w-12 flex-1 border-0 bg-transparent py-1 text-center text-xs font-semibold tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:py-1.5 sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setDaysCount((c) => Math.min(maxDays, c + 1))}
                            disabled={daysCount >= maxDays}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-r-md text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9"
                            aria-label="Más días"
                          >
                            <span className="text-lg font-bold leading-none">+</span>
                          </button>
                        </div>
                      </label>
                    </div>
                    <label className="flex flex-col gap-0.5" data-tour="rotation-description">
                      <span className="text-[10px] text-white/60 sm:text-xs">Descripción</span>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Resumen del patrón..."
                        rows={2}
                        className="resize-none rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40 sm:px-3 sm:py-1.5 sm:text-sm"
                      />
                    </label>
                  </div>

                  {/* Selector de plantillas y colores */}
                  <div className="flex flex-col gap-1.5 overflow-hidden min-h-0 flex-1" data-tour="rotation-day-selector">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold sm:text-sm">Día {activeAssignment.dayIndex + 1}</h3>
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(null)}
                        className="rounded-full border border-white/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/70 transition hover:border-red-400/40 hover:text-red-200 sm:px-2 sm:text-[9px]"
                      >
                        Limpiar
                      </button>
                    </div>

                  <div className="space-y-0.5">
                    <p className="text-[9px] text-white/60 sm:text-[10px]">Seleccionar plantilla</p>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(null)}
                        className={`w-full rounded border px-1.5 py-0.5 text-left text-[9px] transition sm:px-2 sm:py-1 sm:text-[10px] ${
                          activeAssignment.shiftTemplateId === null
                            ? "border-sky-400 bg-sky-500/30 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-sky-400/40 hover:text-white"
                        }`}
                      >
                        <span className="font-medium">Sin turno</span>
                      </button>
                      {shiftTemplates.map((item) => {
                        const templateColor = item.color || templateColors.get(item.id) || "#3b82f6"
                        const isEditing = editingTemplateId === item.id
                        return (
                          <div key={item.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSelectTemplate(item.id)}
                              className={`flex-1 rounded border px-1.5 py-0.5 text-left text-[9px] transition sm:px-2 sm:py-1 sm:text-[10px] ${
                                activeAssignment.shiftTemplateId === item.id
                                  ? "border-sky-400 bg-sky-500/30 text-white"
                                  : "border-white/10 bg-white/5 text-white/70 hover:border-sky-400/40 hover:text-white"
                              }`}
                              style={{
                                borderLeftColor: templateColor,
                                borderLeftWidth: "3px",
                              }}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingIcon}
                                    onChange={(e) => setEditingIcon(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    maxLength={2}
                                    className="w-6 rounded border border-white/20 bg-white/10 px-1 text-center text-[10px] text-white focus:border-sky-400 focus:outline-none"
                                    placeholder="🔄"
                                  />
                                  <span className="font-medium">{item.title}</span>
                                </div>
                              ) : (
                                <>
                                  <span 
                                    className="mr-1 cursor-pointer hover:scale-110 transition-transform"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingTemplateId(item.id)
                                      setEditingIcon(item.icon || "🔄")
                                      setEditingColor(templateColor)
                                    }}
                                    title="Clic para editar icono y color"
                                  >
                                    {item.icon ?? "🗓️"}
                                  </span>
                                  <span className="font-medium">{item.title}</span>
                                </>
                              )}
                              <span className="ml-1 text-white/50">({item.startTime}-{item.endTime})</span>
                            </button>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={editingColor}
                                  onChange={(e) => setEditingColor(e.target.value)}
                                  className="h-6 w-6 cursor-pointer rounded border border-white/10 bg-white/5 sm:h-7 sm:w-7"
                                />
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (onUpdateShiftTemplate) {
                                      try {
                                        await onUpdateShiftTemplate(item.id, {
                                          icon: editingIcon || null,
                                          color: editingColor,
                                        })
                                        const newColors = new Map(templateColors)
                                        newColors.set(item.id, editingColor)
                                        setTemplateColors(newColors)
                                      } catch (err) {
                                        console.error("Error actualizando plantilla", err)
                                      }
                                    }
                                    setEditingTemplateId(null)
                                  }}
                                  className="h-6 w-6 rounded border border-green-400/40 bg-green-500/20 text-[10px] text-green-100 hover:bg-green-400/30 sm:h-7 sm:w-7"
                                  title="Guardar"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTemplateId(null)
                                  }}
                                  className="h-6 w-6 rounded border border-red-400/40 bg-red-500/20 text-[10px] text-red-100 hover:bg-red-400/30 sm:h-7 sm:w-7"
                                  title="Cancelar"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <input
                                type="color"
                                value={templateColor}
                                onChange={async (e) => {
                                  const newColor = e.target.value
                                  const newColors = new Map(templateColors)
                                  newColors.set(item.id, newColor)
                                  setTemplateColors(newColors)
                                  if (onUpdateShiftTemplate) {
                                    try {
                                      await onUpdateShiftTemplate(item.id, {
                                        color: newColor,
                                      })
                                    } catch (err) {
                                      console.error("Error actualizando color", err)
                                    }
                                  }
                                }}
                                className="h-6 w-6 cursor-pointer rounded border border-white/10 bg-white/5 sm:h-7 sm:w-7"
                                title={`Color para ${item.title}`}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  </div>
                </div>
              </div>

              {error ? (
                <div className="flex-shrink-0 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm">
                  {error}
                </div>
              ) : null}

              <div className="hidden flex-shrink-0 flex-col-reverse gap-2 border-t border-white/10 pt-2 sm:flex sm:flex-row sm:justify-end sm:border-0 sm:pt-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-tour="rotation-submit"
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-5 sm:py-2 sm:text-sm"
                >
                  {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear rotación"}
                </button>
              </div>
              </form>
            </div>
            
            {/* Footer sticky para móvil - ocupa todo el ancho */}
            <div className="flex-shrink-0 border-t border-white/10 bg-slate-950 sm:hidden">
              <div className="flex w-full gap-2 px-3 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.preventDefault()
                    const form = document.getElementById("rotation-form") as HTMLFormElement
                    if (form) {
                      form.requestSubmit()
                    }
                  }}
                  data-tour="rotation-submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
