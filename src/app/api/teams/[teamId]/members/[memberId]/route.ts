import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"

import { getTeamDetails } from "../../../teamService"

type RouteParams = Record<string, string | string[] | undefined>

type RemoveMemberPayload = {
  requesterId?: unknown
}

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

  let payload: RemoveMemberPayload | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
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
        { error: "No se encontró el equipo indicado" },
        { status: 404 },
      )
    }

    const requester = teamDetails.members.find((member) => member.id === requesterId)

    if (!requester || requester.role !== "owner") {
      return NextResponse.json(
        { error: "Solo el propietario puede eliminar integrantes del equipo" },
        { status: 403 },
      )
    }

    if (memberId === requesterId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio perfil del equipo" },
        { status: 400 },
      )
    }

    const member = teamDetails.members.find((candidate) => candidate.id === memberId)

    if (!member) {
      return NextResponse.json(
        { error: "El miembro seleccionado no forma parte del equipo" },
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

    if (!updatedTeam) {
      throw new Error(
        "No se pudo recuperar el equipo después de eliminar al miembro",
      )
    }

    return NextResponse.json({ team: updatedTeam })
  } catch (error) {
    console.error("Error eliminando miembro del equipo", error)

    return NextResponse.json(
      { error: "No se pudo eliminar al miembro del equipo" },
      { status: 500 },
    )
  }
}
