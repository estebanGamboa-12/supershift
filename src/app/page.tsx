'use client'

import { useCallback, useEffect, useState } from "react"
import CalendarView from "@/components/CalendarView"
import EditShiftModal from "@/components/EditShiftModal"
import RotationForm from "@/components/RotationForm"
import type { Shift } from "@/types/shifts"

type ShiftEvent = Shift & {
  start: Date
  end: Date
}

async function readError(response: Response) {
  try {
    const payload = await response.json()
    if (payload?.message) {
      return payload.message as string
    }
  } catch {
    // ignore
  }
  return response.statusText || "Error inesperado"
}

type ShiftFromApi = {
  id: number
  date: string
  type: Shift["type"]
  note?: string | null
}

export default function Home() {
  const [shifts, setShifts] = useState<ShiftEvent[]>([])
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toEvent = useCallback(
    (shift: ShiftFromApi) => ({
      ...shift,
      note: shift.note ?? "",
      start: new Date(`${shift.date}T00:00:00`),
      end: new Date(`${shift.date}T23:59:59`),
    }),
    []
  )

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        setLoading(true)
        const response = await fetch("/api/shifts")
        if (!response.ok) {
          throw new Error(await readError(response))
        }
        const data: ShiftFromApi[] = await response.json()
        setShifts(data.map((shift) => toEvent(shift)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los turnos")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [toEvent])

  const handleSave = async (updatedShift: ShiftEvent) => {
    try {
      setError(null)
      const response = await fetch(`/api/shifts/${updatedShift.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: updatedShift.date,
          type: updatedShift.type,
          note: updatedShift.note,
        }),
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const saved: ShiftFromApi = await response.json()
      const event = toEvent(saved)
      setShifts((current) => current.map((shift) => (shift.id === event.id ? event : shift)))
      setSelectedShift(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el turno")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setError(null)
      const response = await fetch(`/api/shifts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      setShifts((current) => current.filter((shift) => shift.id !== id))
      setSelectedShift(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el turno")
    }
  }

  const handleGenerate = async ({
    startDate,
    cycle,
  }: {
    startDate: string
    cycle: number[]
  }) => {
    try {
      setError(null)
      const response = await fetch("/api/shifts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startDate, cycle }),
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const generated: ShiftFromApi[] = await response.json()
      setShifts(generated.map((shift) => toEvent(shift)))
      setSelectedShift(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron generar los turnos")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <RotationForm onGenerate={handleGenerate} />
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded bg-white p-6 text-center text-sm text-gray-500 shadow">
          Cargando turnos...
        </div>
      ) : (
        <CalendarView shifts={shifts} onSelectEvent={setSelectedShift} />
      )}
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
