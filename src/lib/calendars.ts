import { getSupabaseClient } from "@/lib/supabase"

function normalizeCalendarId(value: unknown): number | null {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export async function ensureCalendarForUser(
  userId: number,
  name: string,
  timezone: string,
): Promise<number> {
  const existing = await findCalendarIdForUser(userId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .insert({
      name,
      owner_user_id: userId,
      timezone,
      color: "#38bdf8",
    })
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Error creando calendario en Supabase", error)
    throw new Error("No se pudo crear el calendario del usuario")
  }

  const calendarId = normalizeCalendarId(data?.id)
  if (!calendarId) {
    throw new Error("Supabase no devolvió un identificador de calendario válido")
  }

  return calendarId
}

export async function getOrCreateCalendarForUser(
  userId: number,
): Promise<number | null> {
  const existing = await findCalendarIdForUser(userId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const { data: userRow, error } = await supabase
    .from("users")
    .select("name, timezone")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("Error recuperando usuario en Supabase", error)
    return null
  }

  if (!userRow) {
    return null
  }

  const rawName = userRow.name != null ? String(userRow.name) : ""
  const trimmedName = rawName.trim()
  const timezoneValue =
    userRow.timezone != null ? String(userRow.timezone) : "Europe/Madrid"
  const timezone = timezoneValue.trim().length > 0 ? timezoneValue : "Europe/Madrid"
  const calendarName =
    trimmedName.length > 0
      ? `Calendario de ${trimmedName}`
      : `Calendario usuario ${userId}`

  return ensureCalendarForUser(userId, calendarName, timezone)
}

export async function findCalendarIdForUser(userId: number): Promise<number | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .select("id")
    .eq("owner_user_id", userId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error buscando calendario en Supabase", error)
    return null
  }

  return normalizeCalendarId(data?.id)
}
