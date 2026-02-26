import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"

export const runtime = "nodejs"

function sanitizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toApiPreferences(row: {
  start_of_week?: string | null
  show_festive_days?: boolean | null
  festive_day_color?: string | null
  show_day_colors?: boolean | null
}): Partial<UserPreferences> {
  const startOfWeek =
    row.start_of_week === "monday" || row.start_of_week === "sunday"
      ? row.start_of_week
      : DEFAULT_USER_PREFERENCES.startOfWeek
  return {
    startOfWeek,
    showFestiveDays: typeof row.show_festive_days === "boolean" ? row.show_festive_days : DEFAULT_USER_PREFERENCES.showFestiveDays ?? true,
    festiveDayColor: typeof row.festive_day_color === "string" && row.festive_day_color.length > 0
      ? row.festive_day_color
      : DEFAULT_USER_PREFERENCES.festiveDayColor ?? "#dc2626",
    showDayColors: typeof row.show_day_colors === "boolean" ? row.show_day_colors : true,
  }
}

export async function GET(
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
    const { data, error } = await supabase
      .from("user_preferences")
      .select("start_of_week, show_festive_days, festive_day_color, show_day_colors, updated_at")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching user preferences", error)
      return NextResponse.json(
        { error: "No se pudieron cargar las preferencias" },
        { status: 500 },
      )
    }

    const merged: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...(data ? toApiPreferences(data) : {}),
    }
    const updatedAt = data?.updated_at ?? null

    return NextResponse.json({
      preferences: merged,
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
    })
  } catch (err) {
    console.error("GET user preferences", err)
    return NextResponse.json(
      { error: "Error al cargar preferencias" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: rawUserId } = await context.params
    const userId = sanitizeUserId(rawUserId)
    if (!userId) {
      return NextResponse.json({ error: "Identificador de usuario no válido" }, { status: 400 })
    }

    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "El cuerpo debe ser JSON" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("start_of_week, show_festive_days, festive_day_color, show_day_colors")
      .eq("user_id", userId)
      .maybeSingle()

    const startOfWeek =
      body.startOfWeek === "monday" || body.startOfWeek === "sunday"
        ? body.startOfWeek
        : (existing?.start_of_week as string) ?? "monday"
    const showFestiveDays =
      typeof body.showFestiveDays === "boolean"
        ? body.showFestiveDays
        : (existing?.show_festive_days ?? true)
    const festiveDayColor =
      typeof body.festiveDayColor === "string" && body.festiveDayColor.trim().length > 0
        ? body.festiveDayColor.trim()
        : (existing?.festive_day_color ?? "#dc2626")
    const showDayColors =
      typeof body.showDayColors === "boolean"
        ? body.showDayColors
        : (existing?.show_day_colors ?? true)

    const row = {
      user_id: userId,
      start_of_week: startOfWeek,
      show_festive_days: showFestiveDays,
      festive_day_color: festiveDayColor,
      show_day_colors: showDayColors,
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(row, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      })
      .select("start_of_week, show_festive_days, festive_day_color, show_day_colors, updated_at")
      .single()

    if (error) {
      console.error("Error upserting user preferences", error)
      return NextResponse.json(
        { error: "No se pudieron guardar las preferencias" },
        { status: 500 },
      )
    }

    const merged: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...toApiPreferences(data ?? {}),
    }
    return NextResponse.json({
      preferences: merged,
      updatedAt: data?.updated_at ? new Date(data.updated_at).toISOString() : null,
    })
  } catch (err) {
    console.error("PATCH user preferences", err)
    return NextResponse.json(
      { error: "Error al guardar preferencias" },
      { status: 500 },
    )
  }
}
