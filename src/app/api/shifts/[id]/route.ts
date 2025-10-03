import { NextResponse } from "next/server"
import { format } from "date-fns"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getPool } from "@/lib/db"

function toDateOnly(value: Date | string | null) {
  if (!value) return ""
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd")
  }
  return String(value).slice(0, 10)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ message: "Identificador no válido" }, { status: 400 })
  }

  let body: { date?: string; type?: string; note?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "JSON no válido" }, { status: 400 })
  }

  const { date, type, note } = body
  if (!date || !type) {
    return NextResponse.json({ message: "Fecha y tipo son obligatorios" }, { status: 400 })
  }

  try {
    const pool = getPool()
    const startAt = `${date} 00:00:00`
    const endAt = `${date} 23:59:59`

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE shifts SET shift_type_code = ?, note = ?, start_at = ?, end_at = ? WHERE id = ?`,
      [type, note ?? null, startAt, endAt, id]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "Turno no encontrado" }, { status: 404 })
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, calendar_id AS calendarId, shift_type_code AS type, start_at AS startAt, note
       FROM shifts WHERE id = ?`,
      [id]
    )

    const updated = rows.map((row) => ({
      id: row.id as number,
      calendarId: row.calendarId as number,
      type: row.type as string,
      date: toDateOnly(row.startAt),
      note: (row.note as string | null) ?? "",
    }))[0]

    return NextResponse.json(updated)
  } catch (error) {
    console.error(`Failed to update shift ${id}`, error)
    return NextResponse.json({ message: "No se pudo actualizar el turno" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ message: "Identificador no válido" }, { status: 400 })
  }

  try {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM shifts WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Failed to delete shift ${id}`, error)
    return NextResponse.json({ message: "No se pudo eliminar el turno" }, { status: 500 })
  }
}
