"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"

export default function RotationForm({
  onGenerate,
}: {
  onGenerate: (shifts: { startDate: string; cycle: number[] }) => Promise<void>
}) {
  const [start, setStart] = useState("")
  const [model, setModel] = useState("4x2")
  const [error, setError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSubmitError("")

    if (!start) {
      setError("Por favor selecciona una fecha de inicio")
      return
    }

    const [work, rest] = model.split("x").map(Number)
    try {
      setIsGenerating(true)
      await onGenerate({ startDate: start, cycle: [work, rest] })
    } catch (generationError) {
      setSubmitError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar la rotación. Inténtalo más tarde."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl backdrop-blur-xl"
    >
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-fuchsia-500/5 to-transparent opacity-80" />

      {/* Título */}
      <header className="relative mb-6 text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
          Generador de rotaciones
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Define una fecha inicial y selecciona un modelo de ciclo para rellenar
          automáticamente tu agenda.
        </p>
      </header>

      {/* Fecha */}
      <fieldset className="relative mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-800/60 p-4">
        <legend className="px-2 text-xs font-semibold uppercase text-blue-200/80">
          Fecha de inicio
        </legend>

        <p className="text-sm font-medium">{formattedStart}</p>

        <div className="flex gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="flex-1 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            type="button"
            onClick={handleUseToday}
            className="rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Hoy
          </button>
        </div>
      </fieldset>

      {/* Modelo */}
      <fieldset className="relative mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-4">
        <legend className="px-2 text-xs font-semibold uppercase text-blue-200/80">
          Modelo de ciclo
        </legend>

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
        >
          <option value="4x2">4x2 (clásico)</option>
          <option value="5x3">5x3 (intensivo)</option>
          <option value="6x3">6x3 (larga duración)</option>
        </select>

        <div className="text-xs text-white/70">
          {modelDescription.work} días de trabajo / {modelDescription.rest} de
          descanso
          <br />
          <span className="text-blue-300">
            {modelDescription.totalDays} días por ciclo
          </span>
        </div>
      </fieldset>

      {/* Errores */}
      {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}
      {submitError && (
        <p className="mb-3 text-center text-sm text-red-400">{submitError}</p>
      )}

      {/* Botón con spinner */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="submit"
        disabled={isGenerating}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? (
          <>
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            Generando...
          </>
        ) : (
          "Generar rotación"
        )}
      </motion.button>

      {/* Tagline */}
      <p className="mt-6 text-center text-[11px] tracking-[0.25em] text-white/40">
        Planifica sin complicaciones
      </p>
    </form>
  )
}
