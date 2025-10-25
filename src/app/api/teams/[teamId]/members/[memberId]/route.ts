import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"

import { getTeamDetails } from "../../../../teamService"

type RouteParams = Record<string, string | string[] | undefined>

export const runtime = "nodejs"

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

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const params = await context.params
  const teamId = sanitizeId(params?.teamId)
  const memberId = sanitizeId(params?.memberId)

  if (!teamId || !memberId) {
    return NextResponse.json(
      { error: "Debes indicar el equipo y el miembro a eliminar" },
      { status: 400 },
    )
  }

  let payload: { requesterId?: unknown } | null = null

  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const requesterId = sanitizeId(payload?.requesterId)

  if (!requesterId) {
    return NextResponse.json(
      { error: "Debes indicar quién solicita la eliminación" },
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

    if (teamDetails.ownerUserId !== requesterId) {
      return NextResponse.json(
        { error: "Solo el propietario puede eliminar miembros del equipo" },
        { status: 403 },
      )
    }

    if (memberId === teamDetails.ownerUserId) {
      return NextResponse.json(
        { error: "El propietario no puede eliminarse a sí mismo" },
        { status: 400 },
      )
    }

    const memberExists = teamDetails.members.some(
      (member) => member.id === memberId,
    )

    if (!memberExists) {
      return NextResponse.json(
        { error: "El usuario indicado no forma parte del equipo" },
        { status: 404 },
      )
    }

    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", memberId)

    if (deleteError) {
      throw deleteError
    }

    const updatedTeam = await getTeamDetails(supabase, teamId)

    return NextResponse.json({
      success: true,
      team: updatedTeam,
    })
  } catch (error) {
    console.error("Error eliminando a un miembro del equipo", error)
    return NextResponse.json(
      { error: "No se pudo eliminar al miembro del equipo" },
      { status: 500 },
    )
  }
}
