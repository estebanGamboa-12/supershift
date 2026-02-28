"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import {
  FREE_TIER_CREDITS,
  PLAN_PRO_MONTHLY_CREDITS,
  PLAN_PRO_ANNUAL_CREDITS,
} from "@/lib/credits"
import {
  PRO_MONTHLY_EUR,
  PRO_ANNUAL_EUR,
  UNLIMITED_MONTHLY_EUR,
  UNLIMITED_ANNUAL_EUR,
  monthlyEquivalentFromAnnual,
} from "@/lib/pricing"

type BillingInterval = "monthly" | "annual"

export default function PricingPage() {
  const router = useRouter()
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const [isChecking, setIsChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null
    try {
      return getSupabaseBrowserClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setIsChecking(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session?.access_token)
      setIsChecking(false)
      if (!data.session?.access_token) {
        router.replace("/")
      }
    })
  }, [supabase, router])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-white">
            <PlanLoopLogo size="sm" showText />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            ← Volver al panel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planes
        </h1>
        <p className="mt-2 text-slate-400">
          Elige mensual o anual. Más créditos con Pro, o ilimitado con el plan superior. Facturación anual = 2 meses gratis.
        </p>

        <div className="mt-8 flex justify-center gap-2 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              interval === "monthly"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "text-white/70 hover:text-white"
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              interval === "annual"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "text-white/70 hover:text-white"
            }`}
          >
            Anual
          </button>
        </div>
        {interval === "annual" && (
          <p className="mt-2 text-center text-xs text-emerald-400">
            Pagas 10 meses, tienes 12. Ahorro de 2 meses.
          </p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {/* Gratis */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Gratis</h2>
            <p className="mt-1 text-3xl font-bold text-white">
              0 €<span className="text-base font-normal text-slate-400">/mes</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {FREE_TIER_CREDITS} créditos al mes. Calendario, plantillas y reportes.
            </p>
            <Link
              href="/"
              className="mt-6 block w-full rounded-xl border border-white/20 bg-white/5 py-3 text-center text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Ya lo tienes
            </Link>
          </div>

          {/* Pro (medio) */}
          <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-500/10 p-6 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Recomendado</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Pro</h2>
            {interval === "monthly" ? (
              <>
                <p className="mt-1 text-3xl font-bold text-white">
                  {PRO_MONTHLY_EUR} €<span className="text-base font-normal text-slate-400">/mes</span>
                </p>
                <p className="mt-1 text-sm text-sky-200">{PLAN_PRO_MONTHLY_CREDITS} créditos/mes</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold text-white">
                  {PRO_ANNUAL_EUR} €<span className="text-base font-normal text-slate-400">/año</span>
                </p>
                <p className="mt-1 text-sm text-sky-200">{PLAN_PRO_ANNUAL_CREDITS.toLocaleString("es-ES")} créditos/año</p>
                <p className="mt-0.5 text-xs text-slate-400">{monthlyEquivalentFromAnnual(PRO_ANNUAL_EUR)} €/mes</p>
              </>
            )}
            <p className="mt-3 text-sm text-slate-300">
              Plantillas, rotaciones y más margen para planificar.
            </p>
            <a
              href="#checkout"
              className="mt-6 block w-full rounded-xl bg-sky-500 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
            >
              Ir al checkout
            </a>
          </div>

          {/* Ilimitado */}
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Ilimitado</h2>
            {interval === "monthly" ? (
              <>
                <p className="mt-1 text-3xl font-bold text-white">
                  {UNLIMITED_MONTHLY_EUR} €<span className="text-base font-normal text-slate-400">/mes</span>
                </p>
                <p className="mt-1 text-sm text-emerald-300">Créditos ilimitados</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold text-white">
                  {UNLIMITED_ANNUAL_EUR} €<span className="text-base font-normal text-slate-400">/año</span>
                </p>
                <p className="mt-1 text-sm text-emerald-300">Créditos ilimitados</p>
                <p className="mt-0.5 text-xs text-slate-400">{monthlyEquivalentFromAnnual(UNLIMITED_ANNUAL_EUR)} €/mes</p>
              </>
            )}
            <p className="mt-3 text-sm text-slate-400">
              Sin límite. Prioridad y uso intensivo.
            </p>
            <a
              href="#checkout"
              className="mt-6 block w-full rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 py-3 text-center text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
            >
              Ir al checkout
            </a>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          El checkout se abrirá aquí cuando configures Stripe (o tu pasarela). Mientras tanto, puedes seguir usando el plan gratis.
        </p>
      </main>
    </div>
  )
}
