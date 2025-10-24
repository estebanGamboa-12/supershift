import type { PostgrestSingleResponse } from "@supabase/supabase-js"

import { getSupabaseClient } from "@/lib/supabase"
import type {
  TeamDetails,
  TeamInviteSummary,
  TeamMemberSummary,
} from "@/types/teams"

const TEAM_MEMBER_LIMIT = 5

type SupabaseAdminClient = ReturnType<typeof getSupabaseClient>

type TeamRow = {
  id: string
  name: string
  owner_user_id: string
}

type TeamMemberRow = {
  team_id: string
  user_id: string
  role: string
  joined_at: string
}

type UserRow = {
  id: string
  name: string | null
  avatar_url: string | null
}

type TeamInviteRow = {
  token: string
  max_uses: number
  uses: number
  created_at: string
  expires_at: string | null
}

function mapInviteRow(row: TeamInviteRow | null): TeamInviteSummary | null {
  if (!row) {
    return null
  }

  return {
    token: String(row.token),
    maxUses: Number(row.max_uses ?? 0),
    uses: Number(row.uses ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }
}

function mapMemberRow(
  row: TeamMemberRow,
  userMap: Map<string, UserRow>,
): TeamMemberSummary {
  const user = userMap.get(String(row.user_id))

  return {
    id: String(row.user_id),
    name: user?.name ? String(user.name) : "Miembro del equipo",
    avatarUrl: user?.avatar_url ? String(user.avatar_url) : null,
    role:
      row.role === "owner" || row.role === "admin"
        ? (row.role as TeamMemberSummary["role"])
        : "member",
    joinedAt: String(row.joined_at ?? new Date().toISOString()),
  }
}

function isInviteActive(row: TeamInviteRow | null): boolean {
  if (!row) {
    return false
  }

  const uses = Number(row.uses ?? 0)
  const maxUses = Number(row.max_uses ?? 0)

  if (Number.isFinite(maxUses) && maxUses > 0 && uses >= maxUses) {
    return false
  }

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at)
    if (Number.isNaN(expiresAt.getTime())) {
      return true
    }
    return expiresAt.getTime() > Date.now()
  }

  return true
}

export async function getTeamDetails(
  supabase: SupabaseAdminClient,
  teamId: string,
): Promise<TeamDetails | null> {
  const { data: teamRow, error: teamError } = await supabase
    .from("teams")
    .select("id, name, owner_user_id")
    .eq("id", teamId)
    .maybeSingle()

  if (teamError) {
    throw teamError
  }

  if (!teamRow) {
    return null
  }

  const normalizedTeam: TeamRow = {
    id: String(teamRow.id),
    name: String(teamRow.name ?? ""),
    owner_user_id: String(teamRow.owner_user_id ?? ""),
  }

  const { data: memberRows, error: membersError } = await supabase
    .from("team_members")
    .select("team_id, user_id, role, joined_at")
    .eq("team_id", normalizedTeam.id)
    .order("joined_at", { ascending: true })

  if (membersError) {
    throw membersError
  }

  const memberList = (memberRows ?? []).map((row) => ({
    team_id: String(row.team_id),
    user_id: String(row.user_id),
    role: String(row.role ?? "member"),
    joined_at: String(row.joined_at ?? new Date().toISOString()),
  }))

  const memberIds = memberList.map((row) => String(row.user_id))
  const userMap = new Map<string, UserRow>()

  if (memberIds.length > 0) {
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", memberIds)

    if (usersError) {
      throw usersError
    }

    for (const user of userRows ?? []) {
      userMap.set(String(user.id), {
        id: String(user.id),
        name: user.name != null ? String(user.name) : null,
        avatar_url:
          user.avatar_url != null ? String(user.avatar_url) : null,
      })
    }
  }

  const members = memberList.map((row) => mapMemberRow(row, userMap))

  const { data: inviteRows, error: inviteError } = await supabase
    .from("team_invites")
    .select("token, max_uses, uses, created_at, expires_at")
    .eq("team_id", normalizedTeam.id)
    .order("created_at", { ascending: false })
    .limit(5)

  if (inviteError) {
    // Consider the possibility that the table does not exist yet.
    const missingTable =
      typeof inviteError === "object" &&
      inviteError !== null &&
      "code" in inviteError &&
      String((inviteError as { code?: string }).code ?? "").includes("42P01")

    if (!missingTable) {
      throw inviteError
    }
  }

  let activeInvite: TeamInviteSummary | null = null

  for (const invite of inviteRows ?? []) {
    if (isInviteActive(invite)) {
      activeInvite = mapInviteRow(invite)
      break
    }
  }

  return {
    id: normalizedTeam.id,
    name: normalizedTeam.name,
    ownerUserId: normalizedTeam.owner_user_id,
    memberLimit: TEAM_MEMBER_LIMIT,
    members,
    invite: activeInvite,
  }
}

export async function findMembershipForUser(
  supabase: SupabaseAdminClient,
  userId: string,
): Promise<PostgrestSingleResponse<TeamMemberRow | null>> {
  return supabase
    .from("team_members")
    .select("team_id, user_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
}

export async function countTeamMembers(
  supabase: SupabaseAdminClient,
  teamId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", teamId)

  if (error) {
    throw error
  }

  return typeof count === "number" ? count : 0
}

export function getTeamMemberLimit(): number {
  return TEAM_MEMBER_LIMIT
}
