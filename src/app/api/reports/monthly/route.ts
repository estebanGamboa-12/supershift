import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import {
  adaptDatabaseShiftRow,
  mapShiftRow,
  SHIFT_SELECT_COLUMNS,
  type ApiShift,
  type DatabaseShiftRow,
} from "@/app/api/shifts/utils"
import { sendEmail } from "@/lib/email"
import { getOrCreateCalendarForUser } from "@/lib/calendars"

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

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getMonthRange(month: string | null): { from: string; to: string; label: string } {
  let year: number
  let monthIndex: number
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    year = Number.parseInt(month.slice(0, 4), 10)
    monthIndex = Number.parseInt(month.slice(5), 10) - 1
  } else {
    const now = new Date()
    year = now.getUTCFullYear()
    monthIndex = now.getUTCMonth()
  }

  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59))

  const formatDate = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`

  const monthLabel = start.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })

  return { from: formatDate(start), to: formatDate(end), label: monthLabel }
}

type ShiftSummary = {
  totalShifts: number
  totalHours: number
  typeBreakdown: Record<string, number>
  pluses: {
    night: number
    holiday: number
    availability: number
    other: number
  }
}

function summarizeShifts(shifts: ApiShift[]): ShiftSummary {
  const summary: ShiftSummary = {
    totalShifts: shifts.length,
    totalHours: 0,
    typeBreakdown: {},
    pluses: {
      night: 0,
      holiday: 0,
      availability: 0,
      other: 0,
    },
  }

  for (const shift of shifts) {
    summary.totalHours += Math.max(0, shift.durationMinutes ?? 0) / 60
    summary.typeBreakdown[shift.type] = (summary.typeBreakdown[shift.type] ?? 0) + 1
    summary.pluses.night += shift.plusNight ?? 0
    summary.pluses.holiday += shift.plusHoliday ?? 0
    summary.pluses.availability += shift.plusAvailability ?? 0
    summary.pluses.other += shift.plusOther ?? 0
  }

  summary.totalHours = Math.round(summary.totalHours * 100) / 100
  return summary
}

function buildReportHtml({
  shifts,
  summary,
  monthLabel,
  userName,
}: {
  shifts: ApiShift[]
  summary: ShiftSummary
  monthLabel: string
  userName: string | null
}): string {
  const header = `<h1 style="font-size:24px;margin-bottom:16px;color:#0f172a;">Informe mensual · ${monthLabel}</h1>`
  const owner = userName
    ? `<p style="margin-bottom:8px;color:#1e293b;">Propietario: <strong>${userName}</strong></p>`
    : ""

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tbody>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Total de turnos</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.totalShifts}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Horas totales</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.totalHours.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Pluses</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">
            Nocturnidad: ${summary.pluses.night} · Festivo: ${summary.pluses.holiday} · Disponibilidad: ${summary.pluses.availability} · Extra: ${summary.pluses.other}
          </td>
        </tr>
      </tbody>
    </table>
  `

  const typeRows = Object.entries(summary.typeBreakdown)
    .map(
      ([type, value]) => `
      <tr>
        <td style="border:1px solid #e2e8f0;padding:6px;">${type}</td>
        <td style="border:1px solid #e2e8f0;padding:6px;text-align:right;">${value}</td>
      </tr>
    `,
    )
    .join("")

  const typeTable = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#0f172a;color:#fff;">
          <th style="padding:6px;text-align:left;">Tipo de turno</th>
          <th style="padding:6px;text-align:right;">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${typeRows || "<tr><td colspan=\"2\" style=\"padding:6px;border:1px solid #e2e8f0;text-align:center;\">Sin turnos registrados</td></tr>"}
      </tbody>
    </table>
  `

  const shiftRows = shifts
    .map((shift) => {
      const date = new Date(`${shift.date}T00:00:00`)
      const formattedDate = date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      const startTime = shift.startTime ?? "Todo el día"
      const endTime = shift.endTime ?? ""
      const note = shift.note ? shift.note : "-"
      const label = shift.label ?? `Turno ${shift.type}`
      return `
        <tr>
          <td style="border:1px solid #e2e8f0;padding:6px;">${formattedDate}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${label}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${startTime}${endTime ? ` - ${endTime}` : ""}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${note}</td>
        </tr>
      `
    })
    .join("")

  const shiftsTable = `
    <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:12px;">
      <thead>
        <tr style="background:#0f172a;color:#fff;">
          <th style="padding:6px;text-align:left;">Fecha</th>
          <th style="padding:6px;text-align:left;">Detalle</th>
          <th style="padding:6px;text-align:left;">Horario</th>
          <th style="padding:6px;text-align:left;">Notas</th>
        </tr>
      </thead>
      <tbody>
        ${shiftRows || "<tr><td colspan=\"4\" style=\"padding:6px;border:1px solid #e2e8f0;text-align:center;\">Sin turnos disponibles para este mes</td></tr>"}
      </tbody>
    </table>
  `

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Informe mensual · ${monthLabel}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a;">
      <div style="max-width:900px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 15px 50px rgba(15,23,42,0.12);padding:32px;">
        ${header}
        ${owner}
        ${summaryTable}
        <h2 style="margin-top:24px;margin-bottom:12px;font-size:18px;color:#1d4ed8;">Distribución de turnos</h2>
        ${typeTable}
        <h2 style="margin-top:24px;margin-bottom:12px;font-size:18px;color:#1d4ed8;">Detalle mensual</h2>
        ${shiftsTable}
      </div>
    </body>
  </html>`
}

function buildReportText({ summary, monthLabel }: { summary: ShiftSummary; monthLabel: string }): string {
  const parts = [
    `Informe mensual · ${monthLabel}`,
    "",
    `Total de turnos: ${summary.totalShifts}`,
    `Horas totales: ${summary.totalHours.toFixed(2)}`,
    "",
    "Distribución por tipo:",
  ]

  for (const [type, value] of Object.entries(summary.typeBreakdown)) {
    parts.push(`• ${type}: ${value}`)
  }

  parts.push("", "Pluses:")
  parts.push(
    `Nocturnidad: ${summary.pluses.night}, Festivo: ${summary.pluses.holiday}, Disponibilidad: ${summary.pluses.availability}, Extra: ${summary.pluses.other}`,
  )

  return parts.join("\n")
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userId = normalizeUserId(payload.userId)
    const userEmail = normalizeString(payload.email)
    const userName = normalizeString(payload.userName)
    const month = normalizeString(payload.month)
    const shouldSendEmail = payload.sendEmail !== false

    const { from, to, label } = getMonthRange(month)

    const supabase = getSupabaseClient()
    const query = supabase
      .from("shifts")
      .select(SHIFT_SELECT_COLUMNS)
      .order("start_at", { ascending: true })
      .gte("start_at", `${from}T00:00:00`)
      .lte("start_at", `${to}T23:59:59`)

    if (userId) {
      const calendarId = await getOrCreateCalendarForUser(String(userId))
      if (!calendarId) {
        return NextResponse.json(
          {
            error:
              "No se encontró un calendario asociado al usuario indicado. Crea uno antes de exportar el informe.",
          },
          { status: 404 },
        )
      }
      query.eq("calendar_id", calendarId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const rows = ((data ?? []) as DatabaseShiftRow[]).map((row) =>
      adaptDatabaseShiftRow(row),
    )
    const shifts = rows.map((row) => mapShiftRow(row))

    const summary = summarizeShifts(shifts)
    const html = buildReportHtml({
      shifts,
      summary,
      monthLabel: label,
      userName: userName ?? null,
    })
    const text = buildReportText({ summary, monthLabel: label })

    let emailSent = false
    let emailError: string | null = null

    if (shouldSendEmail && userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: `Informe mensual · ${label}`,
          html,
          text,
        })
        emailSent = true
      } catch (error) {
        emailError = error instanceof Error ? error.message : String(error)
      }
    }

    const fileName = `informe-supershift-${from}-a-${to}.html`

    return NextResponse.json({
      html: Buffer.from(html, "utf8").toString("base64"),
      text: Buffer.from(text, "utf8").toString("base64"),
      fileName,
      summary,
      emailSent,
      emailError,
    })
  } catch (error) {
    console.error("Error generating monthly report", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el informe mensual solicitado.",
      },
      { status: 500 },
    )
  }
}
