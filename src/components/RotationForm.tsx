'use client'

import { useMemo, useState } from "react"
import { motion } from "framer-motion"

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
    return { work, rest, totalDays }
  }, [model])

  const formattedStart = useMemo(() => {
    if (!start) return "Selecciona una fecha de inicio"
    const parsed = new Date(start)
    if (Number.isNaN(parsed.getTime())) return "Selecciona una fecha válida"

    return parsed.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }, [start])

  const handleUseToday = () => {
    const today = new Date()
    const iso = today.toISOString().split("T")[0]
    setStart(iso)
    setError("")
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!start) {
      setError("Por favor selecciona una fecha de inicio")
      return
    }

    const [work, rest] = model.split("x").map(Number)
    onGenerate({ startDate: start, cycle: [work, rest] })
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-white shadow-xl max-w-lg w-full mx-auto"
    >
      {/* Título */}
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Generador de rotaciones</h2>
        <p className="text-sm text-white/60">
          Define una fecha inicial y selecciona un modelo de ciclo para rellenar automáticamente tu agenda.
        </p>
      </header>

      {/* Fecha */}
      <fieldset className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-800/60 p-4">
        <legend className="text-xs font-semibold uppercase text-blue-200/80">
          Fecha de inicio
        </legend>

        <p className="text-sm font-medium">{formattedStart}</p>

        <div className="flex gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="flex-1 rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            type="button"
            onClick={handleUseToday}
            className="rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
          >
            Hoy
          </button>
        </div>
      </fieldset>

      {/* Modelo */}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-4">
        <legend className="text-xs font-semibold uppercase text-blue-200/80">
          Modelo de ciclo
        </legend>

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="4x2">4x2 (clásico)</option>
          <option value="5x3">5x3 (intensivo)</option>
          <option value="6x3">6x3 (larga duración)</option>
        </select>

        <div className="text-xs text-white/70">
          {modelDescription.work} días de trabajo / {modelDescription.rest} de descanso
          <br />
          <span className="text-blue-300">{modelDescription.totalDays} días por ciclo</span>
        </div>
      </fieldset>

      {/* Error */}
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      {/* Botón */}
      <button
        type="submit"
        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-400 hover:to-indigo-400"
      >
        Generar rotación
      </button>
    </motion.form>
  )
}
// Este componente permite al usuario seleccionar una fecha de inicio y un modelo de ciclo (4x2, 5x3, 6x3).