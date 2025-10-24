import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"
import type { TeamInviteSummary } from "@/types/teams"

import { getTeamDetails, getTeamMemberLimit } from "../../teamService"

type CreateInvitePayload = {
  userId?: unknown
}

export const runtime = "nodejs"

type RouteParams = Record<string, string | string[] | undefined>

function sanitizeId(value: unknown): string | null {
  if (Array.isArray(value)) {
    return sanitizeId(value[0])
  }

  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const params = await context.params
  const teamId = sanitizeId(params?.teamId)

  if (!teamId) {
    return NextResponse.json(
      { error: "El identificador del equipo no es válido" },
      { status: 400 },
    )
  }

  let payload: CreateInvitePayload | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const userId = sanitizeId(payload?.userId)

  if (!userId) {
    return NextResponse.json(
      { error: "Debes indicar el usuario que solicita el enlace" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

    const teamDetails = await getTeamDetails(supabase, teamId)

    if (!teamDetails) {
      return NextResponse.json(
        { error: "No se encontró el equipo solicitado" },
        { status: 404 },
      )
    }

    const requester = teamDetails.members.find((member) => member.id === userId)

    if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
      return NextResponse.json(
        {
          error:
            "Solo los propietarios o administradores pueden generar enlaces de invitación",
        },
        { status: 403 },
      )
    }

    const memberCount = teamDetails.members.length
    const remainingSpots = Math.max(
      0,
      getTeamMemberLimit() - memberCount,
    )

    if (remainingSpots <= 0) {
      return NextResponse.json(
        {
          error: "El equipo ya alcanzó el máximo de integrantes permitidos",
        },
        { status: 409 },
      )
    }

    if (teamDetails.invite) {
      return NextResponse.json({
        invite: teamDetails.invite,
        remainingSpots,
      })
    }

    const maxUses = Math.max(1, Math.min(remainingSpots, getTeamMemberLimit()))
    const token = crypto.randomUUID()

    const { data: inviteRow, error: inviteError } = await supabase
      .from("team_invites")
      .insert({
        team_id: teamId,
        token,
        created_by_user_id: userId,
        max_uses: maxUses,
      })
      .select("token, max_uses, uses, created_at, expires_at")
      .maybeSingle()

    if (inviteError) {
      throw inviteError
    }

    const invite: TeamInviteSummary | null = inviteRow
      ? {
          token: String(inviteRow.token),
          maxUses: Number(inviteRow.max_uses ?? maxUses),
          uses: Number(inviteRow.uses ?? 0),
          createdAt: String(inviteRow.created_at ?? new Date().toISOString()),
          expiresAt: inviteRow.expires_at ? String(inviteRow.expires_at) : null,
        }
      : null

    if (!invite) {
      throw new Error("Supabase no devolvió el enlace generado")
    }

    return NextResponse.json({ invite, remainingSpots })
  } catch (error) {
    console.error("Error generando el enlace de invitación", error)

    return NextResponse.json(
      { error: "No se pudo generar el enlace de invitación" },
      { status: 500 },
    )
  }
}
