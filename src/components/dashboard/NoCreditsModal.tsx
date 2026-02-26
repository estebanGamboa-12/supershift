"use client"

import { useEffect } from "react"
import Link from "next/link"
import type { FC } from "react"
import PlanLoopLogo from "@/components/PlanLoopLogo"

export const NO_CREDITS_EVENT = "planloop:no-credits"

type NoCreditsModalProps = {
  open: boolean
  onClose: () => void
  /** Coste de la acción que se intentó (ej. 10 para un turno, 20 para plantilla) */
  cost?: number
}

const NoCreditsModal: FC<NoCreditsModalProps> = ({ open, onClose, cost }) => {
  useEffect(() => {
    if (!open) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-credits-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <PlanLoopLogo size="sm" showText />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <h2 id="no-credits-title" className="text-xl font-semibold text-white">
            No tienes créditos disponibles
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Para tener más créditos disponibles, tenemos estos planes:
          </p>
          {cost != null && cost > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Esta acción cuesta {cost} créditos.
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Gratis</p>
              <p className="mt-1 text-2xl font-bold text-white">0 €<span className="text-sm font-normal text-slate-400">/mes</span></p>
              <p className="mt-2 text-xs text-slate-400">100 créditos al mes.</p>
              <Link
                href="/"
                onClick={onClose}
                className="mt-4 block w-full rounded-lg border border-white/20 bg-white/5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ya lo tienes
              </Link>
            </div>
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
              <p className="font-semibold text-white">Pro</p>
              <p className="mt-1 text-2xl font-bold text-white">10 €<span className="text-sm font-normal text-slate-400">/mes</span></p>
              <p className="mt-2 text-xs text-slate-300">Créditos ilimitados.</p>
              <Link
                href="/pricing"
                onClick={onClose}
                className="mt-4 block w-full rounded-lg bg-sky-500 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
              >
                Ver planes
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Los precios se muestran siempre que intentas una acción sin créditos.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NoCreditsModal
