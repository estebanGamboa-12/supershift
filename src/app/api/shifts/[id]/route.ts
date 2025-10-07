import { NextResponse, type NextRequest } from "next/server"
import { execute, queryRows } from "@/lib/db"
import {
  SHIFT_SELECT_BASE,
  VALID_SHIFT_TYPES,
  buildDateRange,
  mapShiftRow,
  normalizeDate,
  type ApiShift,
  type ShiftRow,
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

async function fetchShiftById(id: number, calendarId: number) {
  const rows = await queryRows<ShiftRow[]>(
    `${SHIFT_SELECT_BASE} WHERE id = ? AND calendar_id = ?`,
    [id, calendarId]
  )
  return rows.length ? mapShiftRow(rows[0]) : null
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

    const updates: string[] = []
    const values: unknown[] = []

    if ("date" in payload) {
      const date = normalizeDate(payload.date)
      if (!date) {
        return NextResponse.json(
          { error: "La fecha debe tener formato YYYY-MM-DD" },
          { status: 400 }
        )
      }

      const { startAt, endAt } = buildDateRange(date)
      updates.push("start_at = ?", "end_at = ?")
      values.push(startAt, endAt)
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

      updates.push("shift_type_code = ?")
      values.push(type)
    }

    if ("note" in payload) {
      const note =
        typeof payload.note === "string" && payload.note.trim().length > 0
          ? payload.note.trim()
          : null
      updates.push("note = ?")
      values.push(note)
    }

    if ("label" in payload) {
      const label =
        typeof payload.label === "string" && payload.label.trim().length > 0
          ? payload.label.trim().slice(0, 100)
          : null
      updates.push("label = ?")
      values.push(label)
    }

    if ("color" in payload) {
      let color: string | null = null
      if (typeof payload.color === "string") {
        const trimmedColor = payload.color.trim()
        if (trimmedColor.length > 0) {
          const normalizedColor = trimmedColor.toLowerCase()
          const isHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
            normalizedColor,
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

      updates.push("color = ?")
      values.push(color)
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
      updates.push("plus_night = ?")
      values.push(typeof plusNightResult === "number" ? plusNightResult : 0)
    }

    if ("plusHoliday" in payload) {
      const plusHolidayResult = parsePlus(payload.plusHoliday, "plusHoliday")
      if (typeof plusHolidayResult === "object" && "error" in plusHolidayResult) {
        return NextResponse.json({ error: plusHolidayResult.error }, { status: 400 })
      }
      updates.push("plus_holiday = ?")
      values.push(typeof plusHolidayResult === "number" ? plusHolidayResult : 0)
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
      updates.push("plus_availability = ?")
      values.push(
        typeof plusAvailabilityResult === "number" ? plusAvailabilityResult : 0,
      )
    }

    if ("plusOther" in payload) {
      const plusOtherResult = parsePlus(payload.plusOther, "plusOther")
      if (typeof plusOtherResult === "object" && "error" in plusOtherResult) {
        return NextResponse.json({ error: plusOtherResult.error }, { status: 400 })
      }
      updates.push("plus_other = ?")
      values.push(typeof plusOtherResult === "number" ? plusOtherResult : 0)
    }

    if (!updates.length) {
      return NextResponse.json(
        { error: "No se detectaron cambios para actualizar" },
        { status: 400 }
      )
    }

    updates.push("updated_at = CURRENT_TIMESTAMP")

    values.push(id, calendarId)

    const result = await execute(
      `UPDATE shifts SET ${updates.join(", ")} WHERE id = ? AND calendar_id = ?`,
      values
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "No se encontró el turno especificado" },
        { status: 404 }
      )
    }

    const shift = await fetchShiftById(id, calendarId)
    if (!shift) {
      return NextResponse.json(
        { error: "No se pudo recuperar el turno actualizado" },
        { status: 500 }
      )
    }

    return NextResponse.json({ shift })
  } catch (error) {
    console.error(`Error updating shift ${id}`, error)
    return NextResponse.json(
      {
        error:
          "No se pudo actualizar el turno en la base de datos. Inténtalo de nuevo más tarde.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const id = parseId(params.id)
  if (!id) {
    return NextResponse.json(
      { error: "El identificador del turno no es válido" },
      { status: 400 }
    )
  }

  try {
    const userId = parseUserId(_request.nextUrl.searchParams.get("userId"))
    const calendarId = userId
      ? (await findCalendarIdForUser(userId)) ?? getFallbackCalendarId()
      : getFallbackCalendarId()

    const result = await execute(
      "DELETE FROM shifts WHERE id = ? AND calendar_id = ?",
      [id, calendarId]
    )
    if (result.affectedRows === 0) {
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
          "No se pudo eliminar el turno de la base de datos. Inténtalo de nuevo más tarde.",
      },
      { status: 500 }
    )
  }
}
