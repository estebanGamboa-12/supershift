import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { deductCredits, CREDIT_COSTS } from "@/lib/credits"

export const runtime = "nodejs"

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId obligatorio" }, { status: 400 })
  }

  let body: {
    title?: unknown
    icon?: unknown
    color?: unknown
    startTime?: unknown
    endTime?: unknown
    breakMinutes?: unknown
    alertMinutes?: unknown
    location?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const title = normalizeString(body.title)
  if (!title) {
    return NextResponse.json({ error: "title es obligatorio" }, { status: 400 })
  }

  const supabase = getSupabaseClient()
  const cost = CREDIT_COSTS.create_shift_template
  try {
    await deductCredits(supabase, userId, cost, "create_shift_template")
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === "CREDITS_INSUFFICIENT") {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos. Crear una plantilla cuesta ${cost}.`,
          code: "CREDITS_INSUFFICIENT",
        },
        { status: 402 }
      )
    }
    throw err
  }

  const insertPayload = {
    user_id: userId,
    title,
    icon: normalizeString(body.icon) ?? null,
    color: normalizeString(body.color) ?? null,
    start_time: normalizeString(body.startTime) ?? "09:00",
    end_time: normalizeString(body.endTime) ?? "17:00",
    break_minutes: typeof body.breakMinutes === "number" ? body.breakMinutes : null,
    alert_minutes: typeof body.alertMinutes === "number" ? body.alertMinutes : null,
    location: normalizeString(body.location) ?? null,
  }

  const { data, error } = await supabase
    .from("shift_template_presets")
    .insert(insertPayload)
    .select("id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at")
    .single()

  if (error) {
    console.error("[shift-templates] Insert error", error)
    return NextResponse.json(
      { error: "No se pudo crear la plantilla" },
      { status: 500 }
    )
  }

  const row = data as {
    id: number
    user_id: string
    title: string
    icon: string | null
    color: string | null
    start_time: string | null
    end_time: string | null
    break_minutes: number | null
    alert_minutes: number | null
    location: string | null
    created_at: string
    updated_at: string
  }

  return NextResponse.json({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    icon: row.icon,
    color: row.color,
    startTime: row.start_time ?? "09:00",
    endTime: row.end_time ?? "17:00",
    breakMinutes: row.break_minutes,
    alertMinutes: row.alert_minutes,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, { status: 201 })
}
