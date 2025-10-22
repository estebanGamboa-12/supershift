export type UserSummary = {
  id: string
  name: string
  email: string
  calendarId: number | null
  avatarUrl: string | null
  timezone: string
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
