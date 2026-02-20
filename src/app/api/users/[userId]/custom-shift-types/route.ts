import { NextResponse } from "next/server"
import { createSupabaseClientForUser, getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

function getSupabaseFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (token) return createSupabaseClientForUser(token)
  return null
}

function sanitizeId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeColor(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    // Validar formato hexadecimal básico
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      return trimmed
    }
  }
  return "#3b82f6" // Color por defecto
}

function sanitizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) return trimmed
  return null
}

// GET: Obtener todos los tipos de turnos personalizados del usuario
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: rawUserId } = await params
  const userId = sanitizeId(rawUserId)

  if (!userId) {
    return NextResponse.json(
      { error: "Identificador de usuario no válido" },
      { status: 400 },
    )
  }

  const supabase = getSupabaseFromRequest(request) ?? getSupabaseClient()
  try {
    const { data, error } = await supabase
      .from("user_custom_shift_types")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching custom shift types:", error)
      if (error.message?.includes("row-level security")) {
        return NextResponse.json(
          { error: "Inicia sesión para ver tus tipos de turno" },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { error: "No se pudieron obtener los tipos de turnos" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      shiftTypes: (data || []).map((row: { id: string; name: string; color: string | null; icon: string | null; default_start_time?: string | null; default_end_time?: string | null }) => ({
        id: row.id,
        name: row.name,
        color: row.color || "#3b82f6",
        icon: row.icon || undefined,
        defaultStartTime: row.default_start_time ?? undefined,
        defaultEndTime: row.default_end_time ?? undefined,
      })),
    })
  } catch (error) {
    console.error("Error in GET custom shift types:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}

// POST: Crear un nuevo tipo de turno personalizado
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: rawUserId } = await params
  const userId = sanitizeId(rawUserId)

  if (!userId) {
    return NextResponse.json(
      { error: "Identificador de usuario no válido" },
      { status: 400 },
    )
  }

  let payload: {
    name?: unknown
    color?: unknown
    icon?: unknown
    defaultStartTime?: unknown
    defaultEndTime?: unknown
  } | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const name = sanitizeString(payload?.name)
  const color = sanitizeColor(payload?.color)
  const icon = payload?.icon ? sanitizeString(payload.icon) : null
  const defaultStartTime = payload?.defaultStartTime != null ? sanitizeTime(payload.defaultStartTime) : null
  const defaultEndTime = payload?.defaultEndTime != null ? sanitizeTime(payload.defaultEndTime) : null

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es obligatorio" },
      { status: 400 },
    )
  }

  const supabase = getSupabaseFromRequest(request)
  if (!supabase) {
    return NextResponse.json(
      { error: "Inicia sesión para crear tipos de turno" },
      { status: 401 },
    )
  }

  try {
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      name,
      color,
      icon: icon || null,
      default_start_time: defaultStartTime,
      default_end_time: defaultEndTime,
    }

    let result = await supabase
      .from("user_custom_shift_types")
      .insert(insertPayload)
      .select()
      .single()

    // Si falla por columnas inexistentes (tabla sin migración), intentar sin default_start_time / default_end_time
    if (result.error && /column.*does not exist|default_start_time|default_end_time/i.test(result.error.message)) {
      const { default_start_time: _s, default_end_time: _e, ...payloadWithoutTimes } = insertPayload as Record<string, unknown> & { default_start_time?: unknown; default_end_time?: unknown }
      result = await supabase
        .from("user_custom_shift_types")
        .insert(payloadWithoutTimes)
        .select()
        .single()
    }

    const { data, error } = result

    if (error) {
      console.error("Error creating custom shift type:", error)
      if (error.message?.includes("row-level security")) {
        return NextResponse.json(
          { error: "Inicia sesión para crear tipos de turno" },
          { status: 401 },
        )
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe un tipo de turno con ese nombre" },
          { status: 409 },
        )
      }
      const message = error.message || "No se pudo crear el tipo de turno"
      return NextResponse.json(
        { error: message },
        { status: 500 },
      )
    }

    const row = data as { id: string; name: string; color: string | null; icon: string | null; default_start_time?: string | null; default_end_time?: string | null }
    return NextResponse.json({
      shiftType: {
        id: row.id,
        name: row.name,
        color: row.color || "#3b82f6",
        icon: row.icon || undefined,
        defaultStartTime: row.default_start_time ?? undefined,
        defaultEndTime: row.default_end_time ?? undefined,
      },
    })
  } catch (error) {
    console.error("Error in POST custom shift types:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
