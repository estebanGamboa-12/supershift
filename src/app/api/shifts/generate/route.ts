import { NextResponse } from "next/server"
import { format } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase"
import { generateRotation } from "@/lib/generateRotation"
import { getOrCreateCalendarForUser } from "@/lib/calendars"

function toDateOnly(value: Date | string | null) {
  if (!value) return ""
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd")
  }
  return String(value).slice(0, 10)
}

const DEFAULT_CALENDAR_ID = Number.parseInt(
  process.env.DEFAULT_CALENDAR_ID ?? process.env.CALENDAR_ID ?? "1",
  10,
)

function getHorizon() {
  return Number(process.env.ROTATION_HORIZON_DAYS ?? 365)
}

function getDefaultCalendarId() {
  return Number.isNaN(DEFAULT_CALENDAR_ID) ? 1 : DEFAULT_CALENDAR_ID
}

function normalizeUserId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === "bigint") {
    const candidate = value.toString()
    return candidate.length > 0 ? candidate : null
  }

  return null
}

export async function POST(request: Request) {
  let body: { startDate?: string; cycle?: number[]; userId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "JSON no válido" }, { status: 400 })
  }

  const { startDate, cycle, userId } = body
  if (!startDate || !Array.isArray(cycle) || cycle.length !== 2) {
    return NextResponse.json(
      { message: "startDate y ciclo (ej. [4,2]) son obligatorios" },
      { status: 400 }
    )
  }

  const horizon = getHorizon()
  const rotation = generateRotation(startDate, cycle, horizon)

  let normalizedUserId: string | null = null
  if (userId !== undefined) {
    normalizedUserId = normalizeUserId(userId)
    if (!normalizedUserId) {
      return NextResponse.json(
        { message: "El identificador del usuario no es válido" },
        { status: 400 },
      )
    }
  }

  const calendarId = normalizedUserId
    ? await getOrCreateCalendarForUser(normalizedUserId)
    : getDefaultCalendarId()

  if (!calendarId) {
    return NextResponse.json(
      {
        message: normalizedUserId
          ? "No se encontró un calendario para el usuario"
          : "No se encontró un calendario predeterminado",
      },
      { status: 404 },
    )
  }

  const supabase = getSupabaseClient()

  try {
    const { error: deleteError } = await supabase
      .from("shifts")
      .delete()
      .eq("calendar_id", calendarId)

    if (deleteError) {
      throw deleteError
    }

    if (rotation.length > 0) {
      const payload = rotation.map((shift) => ({
        calendar_id: calendarId,
        shift_type_code: shift.type,
        start_at: `${shift.date} 00:00:00`,
        end_at: `${shift.date} 23:59:59`,
        all_day: 1,
        note: null,
      }))

      const { error: insertError } = await supabase.from("shifts").insert(payload)
      if (insertError) {
        throw insertError
      }
    }

    const { data, error: selectError } = await supabase
      .from("shifts")
      .select("id, calendar_id, shift_type_code, start_at, note")
      .eq("calendar_id", calendarId)
      .order("start_at", { ascending: true })

    if (selectError) {
      throw selectError
    }

    const shifts = (data ?? []).map((row) => ({
      id: Number(row.id),
      calendarId: Number(row.calendar_id),
      type: String(row.shift_type_code ?? ""),
      date: toDateOnly(row.start_at as string | null),
      note: (row.note as string | null) ?? "",
    }))

    return NextResponse.json({ shifts })
  } catch (error) {
    console.error("Failed to regenerate shifts in Supabase", error)
    return NextResponse.json(
      { message: "No se pudieron generar los turnos" },
      { status: 500 }
    )
  }
}
