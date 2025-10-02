"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { format } from "date-fns"
import shiftsData from "@/data/shifts.json"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import CalendarView from "@/components/CalendarView"
import AgendaView from "@/components/AgendaView"
import EditShiftModal from "@/components/EditShiftModal"
import AddShiftForm from "@/components/AddShiftForm"
import RotationForm from "@/components/RotationForm"
import { generateRotation } from "@/lib/generateRotation"

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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="p-4 border-b border-white/10">
        <h1 className="font-bold text-lg">📅 Supershift</h1>
      </header>

      <main className="flex-1">
        <div className="flex flex-col gap-6 p-4 md:flex-row md:gap-6 md:p-6">
          <section className="flex flex-1 flex-col gap-6 md:flex-[3]">
            <div className="hidden h-full md:block">
              <CalendarView
                shifts={shifts}
                onSelectEvent={setSelectedShift}
                onSelectSlot={handleSelectSlot}
                className="h-full"
              />
            </div>
            <div className="md:hidden">
              <AgendaView
                shifts={shifts}
                onSelectEvent={setSelectedShift}
              />
            </div>
          </section>

          <aside className="flex flex-1 flex-col gap-6 md:flex-[1]">
            <AddShiftForm
              onAdd={handleAddShift}
              selectedDate={selectedDateFromCalendar}
              onDateConsumed={() => setSelectedDateFromCalendar(null)}
            />
            <RotationForm onGenerate={handleGenerateRotation} />
          </aside>
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
