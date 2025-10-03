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

    const rows = await queryRows<ShiftRow[]>(
      `${SHIFT_SELECT_BASE} WHERE calendar_id = ? ORDER BY start_at ASC`,
      [calendarId]
    )

    const shifts = rows.map((row) => mapShiftRow(row))

    return NextResponse.json({ shifts })
  } catch (error) {
    console.error("Error fetching shifts from database", error)
    return NextResponse.json(
      {
        error:
          "No se pudieron cargar los turnos desde la base de datos. Revisa la conexión con MySQL.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | { date?: unknown; type?: unknown; note?: unknown; userId?: unknown }
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

    const result = await execute(
      `INSERT INTO shifts (calendar_id, shift_type_code, start_at, end_at, all_day, note)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [calendarId, type, startAt, endAt, note]
    )

    if (!result.insertId) {
      throw new Error("No se pudo obtener el identificador del nuevo turno")
    }

    const rows = await queryRows<ShiftRow[]>(
      `${SHIFT_SELECT_BASE} WHERE id = ? AND calendar_id = ?`,
      [result.insertId, calendarId]
    )

    if (!rows.length) {
      throw new Error("No se pudo recuperar el turno insertado")
    }

    const [row] = rows
    const shift = mapShiftRow(row)

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error("Error creating shift in database", error)
    return NextResponse.json(
      {
        error:
          "No se pudo crear el turno en la base de datos. Revisa la conexión con MySQL y los datos enviados.",
      },
      { status: 500 }
    )
  }
}
