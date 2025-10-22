import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

type RouteContext = {
  params: { userId: string }
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const DEFAULT_TIMEZONE = "Europe/Madrid"

export async function GET(_request: Request, context: RouteContext) {
  const userId = sanitizeId(context.params.userId)

  if (!userId) {
    return NextResponse.json(
      { error: "Identificador de usuario no válido" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("user_profile_history")
      .select(
        "id, changed_at, previous_name, previous_timezone, previous_avatar_url, new_name, new_timezone, new_avatar_url",
      )
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(25)

    if (error) {
      throw error
    }

    const history = (data ?? []).map((entry) => ({
      id: String(entry.id ?? ""),
      changedAt: entry.changed_at ?? new Date().toISOString(),
      previousName:
        typeof entry.previous_name === "string"
          ? entry.previous_name
          : null,
      previousAvatarUrl:
        typeof entry.previous_avatar_url === "string" &&
        entry.previous_avatar_url.trim().length > 0
          ? entry.previous_avatar_url
          : null,
      previousTimezone:
        typeof entry.previous_timezone === "string" &&
        entry.previous_timezone.trim().length > 0
          ? entry.previous_timezone
          : DEFAULT_TIMEZONE,
      newName: typeof entry.new_name === "string" ? entry.new_name : null,
      newAvatarUrl:
        typeof entry.new_avatar_url === "string" &&
        entry.new_avatar_url.trim().length > 0
          ? entry.new_avatar_url
          : null,
      newTimezone:
        typeof entry.new_timezone === "string" &&
        entry.new_timezone.trim().length > 0
          ? entry.new_timezone
          : DEFAULT_TIMEZONE,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching user profile history", error)
    return NextResponse.json(
      { error: "No se pudo cargar el historial del perfil" },
      { status: 500 },
    )
  }
}
