"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"

const STEPS = [
  { title: "Pantalla Calendario", body: "Aquí ves tu agenda. Todo gira alrededor de esta pantalla: ver días, cambiar a vista Mes y arrastrar turnos." },
  { title: "Día y Mes", body: "Día = un día con horarios. Mes = todo el mes. Pulsa «Mes» y podrás arrastrar los turnos de un día a otro. Pruébalo." },
  { title: "Minicalendario", body: "Haz clic en un día para ir a esa fecha." },
  { title: "Próximos turnos", body: "Resumen rápido de los próximos turnos." },
  { title: "Añadir turno", body: "Pulsa «+ Añadir Turno» para crear un turno. En vista Mes también tienes «Crear Turno» en el lateral." },
]

type OnboardingTourProps = {
  runInitially: boolean
  onComplete: () => void
  forceRun?: boolean
  userId: string | null
}

export default function OnboardingTour({
  runInitially,
  onComplete,
  forceRun = false,
  userId,
}: OnboardingTourProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const hasRunInitially = useRef(false)
  const forceRunConsumed = useRef(false)

  const open = useCallback(() => {
    setStep(0)
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    onComplete()
  }, [onComplete])

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      close()
    } else {
      setStep((s) => s + 1)
    }
  }, [step, close])

  useEffect(() => {
    if (!userId) return

    if (forceRun && !forceRunConsumed.current) {
      forceRunConsumed.current = true
      const t = setTimeout(open, 600)
      return () => clearTimeout(t)
    }

    if (!forceRun) forceRunConsumed.current = false

    if (runInitially && !hasRunInitially.current) {
      hasRunInitially.current = true
      const t = setTimeout(open, 800)
      return () => clearTimeout(t)
    }
  }, [userId, runInitially, forceRun, open])

  if (!visible || typeof document === "undefined") return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="absolute inset-0 bg-black/85"
        onClick={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 px-6 py-5 shadow-2xl">
        <p id="onboarding-title" className="text-sm font-semibold uppercase tracking-wide text-sky-300">
          {current.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/90">{current.body}</p>
        <p className="mt-3 text-xs text-white/50">
          {step + 1} de {STEPS.length}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-400"
          >
            {isLast ? "Entendido" : "Siguiente"}
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Omitir
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
