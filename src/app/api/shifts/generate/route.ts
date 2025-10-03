import { NextResponse } from "next/server"
import { format } from "date-fns"
import type { PoolConnection, RowDataPacket } from "mysql2/promise"
import { getPool } from "@/lib/db"
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
  return Number(process.env.ROTATION_HORIZON_DAYS ?? 60)
}

function getDefaultCalendarId() {
  return Number.isNaN(DEFAULT_CALENDAR_ID) ? 1 : DEFAULT_CALENDAR_ID
}

export async function POST(request: Request) {
  let body: { startDate?: string; cycle?: number[]; userId?: number }
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

  const pool = await getPool()
  let connection: PoolConnection | null = null

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const calendarId = userId
      ? await getOrCreateCalendarForUser(userId, connection)
      : getDefaultCalendarId()

    if (!calendarId) {
      await connection.rollback()
      return NextResponse.json(
        {
          message: userId
            ? "No se encontró un calendario para el usuario"
            : "No se encontró un calendario predeterminado",
        },
        { status: 404 },
      )
    }

    await connection.execute(`DELETE FROM shifts WHERE calendar_id = ?`, [calendarId])

    if (rotation.length > 0) {
      const values = rotation.map((shift) => [
        calendarId,
        shift.type,
        `${shift.date} 00:00:00`,
        `${shift.date} 23:59:59`,
        1,
        null,
      ])

      await connection.query(
        `INSERT INTO shifts (calendar_id, shift_type_code, start_at, end_at, all_day, note)
         VALUES ?`,
        [values]
      )
    }

    await connection.commit()

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, calendar_id AS calendarId, shift_type_code AS type, start_at AS startAt, note
       FROM shifts WHERE calendar_id = ?
       ORDER BY start_at`,
      [calendarId]
    )

    const shifts = rows.map((row) => ({
      id: row.id as number,
      calendarId: row.calendarId as number,
      type: row.type as string,
      date: toDateOnly(row.startAt),
      note: (row.note as string | null) ?? "",
    }))

    return NextResponse.json({ shifts })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    console.error("Failed to regenerate shifts", error)
    return NextResponse.json({ message: "No se pudieron generar los turnos" }, { status: 500 })
  } finally {
    connection?.release()
  }
}
