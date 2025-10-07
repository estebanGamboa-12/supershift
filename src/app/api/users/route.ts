import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
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
  const supabase = getSupabaseClient()
  const { data: userRows, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .order("created_at", { ascending: true })

  if (usersError) {
    throw usersError
  }

  const users = userRows ?? []
  const userIds = users.map((user) => Number(user.id))
  const calendarByUser = new Map<number, number>()

  if (userIds.length > 0) {
    const { data: calendarRows, error: calendarsError } = await supabase
      .from("calendars")
      .select("id, owner_user_id")
      .in("owner_user_id", userIds)
      .order("id", { ascending: true })

    if (calendarsError) {
      throw calendarsError
    }

    for (const calendar of calendarRows ?? []) {
      const ownerId = Number(calendar.owner_user_id)
      const calendarId = Number(calendar.id)
      if (!calendarByUser.has(ownerId)) {
        calendarByUser.set(ownerId, calendarId)
      }
    }
  }

  return users.map((user) => ({
    id: Number(user.id),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    calendarId: calendarByUser.get(Number(user.id)) ?? null,
  }))
}

async function createUser({
  name,
  email,
  password,
}: {
  name: string
  email: string
  password: string
}) {
  const supabase = getSupabaseClient()
  const timezone = "Europe/Madrid"
  const passwordHash = await hashPassword(password)

  const { data, error } = await supabase
    .from("users")
    .insert({ name, email, password_hash: passwordHash, timezone })
    .select("id")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.id) {
    throw new Error("Supabase no devolvió el identificador del nuevo usuario")
  }

  const userId = Number(data.id)
  const calendarName = `Calendario de ${name}`

  try {
    const calendarId = await ensureCalendarForUser(userId, calendarName, timezone)
    return {
      id: userId,
      name,
      email,
      calendarId,
    }
  } catch (calendarError) {
    await supabase.from("users").delete().eq("id", userId)
    throw calendarError
  }
}

export async function GET() {
  try {
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users from Supabase", error)
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

  try {
    const user = await createUser({ name, email, password })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""

      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable de entorno SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) para poder crear usuarios.",
          },
          { status: 500 }
        )
      }

      if (message.includes("Supabase key no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder crear usuarios.",
          },
          { status: 500 }
        )
      }
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["23505", "1062"].includes(String((error as { code?: string }).code))
    ) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      )
    }

    const supabaseMessage =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : ""

    if (supabaseMessage) {
      const normalizedMessage = supabaseMessage.toLowerCase()
      if (
        normalizedMessage.includes("row-level security") ||
        normalizedMessage.includes("permission denied") ||
        normalizedMessage.includes("policy") ||
        normalizedMessage.includes("rls")
      ) {
        return NextResponse.json(
          {
            error:
              "El usuario de Supabase no tiene permisos para insertar en las tablas requeridas. Revisa las políticas de RLS o usa la clave SUPABASE_SERVICE_ROLE_KEY.",
          },
          { status: 500 }
        )
      }
    }

    console.error("Error creating user in Supabase", error)
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 }
    )
  }
}
