export type UserSummary = {
  id: string
  name: string
  email: string
  calendarId: number | null
  avatarUrl: string | null
  timezone: string
  /** Si el usuario ya completó o saltó el tour de bienvenida (persistido en Supabase). */
  onboardingCompleted?: boolean
}

export type UserProfileHistoryEntry = {
  id: string
  changedAt: string
  previousName: string | null
  previousAvatarUrl: string | null
  previousTimezone: string | null
  newName: string | null
  newAvatarUrl: string | null
  newTimezone: string | null
}
