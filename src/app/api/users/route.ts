import { NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getPool } from "@/lib/db"
import { ensureCalendarForUser } from "@/lib/calendars"
import { hashPassword } from "@/lib/passwords"

export const runtime = "nodejs"

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function listUsers() {
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email,
            (SELECT id FROM calendars WHERE owner_user_id = u.id ORDER BY id ASC LIMIT 1) AS calendarId
       FROM users u
       ORDER BY u.created_at ASC`
  )

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    calendarId: row.calendarId != null ? Number(row.calendarId) : null,
  }))
}

async function createUser(
  connection: PoolConnection,
  {
    name,
    email,
    password,
  }: { name: string; email: string; password: string }
) {
  const timezone = "Europe/Madrid"
  const passwordHash = await hashPassword(password)

  const [userResult] = await connection.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, timezone)
     VALUES (?, ?, ?, ?)` ,
    [name, email, passwordHash, timezone]
  )

  if (!userResult.insertId) {
    throw new Error("No se pudo crear el usuario")
  }

  const userId = Number(userResult.insertId)
  const calendarName = `Calendario de ${name}`
  const calendarId = await ensureCalendarForUser(
    userId,
    calendarName,
    timezone,
    connection
  )

  return {
    id: userId,
    name,
    email,
    calendarId,
  }
}

export async function GET() {
  try {
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users", error)
    return NextResponse.json(
      { error: "No se pudieron cargar los usuarios" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let payload: { name?: unknown; email?: unknown; password?: unknown } | null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 }
    )
  }

  const name = sanitizeString(payload?.name)
  const email = sanitizeString(payload?.email)
  const password = sanitizeString(payload?.password)

  if (!name || !email || !password) {
    return NextResponse.json(
      {
        error: "Nombre, correo y contraseña son obligatorios",
      },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    )
  }

  const pool = await getPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    const user = await createUser(connection, { name, email, password })
    await connection.commit()

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    await connection.rollback()

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      )
    }

    console.error("Error creating user", error)
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 }
    )
  } finally {
    connection.release()
  }
}
