import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { buildRecoveryCallbackUrl } from "@/lib/auth-links"

export const runtime = "nodejs"

type RecoveryPayload = {
  email?: unknown
  redirect?: unknown
  redirectTo?: unknown
}

function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed || !trimmed.includes("@")) {
    return null
  }

  return trimmed
}

function resolveRedirect(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: Request) {
  let payload: RecoveryPayload | null = null

  try {
    payload = (await request.json()) as RecoveryPayload
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const email = sanitizeEmail(payload?.email)

  if (!email) {
    return NextResponse.json(
      { error: "Proporciona un correo válido para continuar" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()
    const redirect =
      resolveRedirect(payload?.redirect) ?? resolveRedirect(payload?.redirectTo)

    const recoveryUrl = buildRecoveryCallbackUrl({ redirect })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: recoveryUrl,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, recoveryUrl })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""

      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) para poder enviar correos de recuperación.",
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
              "Configura SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder generar enlaces de recuperación.",
          },
          { status: 500 },
        )
      }

      if (
        message.includes("Configura NEXT_PUBLIC_SITE_URL") ||
        message.includes("generar enlaces de autenticación")
      ) {
        return NextResponse.json(
          {
            error:
              "Configura NEXT_PUBLIC_SITE_URL (o SITE_URL) para generar enlaces absolutos en el correo de recuperación.",
          },
          { status: 500 },
        )
      }
    }

    console.error("Error sending Supabase password recovery email", error)
    return NextResponse.json(
      { error: "No se pudo enviar el correo de recuperación" },
      { status: 500 },
    )
  }
}
