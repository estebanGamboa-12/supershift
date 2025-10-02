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

const NAVIGATION_ITEMS = [
  { label: "Panel principal", description: "Resumen y métricas", icon: "📊" },
  { label: "Calendario", description: "Visión mensual", icon: "🗓️" },
  { label: "Agenda", description: "Detalle semanal", icon: "🧭" },
  { label: "Equipo", description: "Turnos compartidos", icon: "👥" },
]

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

  const [shifts, setShifts] = useState(initialShifts)
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] =
    useState<string | null>(null)
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-[-30%] h-[480px] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 flex-col justify-between border-r border-white/5 bg-slate-950/70 px-6 py-8 backdrop-blur xl:flex">
          <div className="space-y-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                Supershift Ops
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Centro de control</h1>
              <p className="text-sm text-white/60">
                Coordina turnos, anticipa rotaciones y mantén la productividad de tu equipo sin perder contexto.
              </p>
            </div>

            <nav className="space-y-3">
              {NAVIGATION_ITEMS.map((item, index) => (
                <button
                  type="button"
                  key={item.label}
                  className={`group flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${index === 0
                      ? "border-blue-500/40 bg-gradient-to-r from-blue-500/20 to-transparent text-white shadow-lg shadow-blue-500/10"
                      : "border-transparent bg-white/5 text-white/70 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-lg">{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="text-xs text-white/60">{item.description}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 text-sm text-white/70">
            <p className="font-semibold text-white">Atajos inteligentes</p>
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              <li>⌘K Abre la paleta de comandos</li>
              <li>⌘⇧A Crear turno instantáneo</li>
              <li>⌘⇧R Generar nueva rotación</li>
            </ul>
          </div>
        </aside>

        <div className="flex w-full flex-col">
          <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-wide text-blue-100/80">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    Hoy es {format(new Date(), "EEEE, MMMM d")}
                  </div>
                  <div>
                    <p className="text-sm text-blue-200/80">Panel de rendimiento</p>
                    <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">📅 Supershift HQ</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="search"
                      placeholder="Buscar personas, turnos o notas..."
                      className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">
                      ⌘K
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/30"
                  >
                    ➕ Nuevo turno rápido
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-blue-500/10">
                  <div
                    className="absolute inset-0 -z-10 opacity-30 blur-2xl transition duration-500 group-hover:opacity-60"
                    style={{
                      background:
                        "radial-gradient(circle at top right, rgba(59,130,246,0.6), transparent 60%)",
                    }}
                    aria-hidden
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">Próximo turno</p>
                  {nextShift ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-3xl font-semibold">
                        {format(new Date(nextShift.date), "dd MMMM yyyy")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                          {SHIFT_TYPE_LABELS[nextShift.type] ?? nextShift.type}
                        </span>
                        {daysUntilNextShift !== null && (
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                            {daysUntilNextShift === 0
                              ? "Sucede hoy"
                              : `En ${daysUntilNextShift} día${daysUntilNextShift === 1 ? "" : "s"
                              }`}
                          </span>
                        )}
                      </div>
                      {nextShift.note && (
                        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          {nextShift.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-white/60">
                      No hay turnos programados todavía. Añade uno para empezar a planificar tu rotación.
                    </p>
                  )}
                </article>

                <article className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Salud de la planificación
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                      Un vistazo rápido a tus próximos turnos y carga mensual.
                    </p>
                  </div>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <dt className="text-xs uppercase tracking-wide text-white/50">
                        {format(new Date(), "MMMM yyyy")}
                      </dt>
                      <dd className="mt-2 text-2xl font-semibold">{currentMonthShifts.length}</dd>
                      <p className="mt-1 text-xs text-white/50">Turnos en este mes</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <dt className="text-xs uppercase tracking-wide text-white/50">Visión global</dt>
                      <dd className="mt-2 text-2xl font-semibold">{orderedShifts.length}</dd>
                      <p className="mt-1 text-xs text-white/50">
                        {activeShiftTypes} tipos activos
                      </p>
                    </div>
                  </dl>
                </article>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
              <div className="grid gap-6 lg:grid-cols-12">
                <section className="space-y-6 lg:col-span-9">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-blue-500/10 sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Planificación visual</h3>
                        <p className="text-sm text-white/60">
                          Alterna entre el calendario completo en escritorio y la agenda semanal en móviles.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white md:inline-flex"
                        >
                          Vista mensual
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/30"
                        >
                          Ir a hoy
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 hidden min-h-[640px] rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-inner md:block">
                      <CalendarView
                        shifts={orderedShifts}
                        onSelectEvent={setSelectedShift}
                        onSelectSlot={handleSelectSlot}
                        className="h-full"
                      />
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-inner md:hidden">
                      <AgendaView shifts={orderedShifts} onSelectEvent={setSelectedShift} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Distribución de turnos</h3>
                        <p className="text-sm text-white/60">
                          Mantén el equilibrio entre trabajo y descanso con una visión rápida de los tipos de turno planificados.
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 px-4 py-1 text-xs text-white/60">
                        {orderedShifts.length} turnos registrados
                      </div>
                    </div>
                    <ul className="mt-6 space-y-4">
                      {Object.entries(typeCounts).map(([type, count]) => {
                        const percentage = Math.round((count / orderedShifts.length) * 100)
                        return (
                          <li key={type} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium text-white/70">
                              {SHIFT_TYPE_LABELS[type as ShiftType] ?? type}
                            </div>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-14 text-right text-sm text-white/60">{count}</span>
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

                <aside className="space-y-6 lg:col-span-3">
                  <RotationForm onGenerate={handleGenerateRotation} />

                  <AddShiftForm
                    onAdd={handleAddShift}
                    selectedDate={selectedDateFromCalendar}
                    onDateConsumed={() => setSelectedDateFromCalendar(null)}
                  />


                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

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
