/**
 * Sistema de créditos: saldo por usuario y deducción por acciones.
 * Solo para uso en servidor (API routes).
 */

/** Créditos que tiene un usuario free cada mes (o al no tener saldo en BD). */
export const FREE_TIER_CREDITS = 80

/** Créditos que recibe un usuario Pro al renovar cada mes (suscripción mensual). */
export const PLAN_PRO_MONTHLY_CREDITS = 500

/** Créditos que recibe un usuario Pro al renovar cada año (suscripción anual). */
export const PLAN_PRO_ANNUAL_CREDITS = 6_000

export const CREDIT_COSTS = {
  create_shift: 1,
  create_shift_template: 8,
  create_rotation_template: 12,
  add_extra: 3,
} as const

export type CreditActionType = keyof typeof CREDIT_COSTS

type SupabaseClient = import("@supabase/supabase-js").SupabaseClient

export async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("users")
    .select("credit_balance")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[credits] Error reading balance", error)
    throw new Error("No se pudo obtener el saldo de créditos")
  }

  const balance = data?.credit_balance
  if (typeof balance !== "number") {
    return FREE_TIER_CREDITS
  }
  return Math.max(0, Math.trunc(balance))
}

/**
 * Deduce créditos. Lanza si no hay saldo suficiente.
 */
export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  actionType: CreditActionType,
  referenceId?: string | null,
): Promise<void> {
  if (amount <= 0) {
    return
  }

  const currentBalance = await getCreditBalance(supabase, userId)
  if (currentBalance < amount) {
    throw new Error("CREDITS_INSUFFICIENT")
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ credit_balance: currentBalance - amount })
    .eq("id", userId)

  if (updateError) {
    console.error("[credits] Error deducting", updateError)
    throw new Error("No se pudo descontar créditos")
  }

  const { error: insertError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    action_type: actionType,
    reference_id: referenceId ?? null,
  })
  if (insertError) {
    console.warn("[credits] Transaction log failed (deduction applied)", insertError)
  }
}
