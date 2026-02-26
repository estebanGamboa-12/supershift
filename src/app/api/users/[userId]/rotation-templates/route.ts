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
    description?: unknown
    daysCount?: unknown
    assignments?: Array<{ dayIndex?: unknown; shiftTemplateId?: unknown }>
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

  const daysCount = typeof body.daysCount === "number" && body.daysCount > 0
    ? Math.trunc(body.daysCount)
    : 7
  const assignments = Array.isArray(body.assignments) ? body.assignments : []

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

  const cost = CREDIT_COSTS.create_rotation_template
  try {
    await deductCredits(supabase, userId, cost, "create_rotation_template")
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === "CREDITS_INSUFFICIENT") {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos. Crear una plantilla de rotación cuesta ${cost}.`,
          code: "CREDITS_INSUFFICIENT",
        },
        { status: 402 }
      )
    }
    throw err
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("rotation_template_presets")
    .insert({
      user_id: userId,
      title,
      icon: normalizeString(body.icon) ?? null,
      description: normalizeString(body.description) ?? null,
      days_count: daysCount,
    })
    .select("id")
    .single<{ id: number }>()

  if (insertError || !insertedRow) {
    console.error("[rotation-templates] Insert preset error", insertError)
    return NextResponse.json(
      { error: "No se pudo crear la plantilla de rotación" },
      { status: 500 }
    )
  }

  const templateId = insertedRow.id

  if (assignments.length > 0) {
    const assignmentsPayload = assignments.map((a, i) => ({
      template_id: templateId,
      day_index: typeof a.dayIndex === "number" ? a.dayIndex : i,
      shift_template_id: typeof a.shiftTemplateId === "number" ? a.shiftTemplateId : null,
    }))
    const { error: assignError } = await supabase
      .from("rotation_template_preset_assignments")
      .upsert(assignmentsPayload, { onConflict: "template_id,day_index" })
    if (assignError) {
      console.error("[rotation-templates] Assignments error", assignError)
      await supabase.from("rotation_template_presets").delete().eq("id", templateId)
      return NextResponse.json(
        { error: "No se pudieron guardar los días de la plantilla" },
        { status: 500 }
      )
    }
  }

  const { data: fullRow, error: selectError } = await supabase
    .from("rotation_template_presets")
    .select("id, user_id, title, icon, description, days_count, created_at, updated_at")
    .eq("id", templateId)
    .single()

  if (selectError || !fullRow) {
    return NextResponse.json(
      { id: templateId, userId, title, daysCount, assignments: assignments.map((a, i) => ({ dayIndex: typeof a.dayIndex === "number" ? a.dayIndex : i, shiftTemplateId: typeof a.shiftTemplateId === "number" ? a.shiftTemplateId : null })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { status: 201 }
    )
  }

  const { data: assignRows } = await supabase
    .from("rotation_template_preset_assignments")
    .select("day_index, shift_template_id")
    .eq("template_id", templateId)
    .order("day_index")

  const template = {
    id: (fullRow as { id: number }).id,
    userId: (fullRow as { user_id: string }).user_id,
    title: (fullRow as { title: string }).title,
    icon: (fullRow as { icon: string | null }).icon ?? null,
    description: (fullRow as { description: string | null }).description ?? null,
    daysCount: (fullRow as { days_count: number }).days_count ?? 7,
    assignments: (assignRows ?? []).map((r: { day_index: number; shift_template_id: number | null }) => ({
      dayIndex: r.day_index,
      shiftTemplateId: r.shift_template_id,
    })),
    createdAt: (fullRow as { created_at: string }).created_at,
    updatedAt: (fullRow as { updated_at: string }).updated_at,
  }

  return NextResponse.json(template, { status: 201 })
}
