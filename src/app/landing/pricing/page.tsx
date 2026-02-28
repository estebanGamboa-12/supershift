"use client"

import { useState } from "react"
import Link from "next/link"
import {
  PLANS,
  PRO_MONTHLY_EUR,
  PRO_ANNUAL_EUR,
  UNLIMITED_MONTHLY_EUR,
  UNLIMITED_ANNUAL_EUR,
  monthlyEquivalentFromAnnual,
} from "@/lib/pricing"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.planloop.app"

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly")

  const free = PLANS.find((p) => p.id === "free")!
  const proMonthly = PLANS.find((p) => p.id === "pro_monthly")!
  const proAnnual = PLANS.find((p) => p.id === "pro_annual")!
  const unlimitedMonthly = PLANS.find((p) => p.id === "unlimited_monthly")!
  const unlimitedAnnual = PLANS.find((p) => p.id === "unlimited_annual")!

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Planes y precios
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Free para empezar. Pro o Ilimitado con facturación mensual o anual (2 meses gratis al año).
        </p>

        {/* Toggle Mes / Año */}
        <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-xl border border-white/15 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              interval === "monthly"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                : "text-white/70 hover:text-white"
            }`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              interval === "annual"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                : "text-white/70 hover:text-white"
            }`}
          >
            Año
          </button>
        </div>
        {interval === "annual" && (
          <p className="mt-2 text-xs text-emerald-400">
            Pagas 10 meses, tienes 12. Ahorro de 2 meses.
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        {/* Free */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <h2 className="text-xl font-semibold text-white">{free.name}</h2>
          <p className="mt-2 text-3xl font-bold text-white">
            0 €<span className="text-base font-normal text-slate-400">/mes</span>
          </p>
          <p className="mt-1 text-sm text-slate-400">{free.creditsLabel}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li>• Calendario y turnos</li>
            <li>• Extras y tarifa/hora</li>
            <li>• Reportes básicos</li>
          </ul>
          <Link
            href={`${APP_URL}/`}
            className="mt-6 flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Crear cuenta gratis
          </Link>
        </div>

        {/* Pro (medio) */}
        <div className="relative rounded-3xl border-2 border-sky-400/50 bg-sky-500/10 p-6 shadow-xl shadow-sky-500/10 backdrop-blur-sm sm:p-8">
          <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
            Recomendado
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Pro</h2>
          {interval === "monthly" ? (
            <>
              <p className="mt-2 text-3xl font-bold text-white">
                {PRO_MONTHLY_EUR} €<span className="text-base font-normal text-slate-400">/mes</span>
              </p>
              <p className="mt-1 text-sm text-sky-200">{proMonthly.creditsLabel}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-white">
                {PRO_ANNUAL_EUR} €<span className="text-base font-normal text-slate-400">/año</span>
              </p>
              <p className="mt-1 text-sm text-sky-200">{proAnnual.creditsLabel}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {monthlyEquivalentFromAnnual(PRO_ANNUAL_EUR)} €/mes
              </p>
            </>
          )}
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>• Todo lo de Free</li>
            <li>• 500 cr/mes o 6.000 cr/año</li>
            <li>• Plantillas y rotaciones</li>
          </ul>
          <Link
            href={`${APP_URL}/`}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
          >
            {interval === "monthly" ? "Pro por mes" : "Pro por año"}
          </Link>
        </div>

        {/* Ilimitado */}
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/5 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <h2 className="text-xl font-semibold text-white">{unlimitedMonthly.name}</h2>
          {interval === "monthly" ? (
            <>
              <p className="mt-2 text-3xl font-bold text-white">
                {UNLIMITED_MONTHLY_EUR} €<span className="text-base font-normal text-slate-400">/mes</span>
              </p>
              <p className="mt-1 text-sm text-emerald-300">{unlimitedMonthly.creditsLabel}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-white">
                {UNLIMITED_ANNUAL_EUR} €<span className="text-base font-normal text-slate-400">/año</span>
              </p>
              <p className="mt-1 text-sm text-emerald-300">{unlimitedAnnual.creditsLabel}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {monthlyEquivalentFromAnnual(UNLIMITED_ANNUAL_EUR)} €/mes
              </p>
            </>
          )}
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>• Todo lo de Pro</li>
            <li>• Créditos sin límite</li>
            <li>• Uso intensivo / equipos</li>
          </ul>
          <Link
            href={`${APP_URL}/`}
            className="mt-6 flex w-full items-center justify-center rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 hover:border-emerald-400/70"
          >
            {interval === "monthly" ? "Ilimitado por mes" : "Ilimitado por año"}
          </Link>
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-slate-500">
        Sin tarjeta para Free. El pago de Pro e Ilimitado se activará pronto en la app.
      </p>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sky-400 hover:text-sky-300">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
