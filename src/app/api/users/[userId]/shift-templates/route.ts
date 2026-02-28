import { NextResponse } from "next/server"
import { createSupabaseClientForUser, getSupabaseClient } from "@/lib/supabase"
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const authHeader = request.headers.get("authorization") ?? ""
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : ""

  let body: {
    title?: unknown
    icon?: unknown
    color?: unknown
    startTime?: unknown
    endTime?: unknown
    breakMinutes?: unknown
    alertMinutes?: unknown
    location?: unknown
    defaultPluses?: { night?: number; holiday?: number; availability?: number; other?: number }
    defaultExtras?: Record<string, number>
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

  const defaultExtras =
    body.defaultExtras && typeof body.defaultExtras === "object"
      ? Object.fromEntries(
          Object.entries(body.defaultExtras)
            .filter(([, v]) => typeof v === "number")
            .map(([k, v]) => [k, Math.max(0, Math.min(1, Math.round(v)))])
        )
      : {}

  // Priorizar JWT del usuario para que RLS vea auth.uid() y permita el INSERT
  const supabase = bearer
    ? createSupabaseClientForUser(bearer)
    : serviceRoleKey
      ? getSupabaseClient()
      : null

  if (!supabase) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesión para crear plantillas." },
      { status: 401 },
    )
  }

  if (bearer) {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "No se pudo validar tu sesión. Vuelve a iniciar sesión." },
        { status: 401 },
      )
    }
    if (authData.user.id !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
  }

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

  const baseInsert = {
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

  const insertWithDefaultExtras = { ...baseInsert, default_extras: defaultExtras }
  const selectWithDefaultExtras =
    "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, default_extras, created_at, updated_at"
  const selectBase =
    "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at"

  let result = await supabase
    .from("shift_template_presets")
    .insert(insertWithDefaultExtras)
    .select(selectWithDefaultExtras)
    .single()

  if (result.error) {
    const msg = String(result.error.message ?? "")
    const code = String((result.error as { code?: string }).code ?? "")
    const missingColumn = /column.*does not exist|does not exist|PGRST204/i.test(msg) || code === "PGRST204"
    if (missingColumn) {
      result = await supabase
        .from("shift_template_presets")
        .insert(baseInsert)
        .select(selectBase)
        .single()
    }
  }

  if (result.error) {
    console.error("[shift-templates] Insert error", result.error)
    return NextResponse.json(
      { error: "No se pudo crear la plantilla" },
      { status: 500 }
    )
  }

  const row = result.data as {
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
    default_extras?: Record<string, number> | null
    created_at: string
    updated_at: string
  }

  const outDefaultExtras =
    row.default_extras && typeof row.default_extras === "object" && Object.keys(row.default_extras).length > 0
      ? row.default_extras
      : undefined

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
    defaultExtras: outDefaultExtras,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, { status: 201 })
}
