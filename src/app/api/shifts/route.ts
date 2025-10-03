import { NextResponse } from "next/server"
import { format } from "date-fns"
import type { RowDataPacket } from "mysql2/promise"
import { getPool } from "@/lib/db"

function toDateOnly(value: Date | string | null) {
  if (!value) return null
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd")
  }
  return String(value).slice(0, 10)
}

export async function GET() {
  try {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, calendar_id AS calendarId, shift_type_code AS type, start_at AS startAt, note
       FROM shifts
       ORDER BY start_at`
    )

    const shifts = rows.map((row) => ({
      id: row.id as number,
      calendarId: row.calendarId as number,
      type: row.type as string,
      date: toDateOnly(row.startAt) ?? "",
      note: (row.note as string | null) ?? "",
    }))

    return NextResponse.json(shifts)
  } catch (error) {
    console.error("Failed to load shifts", error)
    return NextResponse.json({ message: "No se pudieron cargar los turnos" }, { status: 500 })
  }
}
