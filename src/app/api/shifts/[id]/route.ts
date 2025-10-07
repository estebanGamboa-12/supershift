import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import {
  VALID_SHIFT_TYPES,
  adaptDatabaseShiftRow,
  buildDateRange,
  mapShiftRow,
  normalizeDate,
  SHIFT_SELECT_COLUMNS,
  type ApiShift,
  type DatabaseShiftRow,
} from "../utils"
import { findCalendarIdForUser } from "@/lib/calendars"

export const runtime = "nodejs"

type Params = {
  params: { id: string }
}

const DEFAULT_CALENDAR_ID = Number.parseInt(
  process.env.DEFAULT_CALENDAR_ID ?? "2",
  10
)

function getFallbackCalendarId(): number {
  return Number.isNaN(DEFAULT_CALENDAR_ID) ? 2 : DEFAULT_CALENDAR_ID
}

function parseId(idParam: string): number | null {
  const id = Number.parseInt(idParam, 10)
  if (Number.isNaN(id) || id <= 0) {
    return null
  }
  return id
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

export async function PATCH(request: NextRequest, { params }: Params) {
  const id = parseId(params.id)
  if (!id) {
    return NextResponse.json(
      { error: "El identificador del turno no es válido" },
      { status: 400 }
    )
  }

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
        }
      | null

    if (!payload) {
      return NextResponse.json(
        { error: "No se recibieron datos para actualizar" },
        { status: 400 }
      )
    }

    const userId = parseUserId(request.nextUrl.searchParams.get("userId"))
    const calendarId = userId
      ? (await findCalendarIdForUser(userId)) ?? getFallbackCalendarId()
      : getFallbackCalendarId()

    const updates: Record<string, unknown> = {}

    if ("date" in payload) {
      const date = normalizeDate(payload.date)
      if (!date) {
        return NextResponse.json(
          { error: "La fecha debe tener formato YYYY-MM-DD" },
          { status: 400 }
        )
      }

      const { startAt, endAt } = buildDateRange(date)
      updates.start_at = startAt
      updates.end_at = endAt
    }

    if ("type" in payload) {
      if (typeof payload.type !== "string") {
        return NextResponse.json(
          { error: "El tipo de turno debe ser una cadena" },
          { status: 400 }
        )
      }

      const type = payload.type.toUpperCase()
      if (!VALID_SHIFT_TYPES.has(type as ApiShift["type"])) {
        return NextResponse.json(
          { error: "El tipo de turno no es válido" },
          { status: 400 }
        )
      }

      updates.shift_type_code = type
    }

    if ("note" in payload) {
      const note =
        typeof payload.note === "string" && payload.note.trim().length > 0
          ? payload.note.trim()
          : null
      updates.note = note
    }

    if ("label" in payload) {
      const label =
        typeof payload.label === "string" && payload.label.trim().length > 0
          ? payload.label.trim().slice(0, 100)
          : null
      updates.label = label
    }

    if ("color" in payload) {
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
              {
                error: "El color del turno debe ser un código hexadecimal válido",
              },
              { status: 400 },
            )
          }

          color = normalizedColor
        }
      }

      updates.color = color
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

    if ("plusNight" in payload) {
      const plusNightResult = parsePlus(payload.plusNight, "plusNight")
      if (typeof plusNightResult === "object" && "error" in plusNightResult) {
        return NextResponse.json({ error: plusNightResult.error }, { status: 400 })
      }
      updates.plus_night =
        typeof plusNightResult === "number" ? plusNightResult : 0
    }

    if ("plusHoliday" in payload) {
      const plusHolidayResult = parsePlus(payload.plusHoliday, "plusHoliday")
      if (typeof plusHolidayResult === "object" && "error" in plusHolidayResult) {
        return NextResponse.json({ error: plusHolidayResult.error }, { status: 400 })
      }
      updates.plus_holiday =
        typeof plusHolidayResult === "number" ? plusHolidayResult : 0
    }

    if ("plusAvailability" in payload) {
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
      updates.plus_availability =
        typeof plusAvailabilityResult === "number" ? plusAvailabilityResult : 0
    }

    if ("plusOther" in payload) {
      const plusOtherResult = parsePlus(payload.plusOther, "plusOther")
      if (typeof plusOtherResult === "object" && "error" in plusOtherResult) {
        return NextResponse.json({ error: plusOtherResult.error }, { status: 400 })
      }
      updates.plus_other =
        typeof plusOtherResult === "number" ? plusOtherResult : 0
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No se detectaron cambios para actualizar" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("shifts")
      .update(updates)
      .eq("id", id)
      .eq("calendar_id", calendarId)
      .select(SHIFT_SELECT_COLUMNS)
      .maybeSingle()

    if (error) {
      console.error(`Error updating shift ${id} en Supabase`, error)
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar el turno en Supabase. Inténtalo de nuevo más tarde.",
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "No se encontró el turno especificado" },
        { status: 404 }
      )
    }

    const shift = mapShiftRow(adaptDatabaseShiftRow(data as DatabaseShiftRow))

    return NextResponse.json({ shift })
  } catch (error) {
    console.error(`Error updating shift ${id}`, error)
    return NextResponse.json(
      {
        error:
          "No se pudo actualizar el turno en Supabase. Inténtalo de nuevo más tarde.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = parseId(params.id)
  if (!id) {
    return NextResponse.json(
      { error: "El identificador del turno no es válido" },
      { status: 400 }
    )
  }

  try {
    const userId = parseUserId(request.nextUrl.searchParams.get("userId"))
    const calendarId = userId
      ? (await findCalendarIdForUser(userId)) ?? getFallbackCalendarId()
      : getFallbackCalendarId()

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id)
      .eq("calendar_id", calendarId)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error(`Error deleting shift ${id} en Supabase`, error)
      return NextResponse.json(
        {
          error:
            "No se pudo eliminar el turno de Supabase. Inténtalo de nuevo más tarde.",
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "No se encontró el turno especificado" },
        { status: 404 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`Error deleting shift ${id}`, error)
    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el turno de Supabase. Inténtalo de nuevo más tarde.",
      },
      { status: 500 }
    )
  }
}
