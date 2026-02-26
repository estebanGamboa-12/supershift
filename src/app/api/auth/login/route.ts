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

    void sendLoginEmailsIfConfigured({
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
  const hasBrevo = Boolean(process.env.BREVO_API_KEY)
  const hasResend = Boolean(process.env.RESEND_API_KEY)
  const hasFrom =
    Boolean(process.env.EMAIL_FROM ?? process.env.BREVO_SENDER_EMAIL ?? process.env.RESEND_FROM)
  if ((!hasBrevo && !hasResend) || !hasFrom || !email) {
    if (!email) return
    console.warn(
      "[Planloop] Correos de login no enviados: falta BREVO_API_KEY o RESEND_API_KEY y/o EMAIL_FROM (o BREVO_SENDER_EMAIL).",
    )
    return
  }
  console.log("[Planloop] Envío de correos de login configurado; procesando bienvenida/sesión para", email)

  const appUrl = getAppUrl()
  const nowIso = new Date().toISOString()

  // Solo UN request puede “ganar” y enviar cada correo: hacemos UPDATE con condición y solo si
  // devuelve una fila enviamos. Así no hay carrera entre 10 llamadas simultáneas.

  let effectiveUserId = userId
  const { data: _rowById } = await supabase.from("users").select("id").eq("id", userId).maybeSingle()
  if (!_rowById) {
    const { data: rowByEmail } = await supabase.from("users").select("id").eq("email", email).maybeSingle()
    if (rowByEmail) effectiveUserId = rowByEmail.id
  }

  let shouldSendWelcome = false
  try {
    const { data } = await supabase
      .from("users")
      .update({ welcome_email_sent_at: nowIso })
      .eq("id", effectiveUserId)
      .is("welcome_email_sent_at", null)
      .select("id")
      .maybeSingle()
    shouldSendWelcome = data != null
  } catch {
    // ignore
  }
  if (!shouldSendWelcome) {
    const { data: row } = await supabase
      .from("users")
      .select("welcome_email_sent_at")
      .eq("id", effectiveUserId)
      .maybeSingle()
    if (row?.welcome_email_sent_at == null) {
      shouldSendWelcome = true
      await supabase.from("users").update({ welcome_email_sent_at: nowIso }).eq("id", effectiveUserId)
    }
  }

  const twoHundredHoursAgoMs = Date.now() - 200 * 60 * 60 * 1000
  let shouldSendSession = false
  try {
    const twoHundredHoursAgoIso = new Date(twoHundredHoursAgoMs).toISOString()
    const { data } = await supabase
      .from("users")
      .update({ last_session_email_sent_at: nowIso })
      .eq("id", effectiveUserId)
      .or(`last_session_email_sent_at.is.null,last_session_email_sent_at.lt.${twoHundredHoursAgoIso}`)
      .select("id")
      .maybeSingle()
    shouldSendSession = data != null
  } catch {
    // ignore
  }
  if (!shouldSendSession) {
    const { data: row } = await supabase
      .from("users")
      .select("last_session_email_sent_at")
      .eq("id", effectiveUserId)
      .maybeSingle()
    const last = row?.last_session_email_sent_at
    if (last == null || new Date(last).getTime() < twoHundredHoursAgoMs) {
      shouldSendSession = true
      await supabase.from("users").update({ last_session_email_sent_at: nowIso }).eq("id", effectiveUserId)
    }
  }

  try {
    if (shouldSendWelcome) {
      console.log("[Planloop] Enviando correo de bienvenida a", email)
      const welcome = buildWelcomeEmail({ name, email, appUrl })
      await sendEmail({
        to: email,
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
      })
    }

    if (shouldSendSession) {
      console.log("[Planloop] Enviando correo de sesión iniciada a", email)
      const sessionEmail = buildSessionStartedEmail({
        name,
        email,
        appUrl,
        isFirstTime: shouldSendWelcome,
      })
      await sendEmail({
        to: email,
        subject: sessionEmail.subject,
        html: sessionEmail.html,
        text: sessionEmail.text,
      })
    }
  } catch (err) {
    console.error("[Planloop] Error enviando correos de login/bienvenida (login sigue OK):", err)
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
  isNewUser: boolean
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
    const row = {
      id: userId,
      name: profileName,
      email: profileEmail,
      timezone: profileTimezone,
      avatar_url: profileAvatar,
    }
    const { data: created, error: upsertError } = await supabase
      .from("users")
      .upsert(row, { onConflict: "id" })
      .select("name, email, timezone, avatar_url")
      .maybeSingle()

    if (upsertError) {
      const detail = `${upsertError.code ?? "?"}: ${upsertError.message}`
      console.error("[Planloop] Error upsert perfil Supabase:", detail, upsertError.details)
      // Ya existe por id (trigger) → leer por id
      const { data: byId } = await supabase
        .from("users")
        .select("name, email, timezone, avatar_url")
        .eq("id", userId)
        .maybeSingle()
      if (byId) {
        return {
          name: normalizeText(byId.name) ?? profileName,
          email: normalizeText(byId.email) ?? profileEmail,
          timezone: normalizeText(byId.timezone) ?? profileTimezone ?? "Europe/Madrid",
          avatarUrl: normalizeText(byId.avatar_url) ?? profileAvatar ?? null,
          isNewUser: false,
        }
      }
      // Duplicate email: ya hay una fila con este email pero otro id → sincronizar id con Auth para que créditos/plantillas funcionen
      if (upsertError.code === "23505" && profileEmail) {
        const { data: byEmail } = await supabase
          .from("users")
          .select("id, name, email, timezone, avatar_url")
          .eq("email", profileEmail)
          .maybeSingle()
        if (byEmail) {
          const existingId = (byEmail as { id: string }).id
          if (existingId !== userId) {
            const { error: syncError } = await supabase
              .from("users")
              .update({ id: userId })
              .eq("id", existingId)
            if (syncError) {
              console.warn("[Planloop] No se pudo sincronizar users.id con Auth (ejecuta la migración add_users_id_update_cascade.sql):", syncError.message)
            }
          }
          return {
            name: normalizeText(byEmail.name) ?? profileName,
            email: normalizeText(byEmail.email) ?? profileEmail,
            timezone: normalizeText(byEmail.timezone) ?? profileTimezone ?? "Europe/Madrid",
            avatarUrl: normalizeText(byEmail.avatar_url) ?? profileAvatar ?? null,
            isNewUser: false,
          }
        }
      }
      throw new Error(`No se pudo preparar el perfil del usuario. ${detail}`)
    }

    return {
      name: normalizeText(created?.name) ?? profileName,
      email: normalizeText(created?.email) ?? profileEmail,
      timezone:
        normalizeText(created?.timezone) ?? profileTimezone ?? "Europe/Madrid",
      avatarUrl:
        normalizeText(created?.avatar_url) ?? profileAvatar ?? null,
      isNewUser: true,
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
      isNewUser: false,
    }
  }

  return {
    name: profileName,
    email: profileEmail,
    timezone: profileTimezone,
    avatarUrl: profileAvatar ?? null,
    isNewUser: false,
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
