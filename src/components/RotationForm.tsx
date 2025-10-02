'use client'

import { useMemo, useState } from "react"

export default function RotationForm({
  onGenerate,
}: {
  onGenerate: (shifts: { startDate: string; cycle: number[] }) => void
}) {
  const [start, setStart] = useState("")
  const [model, setModel] = useState("4x2")
  const [error, setError] = useState("")

  const modelDescription = useMemo(() => {
    const [work, rest] = model.split("x").map(Number)
    const totalDays = work + rest
    return {
      work,
      rest,
      totalDays,
    }
  }, [model])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!start) {
      setError("Por favor selecciona una fecha de inicio")
      return
    }

    const [work, rest] = model.split("x").map(Number)
    onGenerate({ startDate: start, cycle: [work, rest] })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Generador de rotaciones</h2>
          <p className="text-sm text-slate-500">
            Elige un modelo clásico (4x2, 5x3 o 6x3) y calcula automáticamente 60 días de turnos.
          </p>
        </div>
        <div className="w-full rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 sm:w-auto sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Ciclo activo</p>
          <p className="font-semibold">
            {modelDescription.work} días de trabajo / {modelDescription.rest} de descanso
          </p>
          <p className="text-xs text-blue-500">{modelDescription.totalDays} días por ciclo</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Fecha de inicio
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Modelo
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="4x2">4x2 (clásico)</option>
            <option value="5x3">5x3 (intensivo)</option>
            <option value="6x3">6x3 (larga duración)</option>
          </select>
        </label>

        <div className="flex items-end justify-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-auto"
          >
            Generar rotación
          </button>
        </div>
        {error && <p className="text-sm text-red-500 sm:col-span-3">{error}</p>}
      </form>
    </div>
  )
}
