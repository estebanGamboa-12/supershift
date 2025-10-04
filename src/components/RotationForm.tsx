"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"

type RotationMode = "preset" | "manual"

enum PresetOption {
  CLASSIC = "4x2",
  INTENSIVE = "5x3",
  LONG = "6x3",
}

export default function RotationForm({
  onGenerate,
}: {
  onGenerate: (shifts: { startDate: string; cycle: number[] }) => Promise<void>
}) {
  const [start, setStart] = useState("")
  const [mode, setMode] = useState<RotationMode>("preset")
  const [model, setModel] = useState<PresetOption>(PresetOption.CLASSIC)
  const [manualWorkDays, setManualWorkDays] = useState("4")
  const [manualRestDays, setManualRestDays] = useState("2")
  const [error, setError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const modelDescription = useMemo(() => {
    if (mode === "manual") {
      const work = Number.parseInt(manualWorkDays, 10)
      const rest = Number.parseInt(manualRestDays, 10)
      const safeWork = Number.isFinite(work) && work > 0 ? work : 0
      const safeRest = Number.isFinite(rest) && rest > 0 ? rest : 0
      const totalDays = safeWork + safeRest
      return { work: safeWork, rest: safeRest, totalDays }
    }

    const [work, rest] = String(model)
      .split("x")
      .map((value) => Number.parseInt(value, 10))
    const totalDays = work + rest
    return { work, rest, totalDays }
  }, [manualRestDays, manualWorkDays, mode, model])

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

  const handleChangeMode = (nextMode: RotationMode) => {
    setMode(nextMode)
    setError("")
    setSubmitError("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSubmitError("")

    if (!start) {
      setError("Por favor selecciona una fecha de inicio")
      return
    }

    let work: number
    let rest: number

    if (mode === "manual") {
      work = Number.parseInt(manualWorkDays, 10)
      rest = Number.parseInt(manualRestDays, 10)

      if (!Number.isFinite(work) || work <= 0 || !Number.isFinite(rest) || rest <= 0) {
        setError("Define días válidos para trabajo y descanso")
        return
      }
    } else {
      ;[work, rest] = String(model)
        .split("x")
        .map((value) => Number.parseInt(value, 10))
    }

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleChangeMode("preset")}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500 ${
              mode === "preset"
                ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                : "border-white/10 bg-slate-900/60 text-white/80 hover:border-fuchsia-400/40 hover:text-white"
            }`}
          >
            Usar plantillas
          </button>
          <button
            type="button"
            onClick={() => handleChangeMode("manual")}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500 ${
              mode === "manual"
                ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                : "border-white/10 bg-slate-900/60 text-white/80 hover:border-fuchsia-400/40 hover:text-white"
            }`}
          >
            Diseñar mi ciclo
          </button>
        </div>

        {mode === "preset" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-3">
            <label className="text-xs uppercase tracking-wide text-white/50">
              Plantillas rápidas
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as PresetOption)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
            >
              <option value={PresetOption.CLASSIC}>4x2 (clásico)</option>
              <option value={PresetOption.INTENSIVE}>5x3 (intensivo)</option>
              <option value={PresetOption.LONG}>6x3 (larga duración)</option>
            </select>
            <p className="text-xs text-white/60">
              Selecciona una combinación de días laborales y de descanso ya preparada.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">
              Personaliza tu ciclo
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs text-white/70">
                Días de trabajo consecutivos
                <input
                  type="number"
                  min={1}
                  value={manualWorkDays}
                  onChange={(event) => setManualWorkDays(event.target.value)}
                  className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                Días de descanso consecutivos
                <input
                  type="number"
                  min={1}
                  value={manualRestDays}
                  onChange={(event) => setManualRestDays(event.target.value)}
                  className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                />
              </label>
            </div>
            <p className="text-xs text-white/60">
              Define cuántos días seguidos trabajarás y cuántos descansarás antes de repetir el patrón.
            </p>
          </div>
        )}

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
