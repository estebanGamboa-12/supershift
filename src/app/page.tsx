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
    <div className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 pb-24">
        <div className="absolute inset-0 opacity-60 mix-blend-soft-light">
          <div className="absolute -top-24 -right-32 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-10 left-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-12 text-white">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Planificador de turnos Supershift
          </h1>
          <p className="mt-3 max-w-2xl text-base text-blue-50 md:text-lg">
            Organiza tus rotaciones laborales, añade notas personalizadas y mantén un registro claro
            de cada día. Genera ciclos automáticamente o crea turnos a medida para tu equipo.
          </p>
        </div>
      </div>

      <div className="relative -mt-20 space-y-8 pb-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RotationForm onGenerate={handleGenerate} />
              <AddShiftForm
                onAdd={handleAdd}
                selectedDate={pendingDate}
                onDateConsumed={handleDateConsumed}
              />
            </div>
            <CalendarView
              shifts={shifts}
              onSelectEvent={(shift) => setSelectedShift(shift)}
              onSelectSlot={handleSlotSelection}
              onDeleteEvent={(shift) => handleDelete(shift.id)}
            />
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow">
              <h2 className="text-lg font-semibold text-slate-800">Notas rápidas</h2>
              <p className="mt-2 text-sm text-slate-500">
                Selecciona cualquier turno del calendario para editarlo, añadir notas específicas o
                eliminarlo. Cada evento puede almacenar recordatorios como incidencias, entregas o
                metas diarias.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow">
              <h3 className="text-base font-semibold text-slate-800">Guía rápida de colores</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600" /> Turno laboral (WORK)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-500" /> Descanso (REST)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-violet-600" /> Nocturno (NIGHT)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500" /> Vacaciones (VACATION)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-sky-500" /> Personalizado (CUSTOM)
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

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
