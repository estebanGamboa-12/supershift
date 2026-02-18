import { getSupabaseClient } from "@/lib/supabase"

function normalizeCalendarId(value: unknown): number | null {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function normalizeUserId(userId: string): string {
  const trimmed = userId.trim()
  if (!trimmed) {
    throw new Error("El identificador del usuario no es válido")
  }
  return trimmed
}

function normalizeTeamId(teamId: string): string {
  const trimmed = teamId.trim()
  if (!trimmed) {
    throw new Error("El identificador del equipo no es válido")
  }
  return trimmed
}

export async function ensureCalendarForUser(
  userId: string,
  name: string,
  timezone: string,
): Promise<number> {
  const normalizedUserId = normalizeUserId(userId)
  const existing = await findCalendarIdForUser(normalizedUserId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .insert({
      name,
      owner_user_id: normalizedUserId,
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
  userId: string,
): Promise<number | null> {
  const normalizedUserId = normalizeUserId(userId)
  const existing = await findCalendarIdForUser(normalizedUserId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const { data: userRow, error } = await supabase
    .from("users")
    .select("name, timezone")
    .eq("id", normalizedUserId)
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
      : `Calendario usuario ${normalizedUserId}`

  return ensureCalendarForUser(normalizedUserId, calendarName, timezone)
}

export async function findCalendarIdForUser(
  userId: string,
): Promise<number | null> {
  const normalizedUserId = normalizeUserId(userId)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .select("id")
    .eq("owner_user_id", normalizedUserId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error buscando calendario en Supabase", error)
    return null
  }

  return normalizeCalendarId(data?.id)
}

export async function findCalendarIdForTeam(
  teamId: string,
): Promise<number | null> {
  const normalizedTeamId = normalizeTeamId(teamId)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .select("id")
    .eq("team_id", normalizedTeamId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error buscando calendario de equipo en Supabase", error)
    return null
  }

  return normalizeCalendarId(data?.id)
}

export async function ensureCalendarForTeam(
  teamId: string,
  name: string,
  timezone: string,
): Promise<number> {
  const normalizedTeamId = normalizeTeamId(teamId)
  const existing = await findCalendarIdForTeam(normalizedTeamId)
  if (existing) {
    return existing
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("calendars")
    .insert({
      name,
      team_id: normalizedTeamId,
      timezone,
      color: "#22c55e",
    })
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Error creando calendario de equipo en Supabase", error)
    throw new Error("No se pudo crear el calendario del equipo")
  }

  const calendarId = normalizeCalendarId(data?.id)
  if (!calendarId) {
    throw new Error("Supabase no devolvió un identificador de calendario válido")
  }

  return calendarId
}

