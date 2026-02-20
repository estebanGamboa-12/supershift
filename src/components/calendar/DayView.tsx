"use client"

import type { FC } from "react"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import {
  DndContext,
  useDraggable,
  useDroppable,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from "@dnd-kit/core"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import { formatCompactDate } from "@/lib/formatDate"

const HOUR_START = 0
const HOUR_END = 24
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60
const HOUR_HEIGHT = 64
const SNAP_INTERVAL = 15
const MIN_EVENT_DURATION = 15
const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_SPEED = 8

function parseTimeToMinutes(value: string | null | undefined): number {
  if (!value) return 0
  const [h, m] = value.split(":").map(Number)
  if (Number.isNaN(h)) return 0
  return (h ?? 0) * 60 + (Number.isNaN(m) ? 0 : m)
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function snapToInterval(minutes: number, interval: number = SNAP_INTERVAL): number {
  return Math.round(minutes / interval) * interval
}

function shiftToPosition(shift: ShiftEvent): { top: number; height: number } {
  const startM = parseTimeToMinutes(shift.startTime)
  const endM = shift.endTime
    ? parseTimeToMinutes(shift.endTime)
    : startM + (shift.durationMinutes || 60)
  const dayStartM = HOUR_START * 60
  const startOffset = Math.max(0, startM - dayStartM)
  const duration = Math.max(30, endM - startM)
  const top = (startOffset / TOTAL_MINUTES) * 100
  const height = (duration / TOTAL_MINUTES) * 100
  return {
    top: Math.max(0, Math.min(top, 100)),
    height: Math.max(6, Math.min(height, 100 - top)),
  }
}

// Componente DroppableTimeline usando @dnd-kit
type DroppableTimelineProps = {
  children: React.ReactNode
  isSelecting: boolean
}

const DroppableTimeline: FC<DroppableTimelineProps> = ({ children, isSelecting }) => {
  const { setNodeRef } = useDroppable({
    id: "timeline",
  })

  return (
    <div
      ref={setNodeRef}
      className="relative flex-1 bg-slate-950/20 py-2 select-none"
      style={{ pointerEvents: isSelecting ? "none" : "auto" }}
    >
      {children}
    </div>
  )
}

// Componente DraggableShift usando @dnd-kit
type DraggableShiftProps = {
  shift: ShiftEvent
  shiftTypeLabels: Record<ShiftType, string>
  isDragging: boolean
  isEditing: boolean
  isEditingTop: boolean
  isEditingBottom: boolean
  onSelectEvent: (shift: ShiftEvent) => void
  onUpdateShift?: (shift: ShiftEvent, updates: { startTime?: string; endTime?: string }) => Promise<void>
}

const DraggableShift: FC<DraggableShiftProps> = ({
  shift,
  shiftTypeLabels,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop required by interface, hook provides isDndDragging
  isDragging,
  isEditing,
  isEditingTop,
  isEditingBottom,
  onSelectEvent,
  onUpdateShift,
}) => {
  const { attributes, listeners, setNodeRef, isDragging: isDndDragging } = useDraggable({
    id: String(shift.id),
    data: { shift },
  })

  const { top, height } = shiftToPosition(shift)
  const label = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
  const color = shift.color ?? "#3b82f6"
  const isShort = height < 12

  return (
    <div
      ref={setNodeRef}
      data-shift-id={shift.id}
      className="group absolute left-2 right-2 touch-none"
      style={{
        top: `${top}%`,
        height: `${Math.max(height, 10)}%`,
        opacity: isDndDragging ? 0.3 : isEditing ? 0.4 : 1,
      }}
    >
      <button
        type="button"
        data-shift-id={shift.id}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // Solo abrir formulario si no estamos arrastrando
          if (!isDndDragging) {
            e.stopPropagation()
            onSelectEvent(shift)
          }
        }}
        className={`h-full w-full rounded-xl border px-3 py-2 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-slate-950 touch-none ${
          isDndDragging ? "ring-2 ring-white/50 ring-offset-2 ring-offset-slate-950 cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundColor: `${color}E6`,
          color: "#ffffff",
          borderColor: `${color}CC`,
          boxShadow: isDndDragging
            ? `0 8px 24px -4px ${color}80, 0 0 0 2px ${color}FF`
            : `0 4px 12px -2px ${color}40, 0 0 0 1px ${color}33`,
          transform: isDndDragging ? "scale(1.05)" : undefined,
          touchAction: "none",
        }}
      >
        <span className={`block font-bold ${isShort ? "text-xs" : "text-sm"}`}>{label}</span>
        {shift.startTime && shift.endTime && !isShort && (
          <span className="mt-0.5 block text-[10px] font-medium opacity-90">
            {shift.startTime} – {shift.endTime}
          </span>
        )}
        {shift.note && !isShort && (
          <span className="mt-1 block text-[10px] opacity-75 line-clamp-1">{shift.note}</span>
        )}
      </button>
      {onUpdateShift && (
        <>
          {/* Handle superior - círculo */}
          <div
            data-resize-edge="top"
            className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-20 cursor-ns-resize rounded-full border-2 transition-all touch-manipulation ${
              isEditingTop
                ? "h-7 w-7 bg-white border-white scale-125 shadow-lg"
                : "h-6 w-6 lg:h-5 lg:w-5 bg-white/90 border-white/60 group-hover:bg-white group-hover:border-white group-hover:scale-110 shadow-md"
            }`}
            style={{
              backgroundColor: isEditingTop ? "#ffffff" : `${color}FF`,
              borderColor: isEditingTop ? "#ffffff" : `${color}CC`,
              boxShadow: isEditingTop ? "0 4px 12px rgba(0,0,0,0.3)" : `0 2px 8px ${color}60`,
              minWidth: "24px",
              minHeight: "24px",
            }}
            title="Arrastra para cambiar hora de inicio"
          />
          {/* Handle inferior - círculo */}
          <div
            data-resize-edge="bottom"
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 cursor-ns-resize rounded-full border-2 transition-all touch-manipulation ${
              isEditingBottom
                ? "h-7 w-7 bg-white border-white scale-125 shadow-lg"
                : "h-6 w-6 lg:h-5 lg:w-5 bg-white/90 border-white/60 group-hover:bg-white group-hover:border-white group-hover:scale-110 shadow-md"
            }`}
            style={{
              backgroundColor: isEditingBottom ? "#ffffff" : `${color}FF`,
              borderColor: isEditingBottom ? "#ffffff" : `${color}CC`,
              boxShadow: isEditingBottom ? "0 4px 12px rgba(0,0,0,0.3)" : `0 2px 8px ${color}60`,
              minWidth: "24px",
              minHeight: "24px",
            }}
            title="Arrastra para cambiar hora de fin"
          />
        </>
      )}
    </div>
  )
}

type DayViewProps = {
  date: Date
  shifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
  onSelectEvent: (shift: ShiftEvent) => void
  onAddSlot?: (date: Date, startTime?: string, endTime?: string) => void
  onUpdateShift?: (shift: ShiftEvent, updates: { startTime?: string; endTime?: string }) => Promise<void>
}

const DayView: FC<DayViewProps> = ({
  date,
  shifts,
  shiftTypeLabels,
  onSelectEvent,
  onAddSlot,
  onUpdateShift,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<number | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [editingShift, setEditingShift] = useState<{ shift: ShiftEvent; edge: "top" | "bottom" } | null>(null)
  const [dragStartMinutes, setDragStartMinutes] = useState<number | null>(null)
  const [resizePreviewMinutes, setResizePreviewMinutes] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragPreviewMinutes, setDragPreviewMinutes] = useState<number | null>(null)
  const [selectionStartY, setSelectionStartY] = useState<number | null>(null)
  const initialShiftMinutesRef = useRef<number | null>(null)

  // Configurar sensores con TouchSensor con delay de 250ms para long press
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
  const keyboardSensor = useSensor(KeyboardSensor)
  const sensors = useSensors(touchSensor, mouseSensor, keyboardSensor)

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i,
  )
  const dateStr = format(date, "yyyy-MM-dd")
  const dayShifts = shifts.filter((s) => s.date === dateStr)

  const yToMinutes = useCallback((clientY: number, useCurrentScroll: boolean = true): number => {
    if (!timelineRef.current || !scrollContainerRef.current) return 0
    const timelineRect = timelineRef.current.getBoundingClientRect()
    const scrollTop = useCurrentScroll ? scrollContainerRef.current.scrollTop : 0
    const paddingTop = 8
    const relativeY = clientY - timelineRect.top + scrollTop - paddingTop
    const minutes = (relativeY / HOUR_HEIGHT) * 60
    const dayStartM = HOUR_START * 60
    const clampedMinutes = Math.max(dayStartM, Math.min(dayStartM + TOTAL_MINUTES, dayStartM + minutes))
    return clampedMinutes
  }, [])

  const startAutoScroll = useCallback((direction: "up" | "down") => {
    if (autoScrollIntervalRef.current) return
    if (!scrollContainerRef.current) return

    autoScrollIntervalRef.current = window.setInterval(() => {
      if (!scrollContainerRef.current) return
      const scrollAmount = direction === "up" ? -AUTO_SCROLL_SPEED : AUTO_SCROLL_SPEED
      scrollContainerRef.current.scrollTop += scrollAmount
    }, 16)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current)
      autoScrollIntervalRef.current = null
    }
  }, [])

  // Handler para cuando comienza el drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const shiftId = active.id as string
    setActiveId(shiftId)
    
    // Guardar la posición inicial del turno
    const shift = dayShifts.find((s) => String(s.id) === shiftId)
    if (shift) {
      const initialMinutes = parseTimeToMinutes(shift.startTime)
      initialShiftMinutesRef.current = initialMinutes
      setDragPreviewMinutes(initialMinutes)
    }
    
    // Bloquear scroll del contenedor durante el arrastre
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.touchAction = "none"
      scrollContainerRef.current.style.overflow = "hidden"
    }
    
    // Vibración háptica
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, [dayShifts])

  // Handler para cuando se mueve durante el drag
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!activeId || !timelineRef.current || !scrollContainerRef.current || initialShiftMinutesRef.current === null) return
    
    const { delta, activatorEvent } = event
    const clientY = activatorEvent instanceof TouchEvent 
      ? activatorEvent.touches[0]?.clientY 
      : (activatorEvent as MouseEvent)?.clientY
    
    if (clientY === undefined) return
    
    // Usar el delta de @dnd-kit que ya tiene en cuenta el desplazamiento relativo
    // Convertir píxeles a minutos: HOUR_HEIGHT píxeles = 60 minutos
    const deltaMinutes = (delta.y / HOUR_HEIGHT) * 60
    
    // Calcular nueva posición: posición inicial + desplazamiento
    const newMinutes = initialShiftMinutesRef.current + deltaMinutes
    
    // Aplicar snap y límites
    const snappedMinutes = snapToInterval(newMinutes)
    const dayStartM = HOUR_START * 60
    const clampedMinutes = Math.max(dayStartM, Math.min(dayStartM + TOTAL_MINUTES, snappedMinutes))
    
    // Actualizar preview siempre que haya movimiento
    setDragPreviewMinutes(clampedMinutes)
    
    // Auto-scroll cuando se acerca a los bordes
    const rect = timelineRef.current.getBoundingClientRect()
    const relativeY = clientY - rect.top
    const scrollTop = scrollContainerRef.current.scrollTop
    const scrollHeight = scrollContainerRef.current.scrollHeight
    const clientHeight = scrollContainerRef.current.clientHeight
    const maxScroll = scrollHeight - clientHeight
    
    if (relativeY < AUTO_SCROLL_THRESHOLD && scrollTop > 0) {
      const distanceFromEdge = AUTO_SCROLL_THRESHOLD - relativeY
      const scrollSpeed = Math.max(8, distanceFromEdge * 0.8)
      scrollContainerRef.current.scrollTop = Math.max(0, scrollTop - scrollSpeed)
      startAutoScroll("up")
    } else if (relativeY > rect.height - AUTO_SCROLL_THRESHOLD && scrollTop < maxScroll) {
      const distanceFromEdge = relativeY - (rect.height - AUTO_SCROLL_THRESHOLD)
      const scrollSpeed = Math.max(8, distanceFromEdge * 0.8)
      scrollContainerRef.current.scrollTop = Math.min(maxScroll, scrollTop + scrollSpeed)
      startAutoScroll("down")
    } else {
      stopAutoScroll()
    }
  }, [activeId, startAutoScroll, stopAutoScroll])

  // Handler para cuando termina el drag
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { delta } = event
      
      // Restaurar scroll del contenedor
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.touchAction = ""
        scrollContainerRef.current.style.overflow = ""
      }
      
      stopAutoScroll()
      
      if (!activeId || !onUpdateShift) {
        setActiveId(null)
        setDragPreviewMinutes(null)
        initialShiftMinutesRef.current = null
        return
      }
      
      const shift = dayShifts.find((s) => String(s.id) === activeId)
      if (!shift) {
        setActiveId(null)
        setDragPreviewMinutes(null)
        initialShiftMinutesRef.current = null
        return
      }
      
      // Si hubo movimiento significativo, actualizar posición
      if (Math.abs(delta.y) > 5 && dragPreviewMinutes !== null) {
        const newStartM = dragPreviewMinutes
        const shiftStartM = parseTimeToMinutes(shift.startTime)
        const shiftEndM = parseTimeToMinutes(shift.endTime)
        const duration = shiftEndM - shiftStartM
        const newEndM = newStartM + duration
        
        const newStartTime = minutesToTime(newStartM)
        const newEndTime = minutesToTime(newEndM)
        
        if (newStartTime !== shift.startTime || newEndTime !== shift.endTime) {
          await onUpdateShift(shift, { startTime: newStartTime, endTime: newEndTime })
        }
      }
      
      setActiveId(null)
      setDragPreviewMinutes(null)
      initialShiftMinutesRef.current = null
    },
    [activeId, dragPreviewMinutes, dayShifts, onUpdateShift, stopAutoScroll]
  )

  // Handler para cuando se cancela el drag
  const handleDragCancel = useCallback(() => {
    // Restaurar scroll del contenedor
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.touchAction = ""
      scrollContainerRef.current.style.overflow = ""
    }
    
    stopAutoScroll()
    setActiveId(null)
    setDragPreviewMinutes(null)
    initialShiftMinutesRef.current = null
  }, [stopAutoScroll])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (!timelineRef.current || !scrollContainerRef.current) return

      const target = e.target as HTMLElement
      const shiftId = target.closest("[data-shift-id]")?.getAttribute("data-shift-id")
      const edge = target.closest("[data-resize-edge]")?.getAttribute("data-resize-edge") as "top" | "bottom" | null
      const isShiftButton = target.closest("button[data-shift-id]")

      // Resize edge (borde superior/inferior) - esto NO debe interferir con @dnd-kit
      if (shiftId && edge && onUpdateShift && !isShiftButton) {
        const shift = dayShifts.find((s) => String(s.id) === shiftId)
        if (shift) {
          e.preventDefault()
          e.stopPropagation()
          timelineRef.current.setPointerCapture(e.pointerId)
          setEditingShift({ shift, edge })
          setDragStartMinutes(snapToInterval(yToMinutes(e.clientY)))
          return
        }
      }

      // Si es un botón de turno, dejar que @dnd-kit lo maneje
      if (isShiftButton && !edge) {
        return
      }

      // Crear nuevo turno (arrastrar en la escala horaria)
      e.preventDefault()
      e.stopPropagation()
      timelineRef.current.setPointerCapture(e.pointerId)

      const startMin = snapToInterval(yToMinutes(e.clientY))
      setIsSelecting(true)
      setSelectionStart(startMin)
      setSelectionEnd(startMin)
      setSelectionStartY(e.clientY)
    },
    [yToMinutes, dayShifts, onUpdateShift],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Resize edge
      if (editingShift && dragStartMinutes !== null) {
        if (!timelineRef.current || !scrollContainerRef.current) return

        const currentMin = snapToInterval(yToMinutes(e.clientY))
        setResizePreviewMinutes(currentMin)

        const rect = timelineRef.current.getBoundingClientRect()
        const relativeY = e.clientY - rect.top
        const scrollTop = scrollContainerRef.current.scrollTop

        if (relativeY < AUTO_SCROLL_THRESHOLD && scrollTop > 0) {
          startAutoScroll("up")
        } else if (relativeY > rect.height - AUTO_SCROLL_THRESHOLD) {
          const maxScroll = scrollContainerRef.current.scrollHeight - rect.height
          if (scrollTop < maxScroll) {
            startAutoScroll("down")
          }
        } else {
          stopAutoScroll()
        }

        return
      }

      // Crear nuevo turno
      if (!isSelecting || selectionStart === null) return
      if (!timelineRef.current || !scrollContainerRef.current) return

      const currentMin = snapToInterval(yToMinutes(e.clientY))
      setSelectionEnd(currentMin)

      const rect = timelineRef.current.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const scrollTop = scrollContainerRef.current.scrollTop

      if (relativeY < AUTO_SCROLL_THRESHOLD && scrollTop > 0) {
        startAutoScroll("up")
      } else if (relativeY > rect.height - AUTO_SCROLL_THRESHOLD) {
        const maxScroll = scrollContainerRef.current.scrollHeight - rect.height
        if (scrollTop < maxScroll) {
          startAutoScroll("down")
        }
      } else {
        stopAutoScroll()
      }
    },
    [isSelecting, selectionStart, editingShift, dragStartMinutes, yToMinutes, startAutoScroll, stopAutoScroll],
  )

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      // Resize edge
      if (editingShift && dragStartMinutes !== null && onUpdateShift) {
        if (!timelineRef.current) return

        timelineRef.current.releasePointerCapture(e.pointerId)
        stopAutoScroll()

        const currentMin = snapToInterval(yToMinutes(e.clientY))
        const { shift, edge } = editingShift

        const shiftStartM = parseTimeToMinutes(shift.startTime)
        const shiftEndM = shift.endTime
          ? parseTimeToMinutes(shift.endTime)
          : shiftStartM + (shift.durationMinutes ?? 60)

        if (edge === "top") {
          const newStartM = Math.min(currentMin, shiftEndM - MIN_EVENT_DURATION)
          const newStartTime = minutesToTime(newStartM)
          const endTimeForUpdate = shift.endTime ?? minutesToTime(newStartM + (shift.durationMinutes ?? 60))
          if (newStartTime !== shift.startTime || endTimeForUpdate !== (shift.endTime ?? null)) {
            await onUpdateShift(shift, { startTime: newStartTime, endTime: endTimeForUpdate })
          }
        } else {
          const newEndM = Math.max(currentMin, shiftStartM + MIN_EVENT_DURATION)
          const newEndTime = minutesToTime(newEndM)
          const startTimeForUpdate = shift.startTime ?? minutesToTime(newEndM - (shift.durationMinutes ?? 60))
          if (newEndTime !== shift.endTime || startTimeForUpdate !== (shift.startTime ?? null)) {
            await onUpdateShift(shift, { startTime: startTimeForUpdate, endTime: newEndTime })
          }
        }

        setEditingShift(null)
        setDragStartMinutes(null)
        setResizePreviewMinutes(null)
        return
      }

      // Crear nuevo turno
      if (!isSelecting || selectionStart === null || selectionEnd === null) return
      if (!timelineRef.current) return

      timelineRef.current.releasePointerCapture(e.pointerId)
      stopAutoScroll()

      // Si el movimiento fue muy pequeño (< 15px), crear turno rápido de 1 hora
      // Esto funciona tanto en móvil como desktop para crear turnos rápidos con handles
      const movedDistance = selectionStartY !== null ? Math.abs(e.clientY - selectionStartY) : 0
      
      if (movedDistance < 15 && onAddSlot && dayShifts.length < 2) {
        const startMin = Math.min(selectionStart, selectionEnd)
        // Redondear a la hora más cercana
        const hour = Math.floor(startMin / 60)
        const hourStartTime = `${String(hour).padStart(2, "0")}:00`
        const hourEndTime = `${String(hour + 1).padStart(2, "0")}:00`
        
        // Verificar si ya hay un turno en esta hora
        const dateStr = format(date, "yyyy-MM-dd")
        const hasShiftAtHour = shifts.some((shift) => {
          if (shift.date !== dateStr) return false
          const shiftStart = shift.startTime ? parseInt(shift.startTime.split(":")[0]) : null
          return shiftStart === hour
        })
        
        if (!hasShiftAtHour) {
          onAddSlot(date, hourStartTime, hourEndTime)
          setIsSelecting(false)
          setSelectionStart(null)
          setSelectionEnd(null)
          setSelectionStartY(null)
          return
        }
      }

      // Verificar si ya existen 2 turnos en esta fecha (máximo permitido)
      const dateStr = format(date, "yyyy-MM-dd")
      const existingShifts = shifts.filter((s) => s.date === dateStr)
      if (existingShifts.length >= 2 && onAddSlot) {
        // Si ya hay 2 turnos, no permitir crear más
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
        setSelectionStartY(null)
        return
      }

      const startMin = Math.min(selectionStart, selectionEnd)
      const endMin = Math.max(selectionStart, selectionEnd)
      const duration = endMin - startMin

      if (duration >= MIN_EVENT_DURATION && onAddSlot) {
        const startTime = minutesToTime(startMin)
        const endTime = minutesToTime(endMin)
        onAddSlot(date, startTime, endTime)
      }

      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      setSelectionStartY(null)
    },
    [isSelecting, selectionStart, selectionEnd, editingShift, dragStartMinutes, date, shifts, selectionStartY, dayShifts, onAddSlot, onUpdateShift, yToMinutes, stopAutoScroll],
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSelecting) {
          setIsSelecting(false)
          setSelectionStart(null)
          setSelectionEnd(null)
          setSelectionStartY(null)
          stopAutoScroll()
        }
        if (activeId) {
          // Restaurar scroll del contenedor si estaba bloqueado
          if (scrollContainerRef.current) {
            scrollContainerRef.current.style.touchAction = ""
            scrollContainerRef.current.style.overflow = ""
          }
          setActiveId(null)
          setDragPreviewMinutes(null)
          initialShiftMinutesRef.current = null
        }
        if (editingShift) {
          setEditingShift(null)
          setDragStartMinutes(null)
          setResizePreviewMinutes(null)
        }
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      // Limpieza al desmontar - restaurar scroll del body
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
    }
  }, [isSelecting, activeId, editingShift, stopAutoScroll])

  useEffect(() => {
    return () => {
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  const activeShift = activeId ? dayShifts.find((s) => String(s.id) === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/60 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              {formatCompactDate(date, { includeYear: true })}
            </h3>
            <p className="mt-1 text-sm font-medium text-white/50">
              {dayShifts.length === 0
                ? "Sin turnos programados"
                : dayShifts.length === 1
                  ? "1 turno programado"
                  : dayShifts.length === 2
                    ? "2 turnos programados (máximo)"
                    : `${dayShifts.length} turnos`}
            </p>
          </div>
          {onAddSlot && (
            <button
              type="button"
              onClick={() => {
                if (dayShifts.length >= 2) {
                  return
                }
                onAddSlot(date)
              }}
              disabled={dayShifts.length >= 2}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95 touch-manipulation ${
                dayShifts.length >= 2
                  ? "border-white/20 bg-white/10 opacity-50 cursor-not-allowed"
                  : "border-sky-400/50 bg-gradient-to-r from-sky-500/90 to-sky-400/90 shadow-sky-500/25 hover:from-sky-400 hover:to-sky-300 hover:shadow-sky-400/40"
              }`}
              title={dayShifts.length >= 2 ? "Ya existen 2 turnos para este día. Solo se permiten máximo 2 turnos por día." : "Añadir turno"}
            >
              + Añadir turno
            </button>
          )}
        </header>
        <div
          ref={scrollContainerRef}
          className="relative flex flex-1 overflow-y-auto"
          style={{ 
            userSelect: isSelecting ? "none" : "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="w-16 shrink-0 border-r border-white/10 bg-slate-950/40 py-3 pr-3">
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pt-1"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-xs font-semibold text-white/40">
                  {format(new Date(2000, 0, 1, h), "HH:mm")}
                </span>
              </div>
            ))}
          </div>
          <DroppableTimeline isSelecting={isSelecting}>
            <div
              ref={timelineRef}
              style={{ minHeight: hours.length * HOUR_HEIGHT }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
          {hours.map((h, idx) => {
            const hourStartTime = `${String(h).padStart(2, "0")}:00`
            const hourEndTime = `${String(h + 1).padStart(2, "0")}:00`
            const hasShiftAtHour = dayShifts.some((shift) => {
              const shiftStart = shift.startTime ? parseInt(shift.startTime.split(":")[0]) : null
              return shiftStart === h
            })
            
            return (
              <div
                key={h}
                className={`relative h-16 border-t border-white/[0.03] ${idx === 0 ? "border-t-0" : ""}`}
                style={{ height: HOUR_HEIGHT }}
              >
                {/* Botón táctil para móvil - solo visible en pantallas pequeñas */}
                {onAddSlot && dayShifts.length < 2 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (!hasShiftAtHour) {
                        onAddSlot(date, hourStartTime, hourEndTime)
                      }
                    }}
                    disabled={hasShiftAtHour}
                    className={`absolute inset-x-1 top-0.5 bottom-0.5 rounded-lg border-2 transition-all active:scale-[0.96] touch-manipulation lg:hidden flex items-center justify-center min-h-[44px] ${
                      hasShiftAtHour
                        ? "border-white/10 bg-white/5 opacity-40 cursor-not-allowed"
                        : "border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 hover:border-sky-400/70 active:bg-sky-500/30"
                    }`}
                    title={hasShiftAtHour ? "Ya hay un turno en esta hora" : `Toca para crear turno de ${hourStartTime} a ${hourEndTime}`}
                  >
                    {!hasShiftAtHour && (
                      <span className="text-sky-200 text-lg font-bold leading-none">
                        +
                      </span>
                    )}
                  </button>
                )}
              </div>
            )
          })}
          {isSelecting && selectionStart !== null && selectionEnd !== null && (
            <div
              className="absolute left-2 right-2 z-10 rounded-xl border-2 border-dashed border-sky-400/80 bg-gradient-to-b from-sky-500/25 to-sky-400/20 shadow-xl ring-2 ring-sky-400/30"
              style={{
                top: `${((Math.min(selectionStart, selectionEnd) - HOUR_START * 60) / TOTAL_MINUTES) * 100}%`,
                height: `${Math.max((Math.abs(selectionEnd - selectionStart) / TOTAL_MINUTES) * 100, (MIN_EVENT_DURATION / TOTAL_MINUTES) * 100)}%`,
              }}
            >
              <div className="absolute inset-x-0 top-0 flex items-center justify-center rounded-t-xl bg-sky-500/40 px-2 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                {minutesToTime(Math.min(selectionStart, selectionEnd))} –{" "}
                {minutesToTime(Math.max(selectionStart, selectionEnd))}
              </div>
            </div>
          )}
          {dayShifts.map((shift) => {
            const isEditing = editingShift?.shift.id === shift.id
            const isEditingTop = isEditing && editingShift.edge === "top"
            const isEditingBottom = isEditing && editingShift.edge === "bottom"
            const isDragging = activeId === String(shift.id)
            
            return (
              <DraggableShift
                key={shift.id}
                shift={shift}
                shiftTypeLabels={shiftTypeLabels}
                isDragging={isDragging}
                isEditing={isEditing}
                isEditingTop={isEditingTop}
                isEditingBottom={isEditingBottom}
                onSelectEvent={onSelectEvent}
                onUpdateShift={onUpdateShift}
              />
            )
          })}
          
          {/* Indicador de modo de arrastre activado */}
          {activeId && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-sky-500/95 backdrop-blur-md border-2 border-white/30 px-4 py-2 shadow-xl animate-pulse">
              <p className="text-sm font-bold text-white text-center">
                ✨ Arrastra el turno libremente
              </p>
            </div>
          )}
          
          {/* Preview del turno mientras se arrastra */}
          {activeShift && dragPreviewMinutes !== null && (
            (() => {
              const shiftStartM = parseTimeToMinutes(activeShift.startTime)
              const shiftEndM = parseTimeToMinutes(activeShift.endTime)
              const duration = shiftEndM - shiftStartM
              
              const previewTop = ((dragPreviewMinutes - HOUR_START * 60) / TOTAL_MINUTES) * 100
              const previewHeight = (duration / TOTAL_MINUTES) * 100
              const label = activeShift.label ?? shiftTypeLabels[activeShift.type] ?? activeShift.type
              const color = activeShift.color ?? "#3b82f6"
              
              return (
                <div
                  className="pointer-events-none absolute left-2 right-2 z-20 rounded-xl border-2 border-white/40 px-3 py-2 text-left shadow-2xl"
                  style={{
                    top: `${Math.max(0, Math.min(previewTop, 100 - previewHeight))}%`,
                    height: `${Math.max(6, Math.min(previewHeight, 100))}%`,
                    backgroundColor: `${color}E6`,
                    color: "#ffffff",
                    borderColor: `${color}FF`,
                    boxShadow: `0 12px 32px -8px ${color}80, 0 0 0 3px ${color}99`,
                    transform: "scale(1.02)",
                    transition: "transform 0.1s ease-out",
                  }}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  {activeShift.startTime && activeShift.endTime && (
                    <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                      {minutesToTime(dragPreviewMinutes)} – {minutesToTime(dragPreviewMinutes + duration)}
                    </span>
                  )}
                </div>
              )
            })()
          )}
          
          {/* Preview del resize mientras se extiende */}
          {editingShift && resizePreviewMinutes !== null && (
            (() => {
              const { shift, edge } = editingShift
              const shiftStartM = parseTimeToMinutes(shift.startTime)
              const shiftEndM = shift.endTime
                ? parseTimeToMinutes(shift.endTime)
                : shiftStartM + (shift.durationMinutes ?? 60)
              
              let previewStartM: number
              let previewEndM: number
              
              if (edge === "top") {
                previewStartM = Math.min(resizePreviewMinutes, shiftEndM - MIN_EVENT_DURATION)
                previewEndM = shiftEndM
              } else {
                previewStartM = shiftStartM
                previewEndM = Math.max(resizePreviewMinutes, shiftStartM + MIN_EVENT_DURATION)
              }
              
              const previewTop = ((previewStartM - HOUR_START * 60) / TOTAL_MINUTES) * 100
              const previewHeight = ((previewEndM - previewStartM) / TOTAL_MINUTES) * 100
              const label = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
              const color = shift.color ?? "#3b82f6"
              
              return (
                <div
                  className="pointer-events-none absolute left-2 right-2 z-20 rounded-xl border-2 border-dashed border-white/60 px-3 py-2 text-left shadow-2xl"
                  style={{
                    top: `${Math.max(0, Math.min(previewTop, 100 - previewHeight))}%`,
                    height: `${Math.max(6, Math.min(previewHeight, 100))}%`,
                    backgroundColor: `${color}B3`,
                    color: "#ffffff",
                    borderColor: `${color}FF`,
                    boxShadow: `0 12px 32px -8px ${color}80, 0 0 0 3px ${color}99`,
                    opacity: 0.7,
                  }}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                    {minutesToTime(previewStartM)} – {minutesToTime(previewEndM)}
                  </span>
                </div>
              )
            })()
          )}
            </div>
          </DroppableTimeline>
        </div>
      </div>
    </DndContext>
  )
}

export default DayView
