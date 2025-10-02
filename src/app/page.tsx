'use client'

import { useCallback, useMemo, useState } from "react"
import { format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import CalendarView from "@/components/CalendarView"
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

  const handleSlotSelection = useCallback((slot: { start: Date }) => {
    setPendingDate(format(slot.start, "yyyy-MM-dd"))
  }, [])

  const handleDateConsumed = useCallback(() => setPendingDate(null), [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200 sm:text-[0.7rem]">Supershift</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Panel de turnos a pantalla completa
          </h1>
          <p className="mt-1 text-xs text-blue-200 sm:text-sm">
            Planifica rotaciones, añade incidencias y consulta el calendario sin márgenes.
          </p>
        </div>
        <div className="hidden items-center gap-3 text-xs text-blue-100 sm:flex">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Sincronizado
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-sky-300" /> Ciclos activos
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex flex-1 flex-col overflow-hidden">
          <CalendarView
            shifts={shifts}
            onSelectEvent={(shift) => setSelectedShift(shift)}
            onSelectSlot={handleSlotSelection}
            onDeleteEvent={(shift) => handleDelete(shift.id)}
            className="h-full rounded-none border-0 bg-white/95 text-slate-900 shadow-none"
          />
        </section>

        <aside className="flex w-full max-h-[45vh] shrink-0 flex-col border-t border-white/10 bg-white/5 backdrop-blur transition lg:h-full lg:w-96 lg:max-h-none lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white sm:text-base">Panel lateral</h2>
              <p className="text-xs text-blue-200">Gestiona ciclos, añade turnos y consulta ayudas rápidas.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-blue-100">
              Herramientas
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <div className="space-y-5">
              <RotationForm onGenerate={handleGenerate} />
              <AddShiftForm
                onAdd={handleAdd}
                selectedDate={pendingDate}
                onDateConsumed={handleDateConsumed}
              />
              <div className="space-y-4 rounded-2xl border border-white/20 bg-white/5 p-5 text-blue-100">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Guía rápida</h3>
                <p className="text-sm text-blue-100/90">
                  Selecciona cualquier turno para editarlo o añadir notas. Mantén pulsado en el móvil para acceder rápidamente a las opciones.
                </p>
                <ul className="space-y-3 text-xs text-blue-100/80">
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
                <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-xs text-blue-50/90">
                  <h4 className="text-sm font-semibold text-white">Atajos</h4>
                  <ul className="mt-2 space-y-2">
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
        </aside>
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
