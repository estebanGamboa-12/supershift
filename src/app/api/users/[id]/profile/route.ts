import { NextResponse } from "next/server"
import { upsertUserProfile } from "@/app/api/users/upsertUserProfile"

export const runtime = "nodejs"

type RouteParams = {
  params: {
    id?: string
  }
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const DEFAULT_TIMEZONE = "Europe/Madrid"

export async function PATCH(request: Request, { params }: RouteParams) {
  const userId = sanitizeId(params?.id)
  if (!userId) {
    return NextResponse.json(
      { error: "Debes indicar el identificador del usuario" },
      { status: 400 },
    )
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        name?: unknown
        email?: unknown
        timezone?: unknown
        avatarUrl?: unknown
        updatedBy?: unknown
      }
    | null

  if (!payload) {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const name = sanitizeString(payload.name) ?? ""
  const email = sanitizeString(payload.email)
  const timezone = sanitizeString(payload.timezone) ?? DEFAULT_TIMEZONE
  const avatarUrl = sanitizeString(payload.avatarUrl)
  const updatedBy = sanitizeId(payload.updatedBy)

  if (!email) {
    return NextResponse.json(
      { error: "El correo electrónico es obligatorio" },
      { status: 400 },
    )
  }

  try {
    const user = await upsertUserProfile({
      id: userId,
      name,
      email,
      timezone,
      avatarUrl,
      changedByUserId: updatedBy ?? userId,
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""

      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable de entorno SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) para actualizar perfiles.",
          },
          { status: 500 },
        )
      }

      if (
        message.includes("Supabase key no configurada") ||
        message.includes("Supabase anon key no configurada")
      ) {
        return NextResponse.json(
          {
            error:
              "Configura SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder guardar los cambios del perfil.",
          },
          { status: 500 },
        )
      }
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
              "El usuario de Supabase no tiene permisos para actualizar la tabla de usuarios. Revisa las políticas de RLS o usa la clave SUPABASE_SERVICE_ROLE_KEY.",
          },
          { status: 500 },
        )
      }
    }

    console.error("Error updating user profile in Supabase", error)
    return NextResponse.json(
      { error: "No se pudieron guardar los cambios del perfil" },
      { status: 500 },
    )
  }
}
