import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { getOrCreateCalendarForUser } from "@/lib/calendars"
import { sendEmail } from "@/lib/email"
import { buildWelcomeEmail, buildSessionStartedEmail } from "@/lib/email-templates"

type AuthPayload = {
  accessToken?: unknown
  access_token?: unknown
}

export const runtime = "nodejs"

export async function POST(request: Request) {
  let payload: AuthPayload | null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 }
    )
  }

  const accessToken =
    typeof payload?.accessToken === "string"
      ? payload.accessToken
      : typeof payload?.access_token === "string"
        ? payload.access_token
        : ""

  if (!accessToken) {
    return NextResponse.json(
      { error: "El token de acceso de Supabase es obligatorio" },
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
        { error: "No se pudo validar la sesión con Supabase" },
        { status: 401 },
      )
    }

    const authUser = authData.user
    const userId = authUser.id

    const preferredName = extractPreferredName(authUser)
    const normalizedEmail = authUser.email ? String(authUser.email) : ""
    const timezoneMetadata = extractTimezone(authUser)

    const avatarMetadata = extractAvatarUrl(authUser)

    const profile = await ensureUserProfile({
      supabase,
      userId,
      fallbackName: preferredName,
      fallbackEmail: normalizedEmail,
      fallbackTimezone: timezoneMetadata,
      fallbackAvatarUrl: avatarMetadata,
    })

    const calendarId = await getOrCreateCalendarForUser(userId)

    if (!calendarId) {
      return NextResponse.json(
        {
          error:
            "No se encontró un calendario asociado al usuario. Vuelve a intentarlo más tarde.",
        },
        { status: 500 },
      )
    }

    await sendLoginEmailsIfConfigured({
      supabase,
      userId,
      name: profile.name,
      email: profile.email,
    })

    return NextResponse.json({
      user: {
        id: userId,
        name: profile.name,
        email: profile.email,
        calendarId,
        avatarUrl: profile.avatarUrl,
        timezone: profile.timezone,
      },
    })
  } catch (error) {
    console.error("Error during login", error)
    return NextResponse.json(
      { error: "No se pudo iniciar sesión" },
      { status: 500 },
    )
  }
}

type SupabaseAdmin = ReturnType<typeof getSupabaseClient>

function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://app.planloop.app"
  return String(url).replace(/\/$/, "")
}

async function sendLoginEmailsIfConfigured({
  supabase,
  userId,
  name,
  email,
}: {
  supabase: SupabaseAdmin
  userId: string
  name: string
  email: string
}): Promise<void> {
  const hasEmailConfig =
    (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) &&
    (process.env.EMAIL_FROM ?? process.env.BREVO_SENDER_EMAIL ?? process.env.RESEND_FROM)
  if (!hasEmailConfig || !email) {
    return
  }

  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle()

    const welcomeAlreadySent = userRow?.welcome_email_sent_at != null
    const appUrl = getAppUrl()

    if (!welcomeAlreadySent) {
      const welcome = buildWelcomeEmail({ name, email, appUrl })
      await sendEmail({
        to: email,
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
      })
      await supabase
        .from("users")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("id", userId)
    }

    const sessionEmail = buildSessionStartedEmail({
      name,
      email,
      appUrl,
      isFirstTime: !welcomeAlreadySent,
    })
    await sendEmail({
      to: email,
      subject: sessionEmail.subject,
      html: sessionEmail.html,
      text: sessionEmail.text,
    })
  } catch (err) {
    console.error("Error enviando correos de login/bienvenida (login sigue OK):", err)
  }
}

type EnsureProfileParams = {
  supabase: SupabaseAdmin
  userId: string
  fallbackName: string
  fallbackEmail: string
  fallbackTimezone: string
  fallbackAvatarUrl: string | null
}

async function ensureUserProfile({
  supabase,
  userId,
  fallbackName,
  fallbackEmail,
  fallbackTimezone,
  fallbackAvatarUrl,
}: EnsureProfileParams): Promise<{
  name: string
  email: string
  timezone: string
  avatarUrl: string | null
}> {
  const { data: existingProfile, error: profileError } = await supabase
    .from("users")
    .select("id, name, email, timezone, avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    console.error("Error leyendo el perfil de usuario en Supabase", profileError)
    throw new Error("No se pudo recuperar el perfil del usuario")
  }

  let profileName = normalizeText(existingProfile?.name) ?? fallbackName
  const profileEmail = normalizeText(existingProfile?.email) ?? fallbackEmail
  const profileTimezone =
    normalizeText(existingProfile?.timezone) ?? fallbackTimezone ?? "Europe/Madrid"
  const profileAvatar =
    normalizeText(existingProfile?.avatar_url) ?? fallbackAvatarUrl

  if (!profileEmail) {
    throw new Error("Supabase no devolvió un correo electrónico válido")
  }

  if (!profileName) {
    profileName = deriveNameFromEmail(profileEmail)
  }

  if (!existingProfile) {
    const { data: created, error: createError } = await supabase
      .from("users")
      .insert({
        id: userId,
        name: profileName,
        email: profileEmail,
        timezone: profileTimezone,
        avatar_url: profileAvatar,
      })
      .select("name, email, timezone, avatar_url")
      .maybeSingle()

    if (createError) {
      console.error("Error creando el perfil de usuario en Supabase", createError)
      throw new Error("No se pudo preparar el perfil del usuario")
    }

    return {
      name: normalizeText(created?.name) ?? profileName,
      email: normalizeText(created?.email) ?? profileEmail,
      timezone:
        normalizeText(created?.timezone) ?? profileTimezone ?? "Europe/Madrid",
      avatarUrl:
        normalizeText(created?.avatar_url) ?? profileAvatar ?? null,
    }
  }

  const updates: Record<string, string> = {}

  if (profileName !== normalizeText(existingProfile.name)) {
    updates.name = profileName
  }
  if (profileEmail !== normalizeText(existingProfile.email)) {
    updates.email = profileEmail
  }
  if (profileTimezone !== normalizeText(existingProfile.timezone)) {
    updates.timezone = profileTimezone
  }
  if (profileAvatar && profileAvatar !== normalizeText(existingProfile.avatar_url)) {
    updates.avatar_url = profileAvatar
  }

  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("name, email, timezone, avatar_url")
      .maybeSingle()

    if (updateError) {
      console.error("Error actualizando el perfil de usuario en Supabase", updateError)
      throw new Error("No se pudo actualizar el perfil del usuario")
    }

    return {
      name: normalizeText(updated?.name) ?? profileName,
      email: normalizeText(updated?.email) ?? profileEmail,
      timezone:
        normalizeText(updated?.timezone) ?? profileTimezone ?? "Europe/Madrid",
      avatarUrl:
        normalizeText(updated?.avatar_url) ?? profileAvatar ?? null,
    }
  }

  return {
    name: profileName,
    email: profileEmail,
    timezone: profileTimezone,
    avatarUrl: profileAvatar ?? null,
  }
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

type AuthUser = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

function extractPreferredName(user: AuthUser): string {
  const metadata = user.user_metadata ?? {}
  const metadataNameCandidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
  ]

  for (const candidate of metadataNameCandidates) {
    const normalized = normalizeText(candidate)
    if (normalized) {
      return normalized
    }
  }

  const email = normalizeText(user.email)
  return email ? deriveNameFromEmail(email) : ""
}

function extractTimezone(user: AuthUser): string {
  const metadata = user.user_metadata ?? {}
  const timezone = normalizeText(
    metadata.timezone ?? metadata.time_zone ?? metadata.tz,
  )

  return timezone ?? "Europe/Madrid"
}

function extractAvatarUrl(user: AuthUser): string | null {
  const metadata = user.user_metadata ?? {}
  const candidates = [
    metadata.avatar_url,
    metadata.avatar,
    metadata.picture,
    metadata.profile_image,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (normalized) {
      return normalized
    }
  }

  return null
}

function deriveNameFromEmail(email: string): string {
  const [localPart] = email.split("@")
  return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : email
}
