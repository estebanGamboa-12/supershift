import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

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

export async function GET(_: Request, { params }: RouteParams) {
  const userId = sanitizeId(params?.id)
  if (!userId) {
    return NextResponse.json(
      { error: "Debes indicar el identificador del usuario" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("user_profile_history")
      .select(
        "id, changed_at, previous_name, previous_timezone, previous_avatar_url, new_name, new_timezone, new_avatar_url",
      )
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    const history = (data ?? []).map((entry) => ({
      id: String(entry.id ?? ""),
      changedAt: String(entry.changed_at ?? ""),
      previousName:
        entry.previous_name != null && String(entry.previous_name).trim().length > 0
          ? String(entry.previous_name)
          : null,
      previousTimezone:
        entry.previous_timezone != null && String(entry.previous_timezone).trim().length > 0
          ? String(entry.previous_timezone)
          : null,
      previousAvatarUrl:
        entry.previous_avatar_url != null && String(entry.previous_avatar_url).trim().length > 0
          ? String(entry.previous_avatar_url)
          : null,
      newName:
        entry.new_name != null && String(entry.new_name).trim().length > 0
          ? String(entry.new_name)
          : null,
      newTimezone:
        entry.new_timezone != null && String(entry.new_timezone).trim().length > 0
          ? String(entry.new_timezone)
          : null,
      newAvatarUrl:
        entry.new_avatar_url != null && String(entry.new_avatar_url).trim().length > 0
          ? String(entry.new_avatar_url)
          : null,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""

      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable de entorno SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) para consultar el historial de perfil.",
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
              "Configura SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder leer el historial de perfil.",
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
              "El usuario de Supabase no tiene permisos para leer el historial de perfiles. Revisa las políticas de RLS o usa la clave SUPABASE_SERVICE_ROLE_KEY.",
          },
          { status: 500 },
        )
      }
    }

    console.error("Error fetching user profile history from Supabase", error)
    return NextResponse.json(
      { error: "No se pudo cargar el historial de cambios del perfil" },
      { status: 500 },
    )
  }
}
