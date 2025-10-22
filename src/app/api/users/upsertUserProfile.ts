import { ensureCalendarForUser } from "@/lib/calendars"
import { getSupabaseClient } from "@/lib/supabase"

export type UpsertUserProfileParams = {
  id: string
  name: string
  email: string
  timezone: string
  avatarUrl: string | null
  changedByUserId?: string | null
}

const normalizeNullable = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeWithDefault = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return fallback
}

export async function upsertUserProfile({
  id,
  name,
  email,
  timezone,
  avatarUrl,
  changedByUserId,
}: UpsertUserProfileParams) {
  const supabase = getSupabaseClient()
  const { data: existingProfile, error: existingError } = await supabase
    .from("users")
    .select("id, name, email, timezone, avatar_url")
    .eq("id", id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const payload = {
    id,
    name,
    email,
    timezone,
    avatar_url: avatarUrl,
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("id, name, email, timezone, avatar_url")
    .maybeSingle()

  if (error) {
    throw error
  }

  const profile =
    data ?? ({
      id,
      name,
      email,
      timezone,
      avatar_url: avatarUrl,
    } as const)

  const previousName = normalizeWithDefault(existingProfile?.name, name)
  const previousTimezone = normalizeWithDefault(
    existingProfile?.timezone,
    timezone,
  )
  const previousAvatar = normalizeNullable(existingProfile?.avatar_url)

  const nextName = normalizeWithDefault(profile.name, name)
  const nextTimezone = normalizeWithDefault(profile.timezone, timezone)
  const nextAvatar = normalizeNullable(profile.avatar_url)

  const calendarId = await ensureCalendarForUser(
    String(profile.id),
    nextName,
    nextTimezone,
  )

  const hasChanges = Boolean(
    existingProfile &&
      (previousName !== nextName ||
        previousTimezone !== nextTimezone ||
        previousAvatar !== nextAvatar),
  )

  if (hasChanges) {
    const { error: historyError } = await supabase
      .from("user_profile_history")
      .insert({
        user_id: id,
        changed_by_user_id: changedByUserId ?? id,
        previous_name: previousName || null,
        previous_timezone: previousTimezone || null,
        previous_avatar_url: previousAvatar,
        new_name: nextName || null,
        new_timezone: nextTimezone || null,
        new_avatar_url: nextAvatar,
      })

    if (historyError) {
      console.error(
        "No se pudo registrar el historial de perfil del usuario",
        historyError,
      )
    }
  }

  return {
    id: String(profile.id),
    name: nextName,
    email: String(profile.email ?? ""),
    calendarId,
    avatarUrl: nextAvatar,
    timezone: nextTimezone,
  }
}
