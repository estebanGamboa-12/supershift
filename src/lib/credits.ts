/**
 * Sistema de créditos: saldo por usuario y deducción por acciones.
 * Solo para uso en servidor (API routes).
 */

export const FREE_TIER_CREDITS = 100

export const CREDIT_COSTS = {
  create_shift: 10,
  create_shift_template: 20,
  create_rotation_template: 20,
  add_extra: 10,
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
