import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { buildEmailChangeEmail } from "@/lib/email-templates"
import { buildAuthCallbackUrl } from "@/lib/auth-links"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EmailChangePayload = {
  accessToken?: unknown
  access_token?: unknown
  newEmail?: unknown
  email?: unknown
  redirect?: unknown
  redirectTo?: unknown
}

function sanitizeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

function getDisplayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}): string {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null

  if (metadataName && metadataName.trim().length > 0) {
    return metadataName
  }

  const email = typeof user.email === "string" ? user.email : ""
  return email ? email.split("@")[0] ?? email : ""
}

function isSupabaseNotAdminError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const status = "status" in error ? Number((error as { status?: number }).status) : null
  const code = "code" in error ? String((error as { code?: string }).code) : null

  if (code && code.toLowerCase() === "not_admin") {
    return true
  }

  return status === 403
}

export async function POST(request: Request) {
  let payload: EmailChangePayload | null = null

  try {
    payload = (await request.json()) as EmailChangePayload
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const accessToken =
    sanitizeToken(payload?.accessToken) ?? sanitizeToken(payload?.access_token)
  const newEmail =
    sanitizeEmail(payload?.newEmail) ?? sanitizeEmail(payload?.email)

  if (!accessToken) {
    return NextResponse.json(
      { error: "El token de acceso de Supabase es obligatorio" },
      { status: 400 },
    )
  }

  if (!newEmail) {
    return NextResponse.json(
      { error: "Proporciona un correo válido para continuar" },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseClient()

    const { data: authData, error: authError } = await supabase.auth.getUser(
      accessToken,
    )

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "No se pudo validar la sesión actual" },
        { status: 401 },
      )
    }

    const authUser = authData.user
    const currentEmail = authUser.email ? String(authUser.email) : ""

    if (!currentEmail) {
      return NextResponse.json(
        {
          error:
            "Supabase no devolvió el correo actual del usuario. Inicia sesión nuevamente e inténtalo de nuevo.",
        },
        { status: 400 },
      )
    }

    if (currentEmail.toLowerCase() === newEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "El nuevo correo debe ser distinto al actual" },
        { status: 400 },
      )
    }

    const redirect =
      resolveRedirect(payload?.redirect) ?? resolveRedirect(payload?.redirectTo)

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "email_change_new",
      email: currentEmail,
      newEmail,
      options: {
        redirectTo: buildAuthCallbackUrl({ redirect }),
      },
    })

    if (error) {
      if (isSupabaseNotAdminError(error)) {
        return NextResponse.json(
          {
            error:
              "La clave usada para Supabase no tiene permisos de administrador. Configura SUPABASE_SERVICE_ROLE_KEY para generar enlaces seguros.",
          },
          { status: 500 },
        )
      }

      throw error
    }

    const linkProperties = data.properties as
      | (typeof data.properties & { new_email?: string | null })
      | null

    const actionLink = linkProperties?.action_link
    const pendingEmail = linkProperties?.new_email ?? newEmail

    if (!actionLink) {
      return NextResponse.json(
        {
          error:
            "Supabase no devolvió un enlace de confirmación para el cambio de correo.",
        },
        { status: 500 },
      )
    }

    const email = buildEmailChangeEmail({
      name: getDisplayName(authUser),
      currentEmail,
      newEmail: pendingEmail,
      actionLink,
    })

    await sendEmail({
      to: pendingEmail,
      ...email,
    })

    return NextResponse.json({
      user: {
        id: String(authUser.id),
        email: currentEmail,
        newEmail: pendingEmail,
      },
      confirmationLink: actionLink,
    })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""

      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Configura la variable SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) para generar enlaces seguros de Supabase.",
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
              "Configura SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) para poder gestionar enlaces de autenticación.",
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
              "Configura NEXT_PUBLIC_SITE_URL (o SITE_URL) para generar enlaces absolutos en los correos.",
          },
          { status: 500 },
        )
      }
    }

    console.error("Error generating Supabase email change link", error)
    return NextResponse.json(
      { error: "No se pudo preparar el cambio de correo" },
      { status: 500 },
    )
  }
}
