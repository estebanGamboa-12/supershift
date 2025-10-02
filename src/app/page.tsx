'use client'

import { useState } from "react"
import shiftsData from "@/data/shifts.json"
import CalendarView from "@/components/CalendarView"
import EditShiftModal from "@/components/EditShiftModal"
import RotationForm from "@/components/RotationForm"
import { generateRotation } from "@/lib/generateRotation"

export default function Home() {
  const [shifts, setShifts] = useState(
    shiftsData.map((s) => ({
      ...s,
      start: new Date(s.date),
      end: new Date(s.date),
    }))
  )
  const [selectedShift, setSelectedShift] = useState<any | null>(null)

  const handleSave = (updatedShift: any) => {
    const updated = {
      ...updatedShift,
      start: new Date(updatedShift.date),
      end: new Date(updatedShift.date),
    }
    setShifts(shifts.map((s) => (s.id === updated.id ? updated : s)))
    setSelectedShift(null)
  }

  const handleDelete = (id: number) => {
    setShifts(shifts.filter((s) => s.id !== id))
    setSelectedShift(null)
  }

  const handleGenerate = ({
    startDate,
    cycle,
  }: {
    startDate: string
    cycle: number[]
  }) => {
    const generated = generateRotation(startDate, cycle, 60).map((s, i) => ({
      ...s,
      id: i + 1,
      start: new Date(s.date),
      end: new Date(s.date),
    }))
    setShifts(generated)
  }

  return (
    <div className="p-6 space-y-6">
      <RotationForm onGenerate={handleGenerate} />
      <CalendarView shifts={shifts} onSelectEvent={setSelectedShift} />
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
