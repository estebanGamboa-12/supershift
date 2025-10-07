import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import {
  VALID_SHIFT_TYPES,
  adaptDatabaseShiftRow,
  buildDateRange,
  SHIFT_SELECT_COLUMNS,
  mapShiftRow,
  normalizeDate,
  type ApiShift,
  type DatabaseShiftRow,
} from "./utils"
import { getOrCreateCalendarForUser } from "@/lib/calendars"

export const runtime = "nodejs"

const DEFAULT_CALENDAR_ID = Number.parseInt(
  process.env.DEFAULT_CALENDAR_ID ?? "2",
  10
)

function getCalendarId(): number {
  return Number.isNaN(DEFAULT_CALENDAR_ID) ? 2 : DEFAULT_CALENDAR_ID
}

function parseUserId(param: string | null): number | null {
  if (!param) {
    return null
  }
  const userId = Number.parseInt(param, 10)
  if (Number.isNaN(userId) || userId <= 0) {
    return null
  }
  return userId
}

export async function GET(request: NextRequest) {
  try {
    const userId = parseUserId(request.nextUrl.searchParams.get("userId"))
    const calendarId = userId
      ? await getOrCreateCalendarForUser(userId)
      : getCalendarId()

    if (!calendarId) {
      return NextResponse.json(
        {
          error: userId
            ? "No se encontró un usuario con el identificador indicado"
            : "No se encontró un calendario predeterminado",
        },
        { status: 404 }
      )
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("shifts")
      .select(SHIFT_SELECT_COLUMNS)
      .eq("calendar_id", calendarId)
      .order("start_at", { ascending: true })

    if (error) {
      throw error
    }

    const rows = ((data ?? []) as DatabaseShiftRow[]).map((row) =>
      adaptDatabaseShiftRow(row)
    )
    const shifts = rows.map((row) => mapShiftRow(row))

    return NextResponse.json({ shifts })
  } catch (error) {
    console.error("Error fetching shifts from Supabase", error)
    return NextResponse.json(
      {
        error:
          "No se pudieron cargar los turnos desde Supabase. Revisa la conexión y vuelve a intentarlo.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | {
          date?: unknown
          type?: unknown
          note?: unknown
          label?: unknown
          color?: unknown
          plusNight?: unknown
          plusHoliday?: unknown
          plusAvailability?: unknown
          plusOther?: unknown
          userId?: unknown
        }
      | null

    if (!payload || typeof payload.type !== "string") {
      return NextResponse.json(
        { error: "Los datos del turno no son válidos" },
        { status: 400 }
      )
    }

    const date = normalizeDate(payload.date)
    if (!date) {
      return NextResponse.json(
        { error: "La fecha del turno debe tener formato YYYY-MM-DD" },
        { status: 400 }
      )
    }

    const type = payload.type.toUpperCase()
    if (!VALID_SHIFT_TYPES.has(type as ApiShift["type"])) {
      return NextResponse.json(
        { error: "El tipo de turno proporcionado no es válido" },
        { status: 400 }
      )
    }

    const note =
      typeof payload.note === "string" && payload.note.trim().length > 0
        ? payload.note.trim()
        : null

    const label =
      typeof payload.label === "string" && payload.label.trim().length > 0
        ? payload.label.trim().slice(0, 100)
        : null

    let color: string | null = null
    if (typeof payload.color === "string") {
      const trimmedColor = payload.color.trim()
      if (trimmedColor.length > 0) {
        const normalizedColor = trimmedColor.toLowerCase()
        const isHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
          normalizedColor
        )

        if (!isHexColor) {
          return NextResponse.json(
            { error: "El color del turno debe ser un código hexadecimal válido" },
            { status: 400 },
          )
        }

        color = normalizedColor
      }
    }

    const parsePlus = (
      value: unknown,
      field: string,
    ): number | { error: string } => {
      if (value === undefined || value === null) {
        return 0
      }

      const parsed =
        typeof value === "number" && Number.isFinite(value)
          ? value
          : typeof value === "string" && value.trim().length > 0
            ? Number.parseInt(value.trim(), 10)
            : Number.NaN

      if (Number.isNaN(parsed)) {
        return { error: `El campo ${field} debe ser un número entre 0 y 3` }
      }

      return Math.min(3, Math.max(0, Math.round(parsed)))
    }

    const plusNightResult = parsePlus(payload.plusNight, "plusNight")
    if (typeof plusNightResult === "object" && "error" in plusNightResult) {
      return NextResponse.json({ error: plusNightResult.error }, { status: 400 })
    }

    const plusHolidayResult = parsePlus(payload.plusHoliday, "plusHoliday")
    if (typeof plusHolidayResult === "object" && "error" in plusHolidayResult) {
      return NextResponse.json({ error: plusHolidayResult.error }, { status: 400 })
    }

    const plusAvailabilityResult = parsePlus(
      payload.plusAvailability,
      "plusAvailability",
    )
    if (
      typeof plusAvailabilityResult === "object" &&
      "error" in plusAvailabilityResult
    ) {
      return NextResponse.json(
        { error: plusAvailabilityResult.error },
        { status: 400 },
      )
    }

    const plusOtherResult = parsePlus(payload.plusOther, "plusOther")
    if (typeof plusOtherResult === "object" && "error" in plusOtherResult) {
      return NextResponse.json({ error: plusOtherResult.error }, { status: 400 })
    }

    const plusNight =
      typeof plusNightResult === "number" ? plusNightResult : 0
    const plusHoliday =
      typeof plusHolidayResult === "number" ? plusHolidayResult : 0
    const plusAvailability =
      typeof plusAvailabilityResult === "number"
        ? plusAvailabilityResult
        : 0
    const plusOther =
      typeof plusOtherResult === "number" ? plusOtherResult : 0

    let userId: number | null = null
    if ("userId" in payload && payload.userId !== undefined) {
      const parsedUserId = Number(payload.userId)
      if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
        return NextResponse.json(
          { error: "El identificador del usuario no es válido" },
          { status: 400 }
        )
      }
      userId = parsedUserId
    }

    const calendarId = userId
      ? await getOrCreateCalendarForUser(userId)
      : getCalendarId()

    if (!calendarId) {
      return NextResponse.json(
        {
          error: userId
            ? "No se encontró un usuario con el identificador indicado"
            : "No se encontró un calendario predeterminado",
        },
        { status: 404 }
      )
    }

    const { startAt, endAt } = buildDateRange(date)

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        calendar_id: calendarId,
        shift_type_code: type,
        start_at: startAt,
        end_at: endAt,
        all_day: 1,
        note,
        label,
        color,
        plus_night: plusNight,
        plus_holiday: plusHoliday,
        plus_availability: plusAvailability,
        plus_other: plusOther,
      })
      .select(SHIFT_SELECT_COLUMNS)
      .maybeSingle()

    if (error) {
      console.error("Error creating shift in Supabase", error)
      return NextResponse.json(
        {
          error:
            "No se pudo crear el turno en Supabase. Revisa la conexión y los datos enviados.",
        },
        { status: 500 }
      )
    }

    if (!data) {
      throw new Error("Supabase no devolvió datos del turno insertado")
    }

    const row = adaptDatabaseShiftRow(data as DatabaseShiftRow)
    const shift = mapShiftRow(row)

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error("Error creating shift in Supabase", error)
    return NextResponse.json(
      {
        error:
          "No se pudo crear el turno en Supabase. Revisa la conexión y los datos enviados.",
      },
      { status: 500 }
    )
  }
}
