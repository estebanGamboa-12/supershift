'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import CalendarView, { type CalendarSlot } from "@/components/CalendarView"
import EditShiftModal from "@/components/EditShiftModal"
import RotationForm from "@/components/RotationForm"
import AddShiftForm from "@/components/AddShiftForm"
import { generateRotation } from "@/lib/generateRotation"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

export default function Home() {
  const initialShifts = useMemo<ShiftEvent[]>(
    () =>
      shiftsData.map((s) => ({
        ...s,
        type: s.type as ShiftType,
        start: new Date(s.date),
        end: new Date(s.date),
      })),
    []
  )

  const [shifts, setShifts] = useState<ShiftEvent[]>(initialShifts)
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  const [nextId, setNextId] = useState(() =>
    initialShifts.length > 0 ? Math.max(...initialShifts.map((s) => s.id)) + 1 : 1
  )
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    setIsPanelOpen(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setIsPanelOpen(event.matches)
    }

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
      start: new Date(updatedShift.date),
      end: new Date(updatedShift.date),
    }
    upsertShift(updated)
    setSelectedShift(null)
  }

  const handleDelete = (id: number) => {
    setShifts((current) => current.filter((s) => s.id !== id))
    setSelectedShift(null)
  }

  const handleAdd = ({
    date,
    type,
    note,
  }: {
    date: string
    type: ShiftType
    note?: string
  }) => {
    const newShift: ShiftEvent = {
      id: nextId,
      date,
      type,
      note,
      start: new Date(date),
      end: new Date(date),
    }
    setShifts((current) =>
      [...current, newShift].sort((a, b) => a.start.getTime() - b.start.getTime())
    )
    setNextId((id) => id + 1)
  }

  const handleGenerate = ({
    startDate,
    cycle,
  }: {
    startDate: string
    cycle: number[]
  }) => {
    let counter = nextId
    const generated = generateRotation(startDate, cycle, 60).map((s) => ({
      ...s,
      type: s.type as ShiftType,
      id: counter++,
      start: new Date(s.date),
      end: new Date(s.date),
    }))
    setNextId(counter)
    setShifts(
      generated.sort((a, b) => a.start.getTime() - b.start.getTime())
    )
    setSelectedShift(null)
  }

  const handleSlotSelection = useCallback((slot: CalendarSlot) => {
    setPendingDate(format(slot.start, "yyyy-MM-dd"))
  }, [])

  const handleDateConsumed = useCallback(() => setPendingDate(null), [])

  const panelClassName = [
    "pointer-events-auto absolute z-20 flex max-h-[min(70vh,32rem)] w-[calc(100%-3rem)] max-w-md flex-col gap-5 overflow-y-auto rounded-3xl border border-white/15 bg-slate-950/90 p-5 text-blue-100 shadow-2xl backdrop-blur transition-all duration-300 ease-out sm:max-w-sm lg:max-w-xs",
    "bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:top-1/2 sm:translate-x-0",
    isPanelOpen
      ? "translate-y-0 opacity-100 sm:-translate-y-1/2"
      : "pointer-events-none translate-y-[120%] opacity-0 sm:translate-y-[120%]",
  ].join(" ")

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-950 text-white">
      <header className="flex flex-col gap-4 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200 sm:text-[0.7rem]">Supershift</p>
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

      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex h-full w-full flex-1 min-h-0">
          <CalendarView
            shifts={shifts}
            onSelectEvent={(shift) => setSelectedShift(shift)}
            onSelectSlot={handleSlotSelection}
            onDeleteEvent={(shift) => handleDelete(shift.id)}
            className="h-full w-full rounded-none border-0 bg-white/95 text-slate-900 shadow-none"
          />
        </div>

        <div className={panelClassName}>
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Panel de control</h2>
              <p className="text-[11px] text-blue-100/80">
                Genera rotaciones y añade turnos sin salir de la vista completa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:border-blue-400 hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-5">
            <RotationForm onGenerate={handleGenerate} />
            <AddShiftForm
              onAdd={handleAdd}
              selectedDate={pendingDate}
              onDateConsumed={handleDateConsumed}
            />
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-blue-100">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Guía rápida</h3>
              <ul className="space-y-2 text-[11px] text-blue-100/90">
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-blue-600" /> Turno laboral (WORK)
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-slate-500" /> Descanso (REST)
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-violet-600" /> Nocturno (NIGHT)
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-orange-500" /> Vacaciones (VACATION)
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-sky-500" /> Personalizado (CUSTOM)
                </li>
              </ul>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-[11px] text-blue-50/90">
                <h4 className="text-xs font-semibold text-white">Atajos</h4>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">D</span>
                    Ver el día seleccionado
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">M</span>
                    Volver a la vista mensual
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">Supr</span>
                    Eliminar el turno activo
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

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
