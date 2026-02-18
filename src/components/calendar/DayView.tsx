"use client"

import type { FC } from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import { formatCompactDate } from "@/lib/formatDate"

const HOUR_START = 6
const HOUR_END = 23
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60
const HOUR_HEIGHT = 64
const SNAP_INTERVAL = 15
const MIN_EVENT_DURATION = 15
const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_SPEED = 2

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
  const [draggingShift, setDraggingShift] = useState<ShiftEvent | null>(null)
  const [dragPreviewMinutes, setDragPreviewMinutes] = useState<number | null>(null)
  const [dragStartY, setDragStartY] = useState<number | null>(null)

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i,
  )
  const dateStr = format(date, "yyyy-MM-dd")
  const dayShifts = shifts.filter((s) => s.date === dateStr)

  const yToMinutes = useCallback((clientY: number): number => {
    if (!timelineRef.current || !scrollContainerRef.current) return 0
    const timelineRect = timelineRef.current.getBoundingClientRect()
    const scrollTop = scrollContainerRef.current.scrollTop
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (!timelineRef.current || !scrollContainerRef.current) return

      const target = e.target as HTMLElement
      const shiftId = target.closest("[data-shift-id]")?.getAttribute("data-shift-id")
      const edge = target.closest("[data-resize-edge]")?.getAttribute("data-resize-edge") as "top" | "bottom" | null
      const isShiftButton = target.closest("button[data-shift-id]")

      // Resize edge (borde superior/inferior)
      if (shiftId && edge && onUpdateShift) {
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

      // Click o drag en turno (no en los bordes): si sueltas sin mover = editar; si arrastras = mover
      if (shiftId && isShiftButton && !edge) {
        const shift = dayShifts.find((s) => String(s.id) === shiftId)
        if (shift) {
          e.preventDefault()
          e.stopPropagation()
          timelineRef.current.setPointerCapture(e.pointerId)
          setDraggingShift(shift)
          setDragStartY(e.clientY)
          setDragPreviewMinutes(snapToInterval(yToMinutes(e.clientY)))
          return
        }
      }

      // Crear nuevo turno (arrastrar en la escala horaria)
      e.preventDefault()
      e.stopPropagation()
      timelineRef.current.setPointerCapture(e.pointerId)

      const startMin = snapToInterval(yToMinutes(e.clientY))
      setIsSelecting(true)
      setSelectionStart(startMin)
      setSelectionEnd(startMin)
    },
    [yToMinutes, dayShifts, onUpdateShift],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Drag turno completo
      if (draggingShift && dragStartY !== null) {
        if (!timelineRef.current || !scrollContainerRef.current) return

        const moved = Math.abs(e.clientY - dragStartY)
        if (moved > 5) {
          const currentMin = snapToInterval(yToMinutes(e.clientY))
          setDragPreviewMinutes(currentMin)

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
        }
        return
      }

      // Resize edge
      if (editingShift && dragStartMinutes !== null) {
        if (!timelineRef.current || !scrollContainerRef.current) return

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
    [isSelecting, selectionStart, editingShift, dragStartMinutes, draggingShift, dragStartY, yToMinutes, startAutoScroll, stopAutoScroll],
  )

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      // Drag turno completo: si moviste = actualizar horas; si no moviste = abrir formulario de edición
      if (draggingShift && dragStartY !== null) {
        if (!timelineRef.current) return

        timelineRef.current.releasePointerCapture(e.pointerId)
        stopAutoScroll()

        const moved = Math.abs(e.clientY - dragStartY)
        if (moved > 5 && dragPreviewMinutes !== null && onUpdateShift) {
          const newStartM = dragPreviewMinutes
          const shiftStartM = parseTimeToMinutes(draggingShift.startTime)
          const shiftEndM = parseTimeToMinutes(draggingShift.endTime)
          const duration = shiftEndM - shiftStartM
          const newEndM = newStartM + duration

          const newStartTime = minutesToTime(newStartM)
          const newEndTime = minutesToTime(newEndM)

          if (newStartTime !== draggingShift.startTime || newEndTime !== draggingShift.endTime) {
            await onUpdateShift(draggingShift, { startTime: newStartTime, endTime: newEndTime })
          }
        } else {
          // Clic sin arrastrar → abrir formulario para editar horas y resto
          onSelectEvent(draggingShift)
        }

        setDraggingShift(null)
        setDragPreviewMinutes(null)
        setDragStartY(null)
        return
      }

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
        return
      }

      // Crear nuevo turno
      if (!isSelecting || selectionStart === null || selectionEnd === null) return
      if (!timelineRef.current) return

      timelineRef.current.releasePointerCapture(e.pointerId)
      stopAutoScroll()

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
    },
    [isSelecting, selectionStart, selectionEnd, editingShift, dragStartMinutes, draggingShift, dragStartY, dragPreviewMinutes, date, onAddSlot, onUpdateShift, onSelectEvent, yToMinutes, stopAutoScroll],
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSelecting) {
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
        stopAutoScroll()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isSelecting, stopAutoScroll])

  useEffect(() => {
    return () => {
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/60 px-5 py-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            {formatCompactDate(date, { includeYear: true })}
          </h3>
          <p className="mt-1 text-sm font-medium text-white/50">
            {dayShifts.length === 0
              ? "Sin turnos programados"
              : `${dayShifts.length} ${dayShifts.length === 1 ? "turno" : "turnos"}`}
          </p>
        </div>
        {onAddSlot && (
          <button
            type="button"
            onClick={() => onAddSlot(date)}
            className="shrink-0 rounded-xl border border-sky-400/50 bg-gradient-to-r from-sky-500/90 to-sky-400/90 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-sky-300 hover:shadow-sky-400/40 active:scale-95"
          >
            + Añadir turno
          </button>
        )}
      </header>
      <div
        ref={scrollContainerRef}
        className="relative flex flex-1 overflow-y-auto"
        style={{ userSelect: isSelecting ? "none" : "auto" }}
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
        <div
          ref={timelineRef}
          className="relative flex-1 bg-slate-950/20 py-2 select-none"
          style={{ minHeight: hours.length * HOUR_HEIGHT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {hours.map((h, idx) => (
            <div
              key={h}
              className={`h-16 border-t border-white/[0.03] ${idx === 0 ? "border-t-0" : ""}`}
              style={{ height: HOUR_HEIGHT }}
            />
          ))}
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
            const { top, height } = shiftToPosition(shift)
            const label =
              shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
            const color = shift.color ?? "#3b82f6"
            const isShort = height < 12
            const isEditing = editingShift?.shift.id === shift.id
            const isEditingTop = isEditing && editingShift.edge === "top"
            const isEditingBottom = isEditing && editingShift.edge === "bottom"
            const isDragging = draggingShift?.id === shift.id
            
            return (
              <div
                key={shift.id}
                data-shift-id={shift.id}
                className="group absolute left-2 right-2"
                style={{
                  top: `${top}%`,
                  height: `${Math.max(height, 10)}%`,
                  pointerEvents: isSelecting ? "none" : "auto",
                  opacity: isDragging ? 0.3 : 1,
                }}
              >
                <button
                  type="button"
                  data-shift-id={shift.id}
                  className="h-full w-full rounded-xl border px-3 py-2 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-slate-950"
                  style={{
                    backgroundColor: `${color}E6`,
                    color: "#ffffff",
                    borderColor: `${color}CC`,
                    boxShadow: `0 4px 12px -2px ${color}40, 0 0 0 1px ${color}33`,
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                >
                  <span className={`block font-bold ${isShort ? "text-xs" : "text-sm"}`}>
                    {label}
                  </span>
                  {shift.startTime && shift.endTime && !isShort && (
                    <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                      {shift.startTime} – {shift.endTime}
                    </span>
                  )}
                  {shift.note && !isShort && (
                    <span className="mt-1 block text-[10px] opacity-75 line-clamp-1">
                      {shift.note}
                    </span>
                  )}
                </button>
                {onUpdateShift && !isShort && (
                  <>
                    <div
                      data-resize-edge="top"
                      className={`absolute left-0 right-0 top-0 h-2 cursor-ns-resize rounded-t-xl transition-opacity ${
                        isEditingTop
                          ? "bg-white/40"
                          : "bg-white/0 group-hover:bg-white/20"
                      }`}
                      title="Arrastra para cambiar hora de inicio"
                    />
                    <div
                      data-resize-edge="bottom"
                      className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize rounded-b-xl transition-opacity ${
                        isEditingBottom
                          ? "bg-white/40"
                          : "bg-white/0 group-hover:bg-white/20"
                      }`}
                      title="Arrastra para cambiar hora de fin"
                    />
                  </>
                )}
              </div>
            )
          })}
          {/* Preview del turno mientras se arrastra */}
          {draggingShift && dragPreviewMinutes !== null && (
            (() => {
              const shiftStartM = parseTimeToMinutes(draggingShift.startTime)
              const shiftEndM = parseTimeToMinutes(draggingShift.endTime)
              const duration = shiftEndM - shiftStartM
              const previewTop = ((dragPreviewMinutes - HOUR_START * 60) / TOTAL_MINUTES) * 100
              const previewHeight = (duration / TOTAL_MINUTES) * 100
              const label = draggingShift.label ?? shiftTypeLabels[draggingShift.type] ?? draggingShift.type
              const color = draggingShift.color ?? "#3b82f6"
              return (
                <div
                  className="pointer-events-none absolute left-2 right-2 z-20 rounded-xl border px-3 py-2 text-left shadow-xl"
                  style={{
                    top: `${Math.max(0, Math.min(previewTop, 100 - previewHeight))}%`,
                    height: `${Math.max(6, Math.min(previewHeight, 100))}%`,
                    backgroundColor: `${color}CC`,
                    color: "#ffffff",
                    borderColor: `${color}AA`,
                    boxShadow: `0 8px 24px -4px ${color}60, 0 0 0 2px ${color}66`,
                  }}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  {draggingShift.startTime && draggingShift.endTime && (
                    <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                      {minutesToTime(dragPreviewMinutes)} – {minutesToTime(dragPreviewMinutes + duration)}
                    </span>
                  )}
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}

export default DayView
