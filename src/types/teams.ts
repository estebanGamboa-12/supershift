export type TeamRole = "owner" | "admin" | "member"

export type TeamMemberSummary = {
  id: string
  name: string
  email: string
  timezone: string | null
  avatarUrl: string | null
  role: TeamRole
  joinedAt: string
}

export type TeamInviteSummary = {
  token: string
  maxUses: number
  uses: number
  createdAt: string
  expiresAt: string | null
}

export type TeamDetails = {
  id: string
  name: string
  ownerUserId: string
  memberLimit: number
  members: TeamMemberSummary[]
  invite: TeamInviteSummary | null
}
