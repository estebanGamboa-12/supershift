import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

import { upsertUserProfile } from "./upsertUserProfile"

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
    .select("id, name, email, timezone, avatar_url")
    .order("created_at", { ascending: true })

  if (usersError) {
    throw usersError
  }

  const users = userRows ?? []
  const userIds = users
    .map((user) => (user.id != null ? String(user.id) : null))
    .filter((id): id is string => Boolean(id))
  const calendarByUser = new Map<string, number>()

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
      if (calendar.owner_user_id == null) {
        continue
      }
      const ownerId = String(calendar.owner_user_id)
      const calendarId = Number(calendar.id)
      if (!calendarByUser.has(ownerId) && Number.isFinite(calendarId)) {
        calendarByUser.set(ownerId, calendarId)
      }
    }
  }

  return users.map((user) => ({
    id: String(user.id),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    calendarId: calendarByUser.get(String(user.id)) ?? null,
    avatarUrl:
      user.avatar_url != null && String(user.avatar_url).trim().length > 0
        ? String(user.avatar_url)
        : null,
    timezone:
      user.timezone != null && String(user.timezone).trim().length > 0
        ? String(user.timezone)
        : "Europe/Madrid",
  }))
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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
  let payload: {
    id?: unknown
    name?: unknown
    email?: unknown
    timezone?: unknown
    avatarUrl?: unknown
  } | null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 }
    )
  }

  const id = sanitizeId(payload?.id)
  const name = sanitizeString(payload?.name) ?? ""
  const email = sanitizeString(payload?.email)
  const timezone = sanitizeString(payload?.timezone) ?? "Europe/Madrid"
  const avatarUrl = sanitizeString(payload?.avatarUrl)

  if (!id || !email) {
    return NextResponse.json(
      {
        error: "Identificador y correo son obligatorios",
      },
      { status: 400 },
    )
  }

  try {
    const user = await upsertUserProfile({
      id,
      name,
      email,
      timezone,
      avatarUrl,
    })
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

      if (
        message.includes("Supabase key no configurada") ||
        message.includes("Supabase anon key no configurada")
      ) {
        return NextResponse.json(
          {
            error:
              "Configura la variable SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder gestionar usuarios.",
          },
          { status: 500 },
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
        { error: "El usuario ya está registrado" },
        { status: 409 },
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

