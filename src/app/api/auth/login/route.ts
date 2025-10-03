import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { queryRows } from "@/lib/db"
import { getOrCreateCalendarForUser } from "@/lib/calendars"
import { verifyPassword } from "@/lib/passwords"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let payload: { email?: unknown; password?: unknown } | null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 }
    )
  }

  const email = typeof payload?.email === "string" ? payload.email.trim() : ""
  const password = typeof payload?.password === "string" ? payload.password : ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "Correo y contraseña son obligatorios" },
      { status: 400 }
    )
  }

  try {
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, name, email, password_hash FROM users WHERE email = ?`,
      [email]
    )

    if (!rows.length) {
      return NextResponse.json(
        { error: "Credenciales no válidas" },
        { status: 401 }
      )
    }

    const userRow = rows[0]
    const passwordHash = userRow.password_hash as string | null

    const isValid = await verifyPassword(password, passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales no válidas" },
        { status: 401 }
      )
    }

    const userId = Number(userRow.id)
    const calendarId = await getOrCreateCalendarForUser(userId)

    if (!calendarId) {
      return NextResponse.json(
        {
          error:
            "No se encontró un calendario asociado al usuario. Vuelve a intentarlo más tarde.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: userId,
        name: String(userRow.name),
        email: String(userRow.email),
        calendarId,
      },
    })
  } catch (error) {
    console.error("Error during login", error)
    return NextResponse.json(
      { error: "No se pudo iniciar sesión" },
      { status: 500 }
    )
  }
}
