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

function normalizeUserId(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
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
  daysWorked: number
  typeBreakdown: Record<string, number>
  pluses: { night: number; holiday: number; availability: number; other: number }
  totalExtrasEuros: number
  estimatedEarnedEuros: number
  totalEarnedEuros: number
}

function summarizeShifts(
  shifts: ApiShift[],
  hourlyRateEuros: number,
): ShiftSummary {
  const summary: ShiftSummary = {
    totalShifts: shifts.length,
    totalHours: 0,
    daysWorked: 0,
    typeBreakdown: {},
    pluses: { night: 0, holiday: 0, availability: 0, other: 0 },
    totalExtrasEuros: 0,
    estimatedEarnedEuros: 0,
    totalEarnedEuros: 0,
  }

  const datesSet = new Set<string>()
  let totalExtras = 0

  for (const shift of shifts) {
    const hours = Math.max(0, shift.durationMinutes ?? 0) / 60
    summary.totalHours += hours
    datesSet.add(shift.date)
    summary.typeBreakdown[shift.type] = (summary.typeBreakdown[shift.type] ?? 0) + 1
    summary.pluses.night += shift.plusNight ?? 0
    summary.pluses.holiday += shift.plusHoliday ?? 0
    summary.pluses.availability += shift.plusAvailability ?? 0
    summary.pluses.other += shift.plusOther ?? 0
    totalExtras += (shift.plusNight ?? 0) + (shift.plusHoliday ?? 0) + (shift.plusAvailability ?? 0) + (shift.plusOther ?? 0)
  }

  summary.totalHours = Math.round(summary.totalHours * 100) / 100
  summary.daysWorked = datesSet.size
  summary.totalExtrasEuros = Math.round(totalExtras * 100) / 100
  summary.estimatedEarnedEuros = Math.round(summary.totalHours * hourlyRateEuros * 100) / 100
  summary.totalEarnedEuros = Math.round((summary.estimatedEarnedEuros + totalExtras) * 100) / 100
  return summary
}

function buildReportHtml({
  shifts,
  summary,
  monthLabel,
  userName,
  userEmail,
}: {
  shifts: ApiShift[]
  summary: ShiftSummary
  monthLabel: string
  userName: string | null
  userEmail?: string | null
}): string {
  const header = `<h1 style="font-size:24px;margin-bottom:16px;color:#0f172a;">Informe mensual · ${monthLabel}</h1>`
  const ownerLine = userName
    ? `<p style="margin-bottom:4px;color:#1e293b;">Propietario: <strong>${userName}</strong></p>`
    : ""
  const emailLine = userEmail
    ? `<p style="margin-bottom:8px;color:#1e293b;">Correo: <strong>${userEmail}</strong></p>`
    : ""
  const owner = ownerLine || emailLine ? (ownerLine + emailLine) : ""

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tbody>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Días trabajados</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.daysWorked}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Total de turnos</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.totalShifts}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Horas totales</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.totalHours.toFixed(2)} h</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Importe estimado (horas × tarifa)</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.estimatedEarnedEuros.toFixed(2)} €</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Extras (nocturnidad, festivo, disponibilidad, otros)</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">${summary.totalExtrasEuros.toFixed(2)} €</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Total estimado</td>
          <td style="border:1px solid #e2e8f0;padding:8px;font-size:16px;">${summary.totalEarnedEuros.toFixed(2)} €</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:600;">Desglose pluses</td>
          <td style="border:1px solid #e2e8f0;padding:8px;">
            Nocturnidad: ${summary.pluses.night} € · Festivo: ${summary.pluses.holiday} € · Disponibilidad: ${summary.pluses.availability} € · Otros: ${summary.pluses.other} €
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
      const night = (shift.plusNight ?? 0) > 0 ? `${shift.plusNight} €` : "-"
      const holiday = (shift.plusHoliday ?? 0) > 0 ? `${shift.plusHoliday} €` : "-"
      const availability = (shift.plusAvailability ?? 0) > 0 ? `${shift.plusAvailability} €` : "-"
      const extras = (shift.plusOther ?? 0) > 0 ? `${shift.plusOther} €` : "-"
      return `
        <tr>
          <td style="border:1px solid #e2e8f0;padding:6px;">${formattedDate}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${shift.type}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${label}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${startTime}${endTime ? ` - ${endTime}` : ""}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${note}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${night}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${holiday}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${availability}</td>
          <td style="border:1px solid #e2e8f0;padding:6px;">${extras}</td>
        </tr>
      `
    })
    .join("")

  const shiftsTable = `
    <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:11px;">
      <thead>
        <tr style="background:#0f172a;color:#fff;">
          <th style="padding:6px;text-align:left;">Fecha</th>
          <th style="padding:6px;text-align:left;">Tipo</th>
          <th style="padding:6px;text-align:left;">Label</th>
          <th style="padding:6px;text-align:left;">Horario</th>
          <th style="padding:6px;text-align:left;">Nota</th>
          <th style="padding:6px;text-align:left;">Noche</th>
          <th style="padding:6px;text-align:left;">Festivo</th>
          <th style="padding:6px;text-align:left;">Disponibilidad</th>
          <th style="padding:6px;text-align:left;">Extras</th>
        </tr>
      </thead>
      <tbody>
        ${shiftRows || "<tr><td colspan=\"9\" style=\"padding:6px;border:1px solid #e2e8f0;text-align:center;\">Sin turnos disponibles para este mes</td></tr>"}
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
      <div style="max-width:100%;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 15px 50px rgba(15,23,42,0.12);padding:32px;">
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
    `Días trabajados: ${summary.daysWorked}`,
    `Total de turnos: ${summary.totalShifts}`,
    `Horas totales: ${summary.totalHours.toFixed(2)}`,
    `Importe estimado: ${summary.estimatedEarnedEuros.toFixed(2)} €`,
    `Extras: ${summary.totalExtrasEuros.toFixed(2)} €`,
    `Total estimado: ${summary.totalEarnedEuros.toFixed(2)} €`,
    "",
    "Distribución por tipo:",
  ]
  for (const [type, value] of Object.entries(summary.typeBreakdown)) {
    parts.push(`• ${type}: ${value}`)
  }
  parts.push("", "Pluses (€):")
  parts.push(
    `Nocturnidad: ${summary.pluses.night}, Festivo: ${summary.pluses.holiday}, Disponibilidad: ${summary.pluses.availability}, Otros: ${summary.pluses.other}`,
  )
  return parts.join("\n")
}

async function getHourlyRateForUser(supabase: ReturnType<typeof getSupabaseClient>, userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_hourly_rates")
    .select("hourly_rate")
    .eq("user_id", userId)
    .maybeSingle()
  const rate = data?.hourly_rate
  if (typeof rate === "number" && Number.isFinite(rate)) return Math.max(0, rate)
  if (typeof rate === "string") {
    const parsed = Number.parseFloat(rate)
    if (!Number.isNaN(parsed)) return Math.max(0, parsed)
  }
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const userId = normalizeUserId(payload.userId)
    const userName = normalizeString(payload.userName)
    const userEmail = normalizeString(payload.userEmail)
    const month = normalizeString(payload.month)
    const format = payload.format === "pdf" ? "pdf" : "html"

    const { from, to, label } = getMonthRange(month)

    const supabase = getSupabaseClient()
    let hourlyRate = 0
    if (userId) {
      hourlyRate = await getHourlyRateForUser(supabase, userId)
    }

    const query = supabase
      .from("shifts")
      .select(SHIFT_SELECT_COLUMNS)
      .order("start_at", { ascending: true })
      .gte("start_at", `${from}T00:00:00`)
      .lte("start_at", `${to}T23:59:59`)

    if (userId) {
      const calendarId = await getOrCreateCalendarForUser(userId)
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

    const summary = summarizeShifts(shifts, hourlyRate)
    const html = buildReportHtml({
      shifts,
      summary,
      monthLabel: label,
      userName: userName ?? null,
      userEmail: userEmail ?? null,
    })
    void buildReportText({ summary, monthLabel: label })

    const baseName = `informe-supershift-${from}-a-${to}`
    const fileName = format === "pdf" ? `${baseName}.pdf` : `${baseName}.html`

    const res: {
      html: string
      fileName: string
      summary: ShiftSummary
      format: string
      pdf?: string
    } = {
      html: Buffer.from(html, "utf8").toString("base64"),
      fileName,
      summary,
      format,
    }

    if (format === "pdf") {
      try {
        const { jsPDF } = await import("jspdf")
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        let y = 18
        doc.setFontSize(18)
        doc.text(`Informe mensual · ${label}`, 14, y)
        y += 10
        doc.setFontSize(11)
        if (userName) {
          doc.text(`Propietario: ${userName}`, 14, y)
          y += 6
        }
        if (userEmail) {
          doc.text(`Correo: ${userEmail}`, 14, y)
          y += 6
        }
        if (userName || userEmail) {
          y += 4
        }
        doc.setFontSize(10)
        doc.text(`Días trabajados: ${summary.daysWorked}`, 14, y)
        y += 6
        doc.text(`Total turnos: ${summary.totalShifts}  |  Horas: ${summary.totalHours.toFixed(2)}`, 14, y)
        y += 6
        doc.text(`Importe estimado: ${summary.estimatedEarnedEuros.toFixed(2)} €  |  Extras: ${summary.totalExtrasEuros.toFixed(2)} €  |  Total: ${summary.totalEarnedEuros.toFixed(2)} €`, 14, y)
        y += 12
        const tableHead = [["Fecha", "Tipo", "Label", "Horario", "Nota", "Noche", "Fest.", "Disp.", "Extras"]]
        const tableBody = shifts.map((s) => {
          const d = new Date(`${s.date}T00:00:00`)
          const dateStr = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
          return [
            dateStr,
            s.type,
            (s.label ?? s.type).slice(0, 12),
            (s.startTime ?? "-") + (s.endTime ? `-${s.endTime}` : ""),
            (s.note ?? "-").slice(0, 8),
            (s.plusNight ?? 0) > 0 ? `${s.plusNight}` : "-",
            (s.plusHoliday ?? 0) > 0 ? `${s.plusHoliday}` : "-",
            (s.plusAvailability ?? 0) > 0 ? `${s.plusAvailability}` : "-",
            (s.plusOther ?? 0) > 0 ? `${s.plusOther}` : "-",
          ]
        })
        doc.setFontSize(9)
        const colWidths = [22, 18, 22, 28, 20, 14, 14, 14, 14]
        const startX = 14
        tableHead[0].forEach((cell, i) => {
          doc.text(cell, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
        })
        y += 6
        tableBody.forEach((row) => {
          if (y > 270) {
            doc.addPage()
            y = 18
          }
          row.forEach((cell, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
            doc.text(String(cell).slice(0, 15), x, y)
          })
          y += 5
        })
        res.pdf = Buffer.from(doc.output("arraybuffer")).toString("base64")
      } catch (pdfErr) {
        console.warn("PDF generation skipped, returning HTML only", pdfErr)
      }
    }

    return NextResponse.json(res)
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
