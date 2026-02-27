import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

function sanitizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Marca el tour de onboarding como completado para el usuario. */
export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: rawUserId } = await context.params
    const userId = sanitizeUserId(rawUserId)
    if (!userId) {
      return NextResponse.json({ error: "Identificador de usuario no válido" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("user_onboarding")
      .upsert(
        {
          user_id: userId,
          onboarding_completed: true,
          onboarding_version: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

    if (error) {
      console.error("Error updating onboarding status", error)
      return NextResponse.json(
        { error: "No se pudo guardar el estado del tour" },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("PATCH onboarding", err)
    return NextResponse.json(
      { error: "Error al guardar" },
      { status: 500 },
    )
  }
}
