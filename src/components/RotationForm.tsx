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
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/80 to-slate-950/90 shadow-2xl shadow-blue-500/10 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
            Planificación automática
          </div>
          <h2 className="text-lg font-semibold text-white">Generador de rotaciones</h2>
          <p className="text-sm text-white/60">
            Elige un modelo clásico (4x2, 5x3 o 6x3) y calcula automáticamente 60 días de turnos.
          </p>
        </div>
        <div className="w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100 sm:w-auto sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Ciclo activo</p>
          <p className="font-semibold text-white">
            {modelDescription.work} días de trabajo / {modelDescription.rest} de descanso
          </p>
          <p className="text-xs text-blue-200">{modelDescription.totalDays} días por ciclo</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Fecha de inicio
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Modelo
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="4x2">4x2 (clásico)</option>
            <option value="5x3">5x3 (intensivo)</option>
            <option value="6x3">6x3 (larga duración)</option>
          </select>
        </label>

        <div className="flex items-end justify-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 sm:w-auto"
          >
            Generar rotación
          </button>
        </div>
        {error && <p className="text-sm text-red-300 sm:col-span-3">{error}</p>}
      </form>
    </div>
  )
}
