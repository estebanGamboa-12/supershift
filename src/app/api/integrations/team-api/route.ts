import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "crypto"
import { getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isNaN(parsed)) {
      return null
    }
    return Math.max(1, parsed)
  }
  return null
}

function normalizeLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 190) : null
}

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

export async function GET(request: NextRequest) {
  try {
    const userId = normalizeUserId(request.nextUrl.searchParams.get("userId"))
    if (!userId) {
      return NextResponse.json(
        { error: "Debes indicar el identificador del usuario" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("id, token, label, is_active, created_at, last_used_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ keys: data ?? [] })
  } catch (error) {
    console.error("Error fetching API keys", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron recuperar las claves API del usuario.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userId = normalizeUserId(payload.userId)
    if (!userId) {
      return NextResponse.json(
        { error: "Debes indicar un usuario válido" },
        { status: 400 },
      )
    }

    const label = normalizeLabel(payload.label) ?? "Clave principal"
    const token = generateToken()

    const supabase = getSupabaseClient()

    const deactivate = await supabase
      .from("user_api_keys")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)

    if (deactivate.error) {
      throw deactivate.error
    }

    const { data, error } = await supabase
      .from("user_api_keys")
      .insert({
        user_id: userId,
        label,
        token,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      message:
        "La API quedó activada para tu equipo. Guarda este token, no volverá a mostrarse.",
      key: data,
    })
  } catch (error) {
    console.error("Error generating API key", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar una clave API para tu equipo.",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userId = normalizeUserId(payload.userId)
    const keyId = normalizeUserId(payload.keyId)
    if (!userId || !keyId) {
      return NextResponse.json(
        { error: "Debes indicar el usuario y la clave a revocar" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("user_api_keys")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("id", keyId)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: "La clave API se desactivó correctamente" })
  } catch (error) {
    console.error("Error revoking API key", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo revocar la clave API indicada.",
      },
      { status: 500 },
    )
  }
}
