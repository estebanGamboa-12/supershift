import { NextResponse } from "next/server"

import { upsertUserProfile } from "@/app/api/users/route"

export const runtime = "nodejs"

type RouteContext = {
  params: { userId: string }
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = sanitizeId(context.params.userId)

  if (!userId) {
    return NextResponse.json(
      { error: "Identificador de usuario no válido" },
      { status: 400 },
    )
  }

  let payload: {
    name?: unknown
    email?: unknown
    timezone?: unknown
    avatarUrl?: unknown
    updatedBy?: unknown
  } | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const name = sanitizeString(payload?.name) ?? ""
  const email = sanitizeString(payload?.email)
  const timezone = sanitizeString(payload?.timezone) ?? "Europe/Madrid"
  const avatarUrl = sanitizeString(payload?.avatarUrl)
  const updatedBy = sanitizeId(payload?.updatedBy)

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
    console.error("Error updating user profile", error)

    const message =
      error instanceof Error && error.message
        ? error.message
        : "No se pudo actualizar el perfil"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
