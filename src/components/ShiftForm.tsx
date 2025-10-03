'use client'

import { useState } from "react"
import type { ShiftType } from "@/types/shifts"

type NewShift = {
  date: string
  type: ShiftType
}

export default function ShiftForm({ onAddShift }: { onAddShift: (shift: NewShift) => void }) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<ShiftType>("WORK")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!date) return
    onAddShift({ date, type })
    setDate("")
    setType("WORK")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-3 bg-white p-4 rounded shadow"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="form-input border p-2 rounded flex-1"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ShiftType)}
        className="form-select border p-2 rounded"
      >
        <option value="WORK">WORK</option>
        <option value="REST">REST</option>
        <option value="NIGHT">NIGHT</option>
        <option value="VACATION">VACATION</option>
        <option value="CUSTOM">CUSTOM</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Añadir
      </button>
    </form>
  )
}
