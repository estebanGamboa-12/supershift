import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getPool, queryRows } from "@/lib/db"

export async function findCalendarIdForUser(
  userId: number,
  connection?: PoolConnection
): Promise<number | null> {
  const sql =
    "SELECT id FROM calendars WHERE owner_user_id = ? ORDER BY id ASC LIMIT 1"

  if (connection) {
    const [rows] = await connection.query<RowDataPacket[]>(sql, [userId])
    if (!rows.length) {
      return null
    }
    return Number(rows[0].id)
  }

  const rows = await queryRows<RowDataPacket[]>(sql, [userId])
  if (!rows.length) {
    return null
  }

  return Number(rows[0].id)
}

export async function ensureCalendarForUser(
  userId: number,
  name: string,
  timezone: string,
  connection?: PoolConnection
): Promise<number> {
  const existing = await findCalendarIdForUser(userId, connection)
  if (existing) {
    return existing
  }

  if (!connection) {
    const pool = await getPool()
    const newConnection = await pool.getConnection()
    try {
      const calendarId = await ensureCalendarForUser(
        userId,
        name,
        timezone,
        newConnection
      )
      return calendarId
    } finally {
      newConnection.release()
    }
  }

  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO calendars (name, owner_user_id, timezone, color)
     VALUES (?, ?, ?, '#38bdf8')`,
    [name, userId, timezone]
  )

  if (!result.insertId) {
    throw new Error("No se pudo crear el calendario del usuario")
  }

  return Number(result.insertId)
}
