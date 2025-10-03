'use client'

import { useState, useEffect } from "react"
import type { Shift } from "@/types/shifts"

type CalendarShift = Shift & {
  start: Date
  end: Date
}

export default function EditShiftModal({
  shift,
  onSave,
  onDelete,
  onClose,
}: {
  shift: CalendarShift
  onSave: (updatedShift: CalendarShift) => void
  onDelete: (id: number) => void
  onClose: () => void
}) {
  const [date, setDate] = useState("")
  const [type, setType] = useState<Shift["type"]>("WORK")
  const [note, setNote] = useState("")

  useEffect(() => {
    setDate(shift.date)
    setType(shift.type)
    setNote(shift.note ?? "")
  }, [shift])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave({ ...shift, date, type, note })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center md:items-center z-50">
      <div className="bg-white w-full h-full md:h-auto md:w-96 md:rounded md:shadow-md p-6 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Editar turno</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Shift["type"])}
            className="w-full border p-2 rounded"
          >
            <option value="WORK">WORK</option>
            <option value="REST">REST</option>
            <option value="NIGHT">NIGHT</option>
            <option value="VACATION">VACATION</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Añadir nota (opcional)"
            className="w-full border p-2 rounded resize-none"
            rows={3}
          />

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => onDelete(shift.id)}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Eliminar
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
