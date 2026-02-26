import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import {
  adaptDatabaseShiftRow,
  mapShiftRow,
  SHIFT_SELECT_COLUMNS,
  type ApiShift,
  type DatabaseShiftRow,
} from "@/app/api/shifts/utils"
import { getOrCreateCalendarForUser } from "@/lib/calendars"

export const runtime = "nodejs"

const DEFAULT_CALENDAR_NAME = "Supershift"

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

function pickTimezone(candidate: unknown, fallback: string): string {
  const normalized = normalizeString(candidate)
  return normalized ?? fallback
}

function getDateRange(monthParam: string | null): { from: string; to: string } {
  const format = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam.trim())) {
    const [y, m] = monthParam.trim().split("-").map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59))
    return { from: format(start), to: format(end) }
  }

  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  return { from: format(start), to: format(end) }
}

function buildDateTime(date: string, time: string | null): Date {
  if (!time) {
    return new Date(`${date}T00:00:00`)
  }
  return new Date(`${date}T${time}:00`)
}

function formatAsIcs(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  const hours = String(date.getUTCHours()).padStart(2, "0")
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  const seconds = String(date.getUTCSeconds()).padStart(2, "0")
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

function buildSummary(shift: ApiShift): string {
  if (shift.label && shift.label.trim().length > 0) {
    return shift.label.trim()
  }
  return `Turno ${shift.type}`
}

function buildDescription(shift: ApiShift): string {
  const parts: string[] = []
  parts.push(`Tipo: ${shift.type}`)
  if (shift.note) {
    parts.push(`Nota: ${shift.note}`)
  }
  const pluses: string[] = []
  const plusFields: Array<[string, number | undefined]> = [
    ["Nocturnidad", shift.plusNight],
    ["Festivo", shift.plusHoliday],
    ["Disponibilidad", shift.plusAvailability],
    ["Horas extra", shift.plusOther],
  ]
  for (const [label, value] of plusFields) {
    if (typeof value === "number" && value > 0) {
      pluses.push(`${label}: ${value}`)
    }
  }
  if (pluses.length > 0) {
    parts.push(`Pluses → ${pluses.join(", ")}`)
  }
  return parts.join("\\n")
}

function buildIcs({
  shifts,
  calendarName,
}: {
  shifts: ApiShift[]
  calendarName: string
}): string {
  const now = new Date()
  const dtStamp = formatAsIcs(now)
  const lines: string[] = []
  lines.push("BEGIN:VCALENDAR")
  lines.push("VERSION:2.0")
  lines.push("PRODID:-//Supershift//Schedule//ES")
  lines.push("CALSCALE:GREGORIAN")
  lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`)

  for (const shift of shifts) {
    const start = buildDateTime(shift.date, shift.startTime)
    const end = shift.endTime
      ? buildDateTime(shift.date, shift.endTime)
      : new Date(start.getTime() + shift.durationMinutes * 60000)
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${shift.id}@supershift.local`)
    lines.push(`DTSTAMP:${dtStamp}`)
    lines.push(`DTSTART:${formatAsIcs(start)}`)
    lines.push(`DTEND:${formatAsIcs(end)}`)
    lines.push(`SUMMARY:${escapeText(buildSummary(shift))}`)
    lines.push(`DESCRIPTION:${escapeText(buildDescription(shift))}`)
    if (shift.color) {
      lines.push(`COLOR:${shift.color}`)
    }
    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userId = normalizeString(payload.userId)
    const timezone = pickTimezone(payload.timezone, "Europe/Madrid")
    const calendarName = normalizeString(payload.calendarName) ?? DEFAULT_CALENDAR_NAME
    const month = typeof payload.month === "string" ? payload.month.trim() : null

    const calendarId = userId ? await getOrCreateCalendarForUser(userId) : null

    const supabase = getSupabaseClient()

    const { from, to } = getDateRange(month)

    const query = supabase
      .from("shifts")
      .select(SHIFT_SELECT_COLUMNS)
      .order("start_at", { ascending: true })

    if (calendarId) {
      query.eq("calendar_id", calendarId)
    }

    query.gte("start_at", `${from}T00:00:00`).lte("start_at", `${to}T23:59:59`)

    const { data, error } = await query

    if (error) {
      throw error
    }

    const rows = ((data ?? []) as DatabaseShiftRow[]).map((row) =>
      adaptDatabaseShiftRow(row),
    )
    const mapped = rows.map((row) => mapShiftRow(row))

    if (mapped.length === 0) {
      return NextResponse.json(
        {
          message:
            "No hay turnos en el mes seleccionado. Elige otro mes o añade turnos antes de sincronizar.",
          ics: null,
          eventCount: 0,
        },
        { status: 200 },
      )
    }

    const ics = buildIcs({ shifts: mapped, calendarName })
    const fileName = `supershift-calendar-${from}-a-${to}.ics`

    const payloadResponse = {
      message: `Se generaron ${mapped.length} eventos para sincronizar con Google Calendar. Importa el archivo en la aplicación de Google.`,
      ics: Buffer.from(ics, "utf8").toString("base64"),
      fileName,
      eventCount: mapped.length,
      timezone,
    }

    return NextResponse.json(payloadResponse)
  } catch (error) {
    console.error("Error generating Google Calendar sync payload", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el archivo de sincronización con Google Calendar.",
      },
      { status: 500 },
    )
  }
}
