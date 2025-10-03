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
      | { date?: unknown; type?: unknown; note?: unknown }
      | null

    if (!payload) {
      return NextResponse.json(
        { error: "No se recibieron datos para actualizar" },
        { status: 400 }
      )
    }

    const userId = parseUserId(request.nextUrl.searchParams.get("userId"))
    const calendarId = userId
      ? await findCalendarIdForUser(userId)
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
      ? await findCalendarIdForUser(userId)
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

    return NextResponse.json(null, { status: 204 })
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
