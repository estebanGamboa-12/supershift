"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import CalendarView from "@/components/CalendarView"
import EditShiftModal from "@/components/EditShiftModal"
import RotationForm from "@/components/RotationForm"
import AddShiftForm from "@/components/AddShiftForm"
import { generateRotation } from "@/lib/generateRotation"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

export default function Home() {
  const initialShifts = useMemo<ShiftEvent[]>(() =>
    shiftsData
      .filter((s) => s.date && !isNaN(new Date(s.date).getTime()))
      .map((s) => ({
        ...s,
        type: s.type as ShiftType,
        start: new Date(`${s.date}T00:00:00`),
        end: new Date(`${s.date}T23:59:59`),
      }))
  , [])

  const [shifts, setShifts] = useState<ShiftEvent[]>(initialShifts)
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [nextId, setNextId] = useState(() =>
    initialShifts.length > 0 ? Math.max(...initialShifts.map((s) => s.id)) + 1 : 1
  )
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Panel abierto por defecto en escritorio
  useEffect(() => {
    if (typeof window === "undefined") return
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    setIsPanelOpen(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => setIsPanelOpen(event.matches)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  const upsertShift = (updated: ShiftEvent) => {
    setShifts((current) =>
      current
        .map((shift) => (shift.id === updated.id ? updated : shift))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    )
  }

  const handleSave = (updatedShift: ShiftEvent) => {
    const updated: ShiftEvent = {
      ...updatedShift,
      start: new Date(`${updatedShift.date}T00:00:00`),
      end: new Date(`${updatedShift.date}T23:59:59`),
    }
    upsertShift(updated)
    setSelectedShift(null)
  }

  const handleDelete = (id: number) => {
    setShifts((current) => current.filter((s) => s.id !== id))
    setSelectedShift(null)
  }

  const handleAdd = ({ date, type, note }: { date: string; type: ShiftType; note?: string }) => {
    const newShift: ShiftEvent = {
      id: nextId,
      date,
      type,
      note,
      start: new Date(`${date}T00:00:00`),
      end: new Date(`${date}T23:59:59`),
    }
    setShifts((current) =>
      [...current, newShift].sort((a, b) => a.start.getTime() - b.start.getTime())
    )
    setNextId((id) => id + 1)
  }

  const handleGenerate = ({ startDate, cycle }: { startDate: string; cycle: number[] }) => {
    let counter = nextId
    const generated = generateRotation(startDate, cycle, 60).map((s) => ({
      ...s,
      type: s.type as ShiftType,
      id: counter++,
      start: new Date(`${s.date}T00:00:00`),
      end: new Date(`${s.date}T23:59:59`),
    }))
    setNextId(counter)
    setShifts(generated.sort((a, b) => a.start.getTime() - b.start.getTime()))
    setSelectedShift(null)
  }

  const handleSlotSelection = useCallback((slot: { start: Date }) => {
    setPendingDate(format(slot.start, "yyyy-MM-dd"))
  }, [])

  const handleDateConsumed = useCallback(() => setPendingDate(null), [])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-950 text-white">
      {/* HEADER */}
      <header className="flex flex-col gap-4 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200 sm:text-[0.7rem]">
            Supershift
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Calendario de turnos a pantalla completa
          </h1>
          <p className="mt-1 text-xs text-blue-200 sm:text-sm">
            Gestiona tus rotaciones sin márgenes: toda la vista está dedicada al calendario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Sincronizado
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-sky-300" /> Ciclos activos
          </span>
          <button
            type="button"
            onClick={() => setIsPanelOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:border-blue-400 hover:bg-white/20"
          >
            {isPanelOpen ? "Ocultar panel" : "Panel de control"}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 overflow-hidden">
        {/* CALENDARIO */}
        <div className="flex-1 h-full">
          <CalendarView
            shifts={shifts}
            onSelectEvent={(shift) => setSelectedShift(shift)}
            onSelectSlot={handleSlotSelection}
            onDeleteEvent={(shift) => handleDelete(shift.id)}
            className="h-full w-full rounded-none border-0 bg-white text-slate-900 shadow-none"
          />
        </div>

        {/* PANEL FIJO EN ESCRITORIO */}
        {isPanelOpen && (
          <aside className="hidden lg:flex lg:flex-col lg:w-96 border-l border-white/10 bg-slate-900/90 backdrop-blur px-5 py-6 overflow-y-auto">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white mb-4">
              Panel de control
            </h2>
            <RotationForm onGenerate={handleGenerate} />
            <AddShiftForm
              onAdd={handleAdd}
              selectedDate={pendingDate}
              onDateConsumed={handleDateConsumed}
            />
          </aside>
        )}
      </main>

      {/* PANEL FLOTANTE EN MÓVIL */}
      {!isPanelOpen && (
        <div className="fixed bottom-6 left-1/2 z-20 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl backdrop-blur sm:hidden">
          <RotationForm onGenerate={handleGenerate} />
          <AddShiftForm
            onAdd={handleAdd}
            selectedDate={pendingDate}
            onDateConsumed={handleDateConsumed}
          />
        </div>
      )}

      {/* MODAL EDICIÓN */}
      {selectedShift && (
        <EditShiftModal
          shift={selectedShift}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  )
}
