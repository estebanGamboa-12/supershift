/**
 * Precios y planes: única fuente de verdad para la app y Stripe.
 * Créditos por plan en @/lib/credits.ts
 */

export type PlanId = "free" | "pro_monthly" | "pro_annual" | "unlimited_monthly" | "unlimited_annual"

export type PlanItem = {
  id: PlanId
  name: string
  /** Precio en euros (0 = gratis). */
  priceEur: number
  /** "monthly" | "annual" */
  interval: "monthly" | "annual"
  /** Créditos incluidos (null = ilimitado). */
  credits: number | null
  /** Etiqueta corta para UI (ej. "80/mes"). */
  creditsLabel: string
  /** Para Stripe price ID cuando lo tengas. */
  stripePriceId?: string
}

/** Precios estratégicos: Free, Pro (500 cr.), Ilimitado. */
export const PLANS: PlanItem[] = [
  {
    id: "free",
    name: "Free",
    priceEur: 0,
    interval: "monthly",
    credits: 80,
    creditsLabel: "80 créditos/mes",
  },
  {
    id: "pro_monthly",
    name: "Pro",
    priceEur: 7,
    interval: "monthly",
    credits: 500,
    creditsLabel: "500 créditos/mes",
  },
  {
    id: "pro_annual",
    name: "Pro Anual",
    priceEur: 70,
    interval: "annual",
    credits: 6_000,
    creditsLabel: "6.000 créditos/año",
  },
  {
    id: "unlimited_monthly",
    name: "Ilimitado",
    priceEur: 10,
    interval: "monthly",
    credits: null,
    creditsLabel: "Ilimitado",
  },
  {
    id: "unlimited_annual",
    name: "Ilimitado Anual",
    priceEur: 100,
    interval: "annual",
    credits: null,
    creditsLabel: "Ilimitado",
  },
]

/** Precio mensual equivalente del plan anual (para mostrar "X €/mes"). */
export function monthlyEquivalentFromAnnual(annualEur: number): number {
  return Math.round((annualEur / 12) * 100) / 100
}

export const PRO_MONTHLY_EUR = 7
export const PRO_ANNUAL_EUR = 70
export const UNLIMITED_MONTHLY_EUR = 10
export const UNLIMITED_ANNUAL_EUR = 100
