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
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950">
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-80 w-80 translate-x-1/4 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute top-1/2 left-0 h-72 w-72 -translate-y-1/2 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 text-white sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
                Optimizado para escritorio
              </div>
              <div className="space-y-6">
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  Supershift, el panel que entiende tus turnos
                </h1>
                <p className="max-w-2xl text-pretty text-base text-blue-100 sm:text-lg">
                  Planifica rotaciones largas, añade incidencias en segundos y visualiza el calendario como si fuera la app móvil, pero con una experiencia pensada para pantallas grandes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-blue-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Ciclos automáticos en 60 días
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                  Edición rápida por evento
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-300" />
                  Sincroniza notas y avisos
                </span>
              </div>
            </div>

            <div className="grid gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 text-sm backdrop-blur">
              <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Próximo ciclo</p>
                <p className="mt-2 text-3xl font-semibold">4 turnos activos</p>
                <p className="mt-1 text-blue-100">Listos para editar desde el calendario.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-blue-100">
                <div className="rounded-2xl border border-white/20 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Cobertura</p>
                  <p className="mt-2 text-2xl font-semibold">96%</p>
                  <p className="mt-1 text-xs text-blue-200">Sin huecos críticos</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Notas</p>
                  <p className="mt-2 text-2xl font-semibold">18</p>
                  <p className="mt-1 text-xs text-blue-200">Revisadas esta semana</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/10 p-4 text-blue-100">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Consejo</p>
                <p className="mt-2 text-sm">
                  Marca los turnos con incidencias desde el panel lateral y mantenlos sincronizados con el equipo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-20 pb-16 sm:-mt-28">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-slate-900/40 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:px-8">
          <div className="space-y-8">
            <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <RotationForm onGenerate={handleGenerate} />
              <AddShiftForm
                onAdd={handleAdd}
                selectedDate={pendingDate}
                onDateConsumed={handleDateConsumed}
              />
            </section>
            <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur">
              <CalendarView
                shifts={shifts}
                onSelectEvent={(shift) => setSelectedShift(shift)}
                onSelectSlot={handleSlotSelection}
                onDeleteEvent={(shift) => handleDelete(shift.id)}
              />
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-white/20 bg-white/80 p-6 shadow-xl shadow-blue-900/5 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">Notas rápidas</h2>
              <p className="mt-2 text-sm text-slate-600">
                Selecciona cualquier turno del calendario para editarlo, añadir notas específicas o
                eliminarlo. Cada evento puede almacenar recordatorios como incidencias, entregas o
                metas diarias.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/80 p-6 shadow-xl shadow-blue-900/5 backdrop-blur">
              <h3 className="text-base font-semibold text-slate-900">Guía rápida de colores</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
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
            </div>

            <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-sky-500/90 p-6 text-blue-50 shadow-xl shadow-blue-900/20">
              <h3 className="text-base font-semibold text-white">Atajos de productividad</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-100">
                <li className="flex gap-3">
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">D</span>
                  Ir a la vista del día para detalles
                </li>
                <li className="flex gap-3">
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">M</span>
                  Volver al mes completo
                </li>
                <li className="flex gap-3">
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold text-white">Supr</span>
                  Borra turnos seleccionados en segundos
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
