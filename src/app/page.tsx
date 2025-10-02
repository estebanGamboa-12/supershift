"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import EditShiftModal from "@/components/EditShiftModal"
import AddShiftForm from "@/components/AddShiftForm"
import RotationForm from "@/components/RotationForm"
import { generateRotation } from "@/lib/generateRotation"
import DashboardSidebar from "@/components/dashboard/DashboardSidebar"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import PlanningSection from "@/components/dashboard/PlanningSection"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import MobileAddShiftSheet from "@/components/dashboard/MobileAddShiftSheet"
import TeamSpotlight from "@/components/dashboard/TeamSpotlight"

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

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
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("calendar")
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false)
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

  const handleSelectShift = useCallback((shift: ShiftEvent) => {
    setSelectedShift(shift)
  }, [])

  const handleGoToToday = useCallback(() => {
    setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))
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

  useEffect(() => {
    if (!selectedDateFromCalendar) return
    if (typeof window === "undefined") return
    if (window.innerWidth < 1024) {
      setActiveMobileTab("calendar")
      setIsMobileAddOpen(true)
    }
  }, [selectedDateFromCalendar])

  const handleOpenMobileAdd = useCallback(() => {
    setActiveMobileTab("calendar")
    setIsMobileAddOpen(true)
    setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))
  }, [])

  const handleCloseMobileAdd = useCallback(() => {
    setIsMobileAddOpen(false)
    setSelectedDateFromCalendar(null)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-[-30%] h-[480px] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <DashboardSidebar />

        <div className="flex w-full flex-col">
          <div className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/90 px-4 py-4 backdrop-blur lg:hidden">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Hoy es {format(new Date(), "EEEE d 'de' MMMM")}
                </p>
                <h1 className="text-2xl font-semibold">Supershift</h1>
              </div>
              <button
                type="button"
                onClick={handleGoToToday}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-blue-400/40 hover:text-white"
              >
                Ir a hoy
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <DashboardHeader
              onQuickAdd={handleGoToToday}
              nextShift={nextShift}
              daysUntilNextShift={daysUntilNextShift}
              shiftTypeLabels={SHIFT_TYPE_LABELS}
              currentMonthShiftCount={currentMonthShifts.length}
              totalShiftCount={orderedShifts.length}
              activeShiftTypes={activeShiftTypes}
            />
          </div>

          <main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
              <div className="hidden gap-6 lg:grid lg:grid-cols-12">
                <section className="space-y-6 lg:col-span-9">
                  <PlanningSection
                    shifts={orderedShifts}
                    onSelectShift={handleSelectShift}
                    onSelectSlot={handleSelectSlot}
                    onGoToToday={handleGoToToday}
                  />

                  <ShiftDistribution
                    typeCounts={typeCounts}
                    totalShifts={orderedShifts.length}
                    shiftTypeLabels={SHIFT_TYPE_LABELS}
                  />
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

              <div className="space-y-6 lg:hidden">
                {activeMobileTab === "calendar" && (
                  <div className="space-y-6">
                    <NextShiftCard
                      nextShift={nextShift}
                      daysUntilNextShift={daysUntilNextShift}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                    <PlanningSection
                      shifts={orderedShifts}
                      onSelectShift={handleSelectShift}
                      onSelectSlot={handleSelectSlot}
                      onGoToToday={handleGoToToday}
                    />
                  </div>
                )}

                {activeMobileTab === "stats" && (
                  <div className="space-y-6">
                    <PlanningHealthCard
                      currentMonthShiftCount={currentMonthShifts.length}
                      totalShiftCount={orderedShifts.length}
                      activeShiftTypes={activeShiftTypes}
                    />
                    <ShiftDistribution
                      typeCounts={typeCounts}
                      totalShifts={orderedShifts.length}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  </div>
                )}

                {activeMobileTab === "team" && (
                  <TeamSpotlight
                    upcomingShifts={upcomingShifts}
                    shiftTypeLabels={SHIFT_TYPE_LABELS}
                  />
                )}

                {activeMobileTab === "settings" && (
                  <div className="space-y-6">
                    <RotationForm onGenerate={handleGenerateRotation} />
                    <AddShiftForm
                      onAdd={handleAddShift}
                      selectedDate={selectedDateFromCalendar}
                      onDateConsumed={() => setSelectedDateFromCalendar(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenMobileAdd}
        className="fixed bottom-24 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-3xl font-bold text-white shadow-lg shadow-blue-500/40 transition hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 lg:hidden"
        aria-label="Añadir turno"
      >
        +
      </button>

      <MobileNavigation active={activeMobileTab} onChange={setActiveMobileTab} />

      <MobileAddShiftSheet
        open={isMobileAddOpen}
        onClose={handleCloseMobileAdd}
        onAdd={(shift) => {
          handleAddShift(shift)
          handleCloseMobileAdd()
        }}
        selectedDate={selectedDateFromCalendar}
        onDateConsumed={() => setSelectedDateFromCalendar(null)}
      />

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
