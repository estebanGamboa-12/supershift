import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { buildRecoveryCallbackUrl, getSiteUrl } from "@/lib/auth-links"
import { sendEmail } from "@/lib/email"
import { buildPasswordResetCodeEmail } from "@/lib/email-templates"

export const runtime = "nodejs"

const CODE_VALID_MINUTES = 10

type RecoveryPayload = {
  email?: unknown
  redirect?: unknown
  redirectTo?: unknown
  /** Si es true, se envía un código de 6 dígitos por Resend en lugar del enlace de Supabase. */
  useCode?: unknown
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

  const useCode = payload?.useCode === true

  try {
    if (useCode) {
      // Flujo por código: generar código, guardar en BD, enviar por Brevo o Resend (solo texto/código, sin enlace con token).
      const code = String(Math.floor(100_000 + Math.random() * 900_000))
      const supabase = getSupabaseClient()
      const expiresAt = new Date(Date.now() + CODE_VALID_MINUTES * 60 * 1000).toISOString()

      const { error: insertError } = await supabase
        .from("password_reset_codes")
        .insert({ email, code, expires_at: expiresAt })

      if (insertError) {
        console.error("Error insertando código de recuperación", insertError)
        return NextResponse.json(
          {
            error:
              "No se pudo generar el código. Asegúrate de tener la tabla public.password_reset_codes (ver docs/supabase-password-reset-codes.sql).",
          },
          { status: 500 },
        )
      }

      const siteUrl = getSiteUrl()
      const resetUrl = `${siteUrl}/reset-password`
      const { subject, html, text } = buildPasswordResetCodeEmail({
        code,
        resetUrl,
        validMinutes: CODE_VALID_MINUTES,
      })

      try {
        await sendEmail({ to: email, subject, html, text })
      } catch (emailError) {
        console.error("Error enviando correo con código de recuperación", emailError)
        const msg =
          emailError instanceof Error ? emailError.message : "Error enviando el correo."
        if (
          msg.includes("BREVO_API_KEY") ||
          msg.includes("RESEND_API_KEY") ||
          msg.includes("EMAIL_FROM") ||
          msg.includes("remitente")
        ) {
          return NextResponse.json(
            {
              error:
                "Configura BREVO_API_KEY (o RESEND_API_KEY) y EMAIL_FROM para enviar el código por correo.",
            },
            { status: 500 },
          )
        }
        return NextResponse.json(
          { error: "No se pudo enviar el correo con el código. Intenta de nuevo." },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true, useCode: true })
    }

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
