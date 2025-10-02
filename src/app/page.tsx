"use client"

import { useState, useMemo } from "react"
import shiftsData from "@/data/shifts.json"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import CalendarView from "@/components/CalendarView"
import AgendaView from "@/components/AgendaView"
import EditShiftModal from "@/components/EditShiftModal"

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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="p-4 border-b border-white/10">
        <h1 className="font-bold text-lg">📅 Supershift</h1>
      </header>

      <main className="flex-1">
        <div className="hidden md:block h-full">
          <CalendarView
            shifts={shifts}
            onSelectEvent={setSelectedShift}
            className="h-full"
          />
        </div>
        <div className="md:hidden">
          <AgendaView
            shifts={shifts}
            onSelectEvent={setSelectedShift}
          />
        </div>
      </main>

      {selectedShift && (
        <EditShiftModal
          shift={selectedShift}
          onSave={(s) => {
            setShifts((curr) => curr.map((sh) => sh.id === s.id ? s : sh))
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
