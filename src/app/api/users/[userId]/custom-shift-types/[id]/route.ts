import { NextResponse } from "next/server"
import { createSupabaseClientForUser } from "@/lib/supabase"

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
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      return trimmed
    }
  }
  return "#3b82f6"
}

// PATCH: Actualizar un tipo de turno personalizado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string; id: string }> },
) {
  const { userId: rawUserId, id: rawId } = await params
  const userId = sanitizeId(rawUserId)
  const id = sanitizeId(rawId)

  if (!userId || !id) {
    return NextResponse.json(
      { error: "Identificadores no válidos" },
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

  function sanitizeTime(value: unknown): string | null {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) return trimmed
    return null
  }

  const updates: {
    name?: string
    color?: string
    icon?: string | null
    default_start_time?: string | null
    default_end_time?: string | null
  } = {}

  if (payload?.name !== undefined) {
    const name = sanitizeString(payload.name)
    if (!name) {
      return NextResponse.json(
        { error: "El nombre no puede estar vacío" },
        { status: 400 },
      )
    }
    updates.name = name
  }

  if (payload?.color !== undefined) {
    updates.color = sanitizeColor(payload.color)
  }

  if (payload?.icon !== undefined) {
    updates.icon = payload.icon ? sanitizeString(payload.icon) : null
  }

  if (payload?.defaultStartTime !== undefined) {
    updates.default_start_time = payload.defaultStartTime != null ? sanitizeTime(payload.defaultStartTime) : null
  }

  if (payload?.defaultEndTime !== undefined) {
    updates.default_end_time = payload.defaultEndTime != null ? sanitizeTime(payload.defaultEndTime) : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No se proporcionaron campos para actualizar" },
      { status: 400 },
    )
  }

  const supabase = getSupabaseFromRequest(request)
  if (!supabase) {
    return NextResponse.json(
      { error: "Inicia sesión para actualizar tipos de turno" },
      { status: 401 },
    )
  }

  try {
    const { data, error } = await supabase
      .from("user_custom_shift_types")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating custom shift type:", error)
      if (error.message?.includes("row-level security")) {
        return NextResponse.json(
          { error: "Inicia sesión para actualizar tipos de turno" },
          { status: 401 },
        )
      }
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Tipo de turno no encontrado" },
          { status: 404 },
        )
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe un tipo de turno con ese nombre" },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: "No se pudo actualizar el tipo de turno" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      shiftType: {
        id: data.id,
        name: data.name,
        color: data.color || "#3b82f6",
        icon: data.icon || undefined,
        defaultStartTime: (data as { default_start_time?: string | null }).default_start_time ?? undefined,
        defaultEndTime: (data as { default_end_time?: string | null }).default_end_time ?? undefined,
      },
    })
  } catch (error) {
    console.error("Error in PATCH custom shift types:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}

// DELETE: Eliminar un tipo de turno personalizado
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string; id: string }> },
) {
  const { userId: rawUserId, id: rawId } = await params
  const userId = sanitizeId(rawUserId)
  const id = sanitizeId(rawId)

  if (!userId || !id) {
    return NextResponse.json(
      { error: "Identificadores no válidos" },
      { status: 400 },
    )
  }

  const supabase = getSupabaseFromRequest(request)
  if (!supabase) {
    return NextResponse.json(
      { error: "Inicia sesión para eliminar tipos de turno" },
      { status: 401 },
    )
  }

  try {
    const { error } = await supabase
      .from("user_custom_shift_types")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting custom shift type:", error)
      if (error.message?.includes("row-level security")) {
        return NextResponse.json(
          { error: "Inicia sesión para eliminar tipos de turno" },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { error: "No se pudo eliminar el tipo de turno" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE custom shift types:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
