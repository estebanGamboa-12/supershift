import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
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
    const supabase = getSupabaseClient()
    const { data: userRow, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      console.error("Supabase error during login", error)
      return NextResponse.json(
        { error: "No se pudo iniciar sesión" },
        { status: 500 }
      )
    }

    if (!userRow) {
      return NextResponse.json(
        { error: "Credenciales no válidas" },
        { status: 401 }
      )
    }

    const passwordHash = userRow.password_hash as string | null

    const isValid = await verifyPassword(password, passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales no válidas" },
        { status: 401 }
      )
    }

    const userId = String(userRow.id)
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
