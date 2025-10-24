import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"
import {
  countTeamMembers,
  findMembershipForUser,
  getTeamDetails,
  getTeamMemberLimit,
} from "../teamService"

type JoinPayload = {
  token?: unknown
  userId?: unknown
}

export const runtime = "nodejs"

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: Request) {
  let payload: JoinPayload | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const token = sanitizeText(payload?.token)
  const userId = sanitizeText(payload?.userId)

  if (!token) {
    return NextResponse.json(
      { error: "Debes proporcionar el enlace de invitación" },
      { status: 400 },
    )
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Debes indicar el usuario que desea unirse" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

    const existingMembership = await findMembershipForUser(supabase, userId)

    if (existingMembership.data) {
      return NextResponse.json(
        {
          error:
            "Ya formas parte de un equipo activo. Sal del equipo actual antes de aceptar una nueva invitación.",
        },
        { status: 409 },
      )
    }

    const { data: inviteRow, error: inviteError } = await supabase
      .from("team_invites")
      .select("id, team_id, token, max_uses, uses, expires_at")
      .eq("token", token)
      .maybeSingle()

    if (inviteError) {
      throw inviteError
    }

    if (!inviteRow) {
      return NextResponse.json(
        { error: "El enlace no es válido o ya no está disponible" },
        { status: 404 },
      )
    }

    if (inviteRow.expires_at) {
      const expiresAt = new Date(inviteRow.expires_at)
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "El enlace de invitación ha caducado" },
          { status: 410 },
        )
      }
    }

    const uses = Number(inviteRow.uses ?? 0)
    const maxUses = Number(inviteRow.max_uses ?? 0)

    if (maxUses > 0 && uses >= maxUses) {
      return NextResponse.json(
        { error: "El enlace de invitación ya fue utilizado por el máximo de miembros" },
        { status: 409 },
      )
    }

    const teamId = String(inviteRow.team_id)

    const memberCount = await countTeamMembers(supabase, teamId)

    if (memberCount >= getTeamMemberLimit()) {
      return NextResponse.json(
        { error: "El equipo ya alcanzó el límite de integrantes" },
        { status: 409 },
      )
    }

    const { error: addMemberError } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: userId,
      role: "member",
    })

    if (addMemberError) {
      throw addMemberError
    }

    const { error: updateInviteError } = await supabase
      .from("team_invites")
      .update({ uses: uses + 1 })
      .eq("id", inviteRow.id)

    if (updateInviteError) {
      console.error(
        "No se pudo actualizar el contador de usos del enlace de invitación",
        updateInviteError,
      )
    }

    const teamDetails = await getTeamDetails(supabase, teamId)

    if (!teamDetails) {
      throw new Error(
        "No se pudo recuperar el equipo después de completar la invitación",
      )
    }

    return NextResponse.json({ team: teamDetails })
  } catch (error) {
    console.error("Error al unir miembro al equipo", error)

    return NextResponse.json(
      { error: "No se pudo unir al equipo con el enlace indicado" },
      { status: 500 },
    )
  }
}
