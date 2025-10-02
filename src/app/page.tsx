"use client"

import { useState, useMemo, useCallback, useRef } from "react"
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-[-30%] h-[480px] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex min-h-screen">
        <DashboardSidebar />

        <div className="flex w-full flex-col">
          <DashboardHeader
            onQuickAdd={handleGoToToday}
            nextShift={nextShift}
            daysUntilNextShift={daysUntilNextShift}
            shiftTypeLabels={SHIFT_TYPE_LABELS}
            currentMonthShiftCount={currentMonthShifts.length}
            totalShiftCount={orderedShifts.length}
            activeShiftTypes={activeShiftTypes}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
              <div className="grid gap-6 lg:grid-cols-12">
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
