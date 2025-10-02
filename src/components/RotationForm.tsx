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

  const formattedStart = useMemo(() => {
    if (!start) {
      return "Selecciona una fecha de inicio"
    }

    const parsed = new Date(start)
    if (Number.isNaN(parsed.getTime())) {
      return "Selecciona una fecha válida"
    }

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
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-white shadow-xl shadow-blue-500/10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:p-7"
    >
      <div className="flex flex-col gap-6">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
            Planificación automática
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Generador de rotaciones</h2>
            <p className="max-w-xl text-sm text-white/60">
              Define una fecha inicial y selecciona un modelo de ciclo para rellenar automáticamente tu agenda de turnos.
            </p>
          </div>
        </header>

        <section className="grid gap-5">
          <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
              Fecha de inicio
            </legend>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-white/50">Comenzamos el</p>
                <p className="text-lg font-semibold leading-tight capitalize">{formattedStart}</p>
                <p className="text-xs text-white/50">Esta fecha marca el arranque del ciclo de turnos.</p>
              </div>
              <div className="flex flex-col gap-3 sm:justify-self-end">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-inner">
                  <span className="text-lg" aria-hidden>
                    🗓️
                  </span>
                  <input
                    type="date"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-white placeholder:text-white/40 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUseToday}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/20 hover:bg-white/10"
                >
                  Usar hoy
                </button>
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
              Modelo de ciclo
            </legend>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Selecciona un patrón
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="4x2">4x2 (clásico)</option>
                  <option value="5x3">5x3 (intensivo)</option>
                  <option value="6x3">6x3 (larga duración)</option>
                </select>
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                <p className="font-semibold text-white">¿Cómo funciona?</p>
                <p className="mt-2">
                  Aplicamos el patrón seleccionado para generar automáticamente los próximos 60 días de turnos alternando trabajo y descanso.
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-2 text-[11px] text-white/50">
              <li className="rounded-full border border-white/10 px-3 py-1">Ideal para equipos rotativos</li>
              <li className="rounded-full border border-white/10 px-3 py-1">Actualiza turnos en segundos</li>
              <li className="rounded-full border border-white/10 px-3 py-1">Mantén equilibrada la carga laboral</li>
            </ul>
          </fieldset>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 sm:ml-auto sm:w-auto"
          >
            Generar rotación
          </button>
        </div>
      </div>

      <aside className="flex flex-col justify-between gap-6 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-slate-950/60 p-5 text-sm text-blue-100 shadow-inner shadow-blue-500/20">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Resumen del ciclo</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {modelDescription.work} días de trabajo / {modelDescription.rest} de descanso
            </p>
            <p className="text-xs text-blue-100/70">{modelDescription.totalDays} días por ciclo</p>
          </div>

          <dl className="space-y-3 text-xs text-blue-100/80">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-lg" aria-hidden>
                🔁
              </span>
              <div>
                <dt className="font-semibold text-white">Repite automáticamente</dt>
                <dd>Tu modelo se aplicará durante los próximos 60 días.</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-lg" aria-hidden>
                📅
              </span>
              <div>
                <dt className="font-semibold text-white">Sincroniza con la agenda</dt>
                <dd>Los nuevos turnos aparecerán inmediatamente en el calendario.</dd>
              </div>
            </div>
          </dl>
        </div>

        <ul className="flex flex-wrap gap-2 text-[11px] text-blue-100/70">
          <li className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/20 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300" aria-hidden /> Trabajo
          </li>
          <li className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/20 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-300" aria-hidden /> Descanso
          </li>
        </ul>
      </aside>
    </form>
  )
}
