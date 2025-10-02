import { NextResponse } from "next/server"
import type { ShiftType } from "@/types/shifts"
import { queryRows } from "@/lib/db"
import type { RowDataPacket } from "mysql2/promise"

export const runtime = "nodejs"

const VALID_SHIFT_TYPES: ReadonlySet<ShiftType> = new Set([
  "WORK",
  "REST",
  "NIGHT",
  "VACATION",
  "CUSTOM",
])

type ShiftRow = RowDataPacket & {
  id: number
  date: string
  type: string
  note: string | null
}

export async function GET() {
  try {
    const rows = await queryRows<ShiftRow[]>(
      `SELECT id, DATE_FORMAT(start_at, '%Y-%m-%d') AS date, shift_type_code AS type, note
       FROM shifts
       ORDER BY start_at ASC`
    )

    const shifts = rows.map((row) => {
      const type = VALID_SHIFT_TYPES.has(row.type as ShiftType)
        ? (row.type as ShiftType)
        : "CUSTOM"

      return {
        id: row.id,
        date: row.date,
        type,
        ...(row.note != null ? { note: row.note } : {}),
      }
    })

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
