import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { ensureCalendarForUser } from "@/lib/calendars"
import { sendEmail } from "@/lib/email"
import { buildVerificationEmail } from "@/lib/email-templates"

export const runtime = "nodejs"

type RegisterPayload = {
  name?: unknown
  email?: unknown
  password?: unknown
  timezone?: unknown
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getSiteUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!siteUrl) {
    throw new Error(
      "Configura NEXT_PUBLIC_SITE_URL (o SITE_URL) para generar enlaces de verificación.",
    )
  }

  return siteUrl.replace(/\/$/, "")
}

function buildRedirectUrl(): string {
  const siteUrl = getSiteUrl()
  return `${siteUrl}/auth/callback`
}

async function createUserProfile({
  id,
  name,
  email,
  timezone,
}: {
  id: string
  name: string
  email: string
  timezone: string
}) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("users")
    .upsert(
      { id, name, email, timezone },
      { onConflict: "id" },
    )
    .select("id, name, email, timezone")
    .maybeSingle()

  if (error) {
    throw error
  }

  const fallbackName = name || email.split("@")[0] || ""
  const profile = data ?? { id, name: fallbackName, email, timezone }
  const calendarId = await ensureCalendarForUser(
    profile.id,
    profile.name ?? fallbackName,
    profile.timezone ?? timezone,
  )

  return {
    id: String(profile.id),
    name: String(profile.name ?? fallbackName),
    email: String(profile.email ?? email ?? ""),
    calendarId,
  }
}

export async function POST(request: Request) {
  let payload: RegisterPayload | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const name = sanitizeString(payload?.name) ?? ""
  const rawEmail = sanitizeString(payload?.email)
  const email = rawEmail ? rawEmail.toLowerCase() : null
  const password = sanitizeString(payload?.password)
  const timezone = sanitizeString(payload?.timezone) ?? "Europe/Madrid"

  if (!email || !password) {
    return NextResponse.json(
      { error: "Correo y contraseña son obligatorios" },
      { status: 400 },
    )
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Define SUPABASE_SERVICE_ROLE_KEY con la clave service_role de Supabase para permitir registros.",
      },
      { status: 500 },
    )
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        redirectTo: buildRedirectUrl(),
      },
    })

    if (error) {
      throw error
    }

    const user = data.user
    const actionLink = data.properties?.action_link

    if (!user?.id || !actionLink) {
      throw new Error(
        "Supabase no devolvió la información necesaria para completar el registro.",
      )
    }

    const userProfile = await createUserProfile({
      id: String(user.id),
      name,
      email,
      timezone,
    })

    const { subject, html, text } = buildVerificationEmail({
      name,
      email,
      actionLink,
    })

    await sendEmail({
      to: email,
      subject,
      html,
      text,
    })

    return NextResponse.json({ user: userProfile }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message ?? ""
      if (message.includes("Resend")) {
        return NextResponse.json(
          {
            error:
              "No se pudo enviar el correo de verificación. Revisa la configuración de RESEND_API_KEY y EMAIL_FROM.",
          },
          { status: 502 },
        )
      }
      if (message.includes("Configura NEXT_PUBLIC_SITE_URL")) {
        return NextResponse.json(
          {
            error:
              "Define la variable NEXT_PUBLIC_SITE_URL (o SITE_URL) para generar el enlace de verificación.",
          },
          { status: 500 },
        )
      }
      if (message.includes("RESEND_API_KEY") || message.includes("EMAIL_FROM")) {
        return NextResponse.json(
          {
            error:
              "Faltan credenciales para enviar correos. Añade RESEND_API_KEY y EMAIL_FROM al entorno de ejecución.",
          },
          { status: 500 },
        )
      }
      if (
        message.includes("service_role") ||
        message.includes("service role key") ||
        message.includes("admin api requires")
      ) {
        return NextResponse.json(
          {
            error:
              "La clave service_role de Supabase es obligatoria. Verifica SUPABASE_SERVICE_ROLE_KEY en tu configuración.",
          },
          { status: 500 },
        )
      }
      const normalized = message.toLowerCase()
      if (
        normalized.includes("user already registered") ||
        normalized.includes("already exists") ||
        normalized.includes("duplicate key")
      ) {
        return NextResponse.json(
          { error: "El usuario ya está registrado" },
          { status: 409 },
        )
      }
    }

    if (error && typeof error === "object" && "status" in error) {
      const status = Number((error as { status?: number }).status)
      if (status === 429) {
        return NextResponse.json(
          {
            error:
              "Se han realizado demasiadas solicitudes de registro. Espera unos minutos antes de reintentar.",
          },
          { status: 429 },
        )
      }
    }

    console.error("Error al registrar al usuario", error)
    return NextResponse.json(
      { error: "No se pudo completar el registro" },
      { status: 500 },
    )
  }
}
