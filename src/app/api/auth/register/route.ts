import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseClient } from "@/lib/supabase"
import { ensureCalendarForUser } from "@/lib/calendars"
import { sendEmail } from "@/lib/email"
import { buildVerificationEmail } from "@/lib/email-templates"
import { buildAuthCallbackUrl } from "@/lib/auth-links"

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

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      "Supabase URL no configurada. Define SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL",
    )
  }
  return url
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      "Supabase anon key no configurada. Define SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }

  return key
}

function createSupabaseAnonServerClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
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

async function registerUsingAdminClient({
  name,
  email,
  password,
  timezone,
}: {
  name: string
  email: string
  password: string
  timezone: string
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      redirectTo: buildAuthCallbackUrl(),
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

  return { user: userProfile }
}

async function registerUsingSignUp({
  name,
  email,
  password,
  timezone,
}: {
  name: string
  email: string
  password: string
  timezone: string
}) {
  const supabase = createSupabaseAnonServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: buildAuthCallbackUrl(),
    },
  })

  if (error) {
    throw error
  }

  const user = data.user

  if (!user?.id) {
    throw new Error("Supabase no devolvió un identificador de usuario válido")
  }

  const userProfile = await createUserProfile({
    id: String(user.id),
    name,
    email,
    timezone,
  })

  return { user: userProfile }
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

  try {
    const shouldUseAdminFlow = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (shouldUseAdminFlow) {
      try {
        const response = await registerUsingAdminClient({
          name,
          email,
          password,
          timezone,
        })

        return NextResponse.json(response, { status: 201 })
      } catch (error) {
        if (!isSupabaseNotAdminError(error)) {
          throw error
        }
        console.warn(
          "Fallo el flujo admin de registro en Supabase. Reintentando con signUp estándar.",
          error,
        )
      }
    }

    const response = await registerUsingSignUp({
      name,
      email,
      password,
      timezone,
    })

    return NextResponse.json(response, { status: 201 })
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
      if (message.includes("Supabase URL no configurada")) {
        return NextResponse.json(
          {
            error:
              "Define SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL para conectar con tu proyecto de Supabase.",
          },
          { status: 500 },
        )
      }
      if (message.includes("Supabase anon key no configurada")) {
        return NextResponse.json(
          {
            error:
              "Define SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY para permitir registros sin la clave service_role.",
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
