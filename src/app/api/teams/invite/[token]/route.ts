import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"
import { getTeamMemberLimit } from "../../teamService"

export const runtime = "nodejs"

function sanitizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const token = sanitizeToken(params.token)

  if (!token) {
    return NextResponse.json(
      { error: "El enlace de invitación no es válido" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

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
        { error: "El enlace no existe o ya no está disponible" },
        { status: 404 },
      )
    }

    const teamId = String(inviteRow.team_id)

    const { data: teamRow, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .maybeSingle()

    if (teamError) {
      throw teamError
    }

    if (!teamRow) {
      return NextResponse.json(
        { error: "El equipo asociado al enlace ya no existe" },
        { status: 404 },
      )
    }

    const { count: memberCount, error: countError } = await supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", teamId)

    if (countError) {
      throw countError
    }

    const currentMembers = typeof memberCount === "number" ? memberCount : 0
    const remainingSpots = Math.max(
      0,
      getTeamMemberLimit() - currentMembers,
    )

    return NextResponse.json({
      team: {
        id: String(teamRow.id),
        name: String(teamRow.name ?? ""),
      },
      invite: {
        token: String(inviteRow.token),
        maxUses: Number(inviteRow.max_uses ?? 0),
        uses: Number(inviteRow.uses ?? 0),
        expiresAt: inviteRow.expires_at ? String(inviteRow.expires_at) : null,
      },
      remainingSpots,
      memberLimit: getTeamMemberLimit(),
    })
  } catch (error) {
    console.error("Error consultando el enlace de invitación", error)
    return NextResponse.json(
      { error: "No se pudo verificar el estado del enlace" },
      { status: 500 },
    )
  }
}
