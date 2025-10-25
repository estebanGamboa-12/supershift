import { NextResponse } from "next/server"

import { getSupabaseClient } from "@/lib/supabase"
import type { TeamDetails } from "@/types/teams"

import {
  findMembershipForUser,
  getTeamDetails,
  getTeamMemberLimit,
} from "./teamService"

type CreateTeamPayload = {
  ownerId?: unknown
  name?: unknown
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
  let payload: CreateTeamPayload | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const ownerId = sanitizeText(payload?.ownerId)
  const teamName = sanitizeText(payload?.name)

  if (!ownerId) {
    return NextResponse.json(
      { error: "El identificador del propietario es obligatorio" },
      { status: 400 },
    )
  }

  if (!teamName) {
    return NextResponse.json(
      { error: "El nombre del equipo es obligatorio" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

    const { data: ownerProfile, error: ownerError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", ownerId)
      .maybeSingle()

    if (ownerError) {
      throw ownerError
    }

    if (!ownerProfile) {
      return NextResponse.json(
        { error: "No se encontró el propietario indicado" },
        { status: 404 },
      )
    }

    const existingMembership = await findMembershipForUser(supabase, ownerId)

    if (existingMembership.data) {
      return NextResponse.json(
        {
          error:
            "El usuario ya forma parte de un equipo activo. Debe abandonar el equipo actual antes de crear uno nuevo.",
        },
        { status: 409 },
      )
    }

    const { data: createdTeam, error: createTeamError } = await supabase
      .from("teams")
      .insert({
        name: teamName,
        owner_user_id: ownerId,
      })
      .select("id")
      .maybeSingle()

    if (createTeamError) {
      throw createTeamError
    }

    if (!createdTeam?.id) {
      throw new Error("Supabase no devolvió el identificador del equipo")
    }

    const teamId = String(createdTeam.id)

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: ownerId,
      role: "owner",
    })

    if (memberError) {
      await supabase.from("teams").delete().eq("id", teamId)
      throw memberError
    }

    const teamDetails = await getTeamDetails(supabase, teamId)

    if (!teamDetails) {
      throw new Error("No se pudo recuperar la información del equipo recién creado")
    }

    const responseBody: { team: TeamDetails } = {
      team: teamDetails,
    }

    return NextResponse.json(responseBody, { status: 201 })
  } catch (error) {
    console.error("Error creando un equipo en Supabase", error)

    const message =
      error instanceof Error && error.message
        ? error.message
        : "No se pudo crear el equipo"

    if (message.toLowerCase().includes("policy") || message.includes("rls")) {
      return NextResponse.json(
        {
          error:
            "El usuario de Supabase no tiene permisos para gestionar equipos. Revisa las políticas de seguridad o usa la clave de servicio.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error:
          message ??
          "No se pudo crear el equipo. Comprueba la conexión con Supabase e inténtalo de nuevo.",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = sanitizeText(searchParams.get("userId"))

  if (!userId) {
    return NextResponse.json(
      { error: "Debes proporcionar el identificador del usuario" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

    const membership = await findMembershipForUser(supabase, userId)

    if (!membership.data) {
      return NextResponse.json({ team: null, memberLimit: getTeamMemberLimit() })
    }

    const teamDetails = await getTeamDetails(
      supabase,
      String(membership.data.team_id),
    )

    const sanitizedTeam: TeamDetails | null = teamDetails
      ? {
          ...teamDetails,
          invite:
            teamDetails.ownerUserId === userId ? teamDetails.invite : null,
        }
      : null

    return NextResponse.json({
      team: sanitizedTeam,
      memberLimit: getTeamMemberLimit(),
    })
  } catch (error) {
    console.error("Error obteniendo el equipo del usuario", error)
    return NextResponse.json(
      { error: "No se pudo recuperar la información del equipo" },
      { status: 500 },
    )
  }
}
