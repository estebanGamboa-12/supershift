"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import CalendarView from "@/components/CalendarView"
import AgendaView from "@/components/AgendaView"
import EditShiftModal from "@/components/EditShiftModal"
import AddShiftForm from "@/components/AddShiftForm"
import RotationForm from "@/components/RotationForm"
import { generateRotation } from "@/lib/generateRotation"

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

export default function Home() {
  const initialShifts = useMemo<ShiftEvent[]>(
    () => shiftsData.map((s) => ({
      ...s,
      type: s.type as ShiftType,
      start: new Date(s.date),
      end: new Date(s.date),
    })),
    []
  )

  const [shifts, setShifts] = useState(initialShifts)
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] = useState<string | null>(null)
  const nextIdRef = useRef(
    initialShifts.reduce((max, shift) => Math.max(max, shift.id), 0) + 1
  )

  const sortByDate = useCallback((items: ShiftEvent[]) => {
    return [...items].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [])

  const handleAddShift = useCallback(
    ({ date, type, note }: { date: string; type: ShiftType; note?: string }) => {
      if (!date) return

      const id = nextIdRef.current++
      const newShift: ShiftEvent = {
        id,
        date,
        type,
        start: new Date(date),
        end: new Date(date),
        ...(note ? { note } : {}),
      }

      setShifts((current) => sortByDate([...current, newShift]))
    },
    [sortByDate]
  )

  const handleGenerateRotation = useCallback(
    ({ startDate, cycle }: { startDate: string; cycle: number[] }) => {
      const generated = generateRotation(startDate, cycle)
      if (!generated.length) return

      setShifts((current) => {
        const generatedShifts = generated.map((shift) => {
          const id = nextIdRef.current++
          return {
            id,
            date: shift.date,
            type: shift.type,
            start: new Date(shift.date),
            end: new Date(shift.date),
          }
        })

        return sortByDate([...current, ...generatedShifts])
      })
    },
    [sortByDate]
  )

  const handleSelectSlot = useCallback((slot: { start: Date }) => {
    setSelectedDateFromCalendar(format(slot.start, "yyyy-MM-dd"))
  }, [])

  const orderedShifts = useMemo(
    () => sortByDate(shifts),
    [shifts, sortByDate]
  )

  const upcomingShifts = useMemo(() => {
    return orderedShifts
      .filter(
        (shift) => differenceInCalendarDays(new Date(shift.date), new Date()) >= 0
      )
      .slice(0, 5)
  }, [orderedShifts])

  const nextShift = upcomingShifts[0]

  const daysUntilNextShift = useMemo(() => {
    if (!nextShift) return null
    return differenceInCalendarDays(new Date(nextShift.date), new Date())
  }, [nextShift])

  const typeCounts = useMemo(() => {
    return orderedShifts.reduce(
      (acc, shift) => {
        acc[shift.type] = (acc[shift.type] ?? 0) + 1
        return acc
      },
      {} as Record<ShiftType, number>
    )
  }, [orderedShifts])

  const currentMonthShifts = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return orderedShifts.filter((shift) => {
      const date = new Date(shift.date)
      return date.getMonth() === month && date.getFullYear() === year
    })
  }, [orderedShifts])

  const activeShiftTypes = Object.keys(typeCounts).length

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium text-blue-300/80">Panel de control</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">📅 Supershift</h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Supervisa tus turnos, genera rotaciones y mantén a tu equipo coordinado desde un único lugar.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-medium text-white/80">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            <span>Hoy es {format(new Date(), "EEEE, MMMM d")}</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Próximo turno</p>
              {nextShift ? (
                <div className="mt-3 space-y-2">
                  <p className="text-2xl font-semibold">
                    {format(new Date(nextShift.date), "dd MMMM yyyy")}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                      {SHIFT_TYPE_LABELS[nextShift.type] ?? nextShift.type}
                    </span>
                    {daysUntilNextShift !== null && (
                      <span>
                        {daysUntilNextShift === 0
                          ? "Hoy"
                          : `En ${daysUntilNextShift} día${
                              daysUntilNextShift === 1 ? "" : "s"
                            }`}
                      </span>
                    )}
                  </div>
                  {nextShift.note && (
                    <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {nextShift.note}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/60">
                  No hay turnos programados todavía. Añade uno para empezar a planificar tu rotación.
                </p>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{format(new Date(), "MMMM yyyy")}</p>
              <p className="mt-3 text-3xl font-semibold">{currentMonthShifts.length}</p>
              <p className="mt-1 text-sm text-white/60">Turnos en el mes actual</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Planificación total</p>
              <p className="mt-3 text-3xl font-semibold">{orderedShifts.length}</p>
              <p className="mt-1 text-sm text-white/60">Turnos programados en la agenda</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-blue-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Tipos activos</p>
              <p className="mt-3 text-3xl font-semibold">{activeShiftTypes}</p>
              <p className="mt-1 text-sm text-white/60">Variantes de turno en tu planificación</p>
            </article>
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-8">
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Planificación visual</h2>
                    <p className="text-sm text-white/60">
                      Alterna entre el calendario completo en escritorio y la agenda semanal en móviles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
                  >
                    Ir a hoy
                  </button>
                </div>

                <div className="mt-6 hidden h-full min-h-[560px] rounded-2xl border border-white/5 bg-slate-950/40 p-4 md:block">
                  <CalendarView
                    shifts={orderedShifts}
                    onSelectEvent={setSelectedShift}
                    onSelectSlot={handleSelectSlot}
                    className="h-full"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/40 p-4 md:hidden">
                  <AgendaView shifts={orderedShifts} onSelectEvent={setSelectedShift} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold">Distribución de turnos</h2>
                <p className="mt-1 text-sm text-white/60">
                  Mantén el equilibrio entre trabajo y descanso con una visión rápida de los tipos de turno planificados.
                </p>
                <ul className="mt-6 space-y-4">
                  {Object.entries(typeCounts).map(([type, count]) => {
                    const percentage = Math.round((count / orderedShifts.length) * 100)
                    return (
                      <li key={type} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-white/70">
                          {SHIFT_TYPE_LABELS[type as ShiftType] ?? type}
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm text-white/60">{count}</span>
                      </li>
                    )
                  })}
                  {orderedShifts.length === 0 && (
                    <li className="text-sm text-white/60">
                      Añade tus primeros turnos para visualizar el equilibrio entre tipos de jornada.
                    </li>
                  )}
                </ul>
              </div>
            </section>

            <aside className="space-y-6 lg:col-span-4">
              <AddShiftForm
                onAdd={handleAddShift}
                selectedDate={selectedDateFromCalendar}
                onDateConsumed={() => setSelectedDateFromCalendar(null)}
              />
              <RotationForm onGenerate={handleGenerateRotation} />

              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold">Próximos turnos</h2>
                <p className="mt-1 text-sm text-white/60">Visualiza las cinco próximas jornadas en tu calendario.</p>
                <ul className="mt-5 space-y-4">
                  {upcomingShifts.length ? (
                    upcomingShifts.map((shift) => (
                      <li
                        key={shift.id}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {format(new Date(shift.date), "EEEE d 'de' MMMM")}
                          </p>
                          <p className="text-sm text-white/60">
                            {SHIFT_TYPE_LABELS[shift.type] ?? shift.type}
                          </p>
                          {shift.note && (
                            <p className="mt-2 text-xs text-white/50">{shift.note}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedShift(shift)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-blue-400 hover:text-blue-200"
                        >
                          Ver
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-white/60">
                      No hay turnos próximos. Aprovecha el formulario para generar nuevos horarios.
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {selectedShift && (
        <EditShiftModal
          shift={selectedShift}
          onSave={(s) => {
            setShifts((curr) =>
              sortByDate(
                curr.map((sh) =>
                  sh.id === s.id
                    ? {
                        ...s,
                        start: new Date(s.date),
                        end: new Date(s.date),
                      }
                    : sh
                )
              )
            )
            setSelectedShift(null)
          }}
          onDelete={(id) => {
            setShifts((curr) => curr.filter((sh) => sh.id !== id))
            setSelectedShift(null)
          }}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  )
}
