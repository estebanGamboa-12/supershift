"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type FormEvent,
} from "react"
import Image from "next/image"
import { formatCompactDate } from "@/lib/formatDate"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import type { TeamDetails, TeamInviteSummary } from "@/types/teams"
import type { UserSummary } from "@/types/users"

type TeamSpotlightProps = {
  upcomingShifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
  currentUser: UserSummary | null
}

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

const memberRoleLabel: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
}

const MEMBER_LIMIT = 5

function formatMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) {
    return "?"
  }
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? "?"
  }
  return `${parts[0]?.charAt(0) ?? ""}${parts.at(-1)?.charAt(0) ?? ""}`
    .toUpperCase()
    .slice(0, 2)
}

const TeamSpotlight: FC<TeamSpotlightProps> = ({
  upcomingShifts,
  shiftTypeLabels,
  currentUser,
}) => {
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [invite, setInvite] = useState<TeamInviteSummary | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const inviteUrl = useMemo(() => {
    if (!invite) {
      return ""
    }
    const base = origin || process.env.NEXT_PUBLIC_APP_URL || ""
    return `${base}/teams/join/${invite.token}`
  }, [invite, origin])

  const refreshTeam = useCallback(
    async (userId: string) => {
      setIsLoadingTeam(true)
      setTeamError(null)
      try {
        const response = await fetch(`/api/teams?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        })

        const data = (await response.json().catch(() => null)) as
          | { team: TeamDetails | null }
          | { error?: string }
          | null

        if (!response.ok) {
          throw new Error(
            (data && "error" in data && typeof data.error === "string"
              ? data.error
              : null) ?? "No se pudo cargar la información del equipo",
          )
        }

        const teamData = data && "team" in data ? data.team : null
        setTeam(teamData ?? null)
        setInvite(teamData?.invite ?? null)
        setTeamName(teamData?.name ?? "")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo cargar el equipo"
        setTeamError(message)
        setTeam(null)
        setInvite(null)
      } finally {
        setIsLoadingTeam(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!currentUser?.id) {
      setTeam(null)
      setInvite(null)
      setTeamError(null)
      return
    }

    void refreshTeam(currentUser.id)
  }, [currentUser?.id, refreshTeam])

  const handleCreateTeam = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!currentUser?.id) {
        return
      }
      if (!teamName.trim()) {
        setTeamError("El nombre del equipo es obligatorio")
        return
      }

      setIsCreatingTeam(true)
      setTeamError(null)

      try {
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: currentUser.id, name: teamName }),
        })

        const data = (await response.json().catch(() => null)) as
          | { team: TeamDetails }
          | { error?: string }
          | null

        if (!response.ok || !data || !("team" in data)) {
          throw new Error(
            (data && "error" in data && typeof data.error === "string"
              ? data.error
              : null) ?? "No se pudo crear el equipo",
          )
        }

        setTeam(data.team)
        setInvite(data.team.invite ?? null)
        setTeamError(null)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo crear el equipo"
        setTeamError(message)
      } finally {
        setIsCreatingTeam(false)
      }
    },
    [currentUser?.id, teamName],
  )

  const handleGenerateInvite = useCallback(async () => {
    if (!currentUser?.id || !team) {
      return
    }

    setIsGeneratingInvite(true)
    setInviteError(null)

    try {
      const response = await fetch(
        `/api/teams/${encodeURIComponent(team.id)}/invite-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        },
      )

      const data = (await response.json().catch(() => null)) as
        | { invite: TeamInviteSummary }
        | { error?: string }
        | null

      if (!response.ok || !data || !("invite" in data)) {
        throw new Error(
          (data && "error" in data && typeof data.error === "string"
            ? data.error
            : null) ?? "No se pudo generar el enlace",
        )
      }

      setInvite(data.invite)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo generar el enlace"
      setInviteError(message)
    } finally {
      setIsGeneratingInvite(false)
    }
  }, [currentUser?.id, team])

  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) {
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
        setCopyState("copied")
        setTimeout(() => setCopyState("idle"), 3000)
        return
      }
    } catch (error) {
      console.error("No se pudo copiar el enlace", error)
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 3000)
      return
    }

    try {
      const textarea = document.createElement("textarea")
      textarea.value = inviteUrl
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 3000)
    } catch (error) {
      console.error("No se pudo copiar el enlace", error)
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 3000)
    }
  }, [inviteUrl])

  const spotsLeft = useMemo(() => {
    if (!team) {
      return MEMBER_LIMIT
    }
    return Math.max(0, team.memberLimit - team.members.length)
  }, [team])

  const memberList = useMemo(() => team?.members ?? [], [team])

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-6 text-white shadow-xl shadow-blue-500/10 backdrop-blur">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-slate-900" />
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-600 border-2 border-slate-900" />
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 border-2 border-slate-900" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Equipo conectado
          </p>
        </div>
        <h3 className="text-2xl font-semibold">Coordina a tu escuadrón</h3>
        <p className="text-sm text-white/60">
          Sincroniza horarios, comparte contexto y mantén a todo el equipo alineado incluso desde el móvil.
        </p>
      </header>

      {teamError && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {teamError}
        </p>
      )}

      {/* Estado del equipo */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        {isLoadingTeam ? (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-ping rounded-full bg-blue-400" />
            <p className="text-sm text-white/60">Cargando tu equipo...</p>
          </div>
        ) : !currentUser ? (
          <p className="text-sm text-white/70">
            Inicia sesión para crear un equipo y compartir enlaces de invitación.
          </p>
        ) : team ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-200/70">
                  Equipo activo
                </p>
                <h4 className="text-xl font-semibold">{team.name}</h4>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  {team.members.length} / {team.memberLimit} miembros
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                    spotsLeft > 0
                      ? "border-blue-400/40 bg-blue-500/10 text-blue-100"
                      : "border-red-400/40 bg-red-500/10 text-red-100"
                  }`}
                >
                  {spotsLeft > 0
                    ? `${spotsLeft} plazas disponibles`
                    : "Equipo completo"}
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              {memberList.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt={member.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full border border-white/20 object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold">
                        {formatMemberInitials(member.name)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-xs text-white/60">
                        {memberRoleLabel[member.role] ?? "Miembro"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-white/50">
                    Desde {formatCompactDate(new Date(member.joinedAt))}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleCreateTeam}>
            <div>
              <p className="text-sm text-white/70">
                Crea tu equipo para compartir turnos y coordinar invitaciones.
              </p>
              <p className="text-xs text-white/50">
                Máximo de {MEMBER_LIMIT} personas por equipo.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60" htmlFor="team-name">
                Nombre del equipo
              </label>
              <input
                id="team-name"
                name="team-name"
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Ej: Escuadrón nocturno"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingTeam}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingTeam ? "Creando equipo..." : "Crear equipo"}
            </button>
          </form>
        )}
      </div>

      {/* Próximos turnos */}
      <div className="space-y-3">
        {upcomingShifts.length > 0 ? (
          <ul className="space-y-3">
            {upcomingShifts.slice(0, 4).map((shift) => (
              <li
                key={shift.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Próximo turno</p>
                  <p className="font-semibold text-white">
                    {formatCompactDate(new Date(shift.date))}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    color: shift.color ?? typeColor[shift.type],
                    backgroundColor: `${(shift.color ?? typeColor[shift.type])}1a`,
                    borderColor: `${(shift.color ?? typeColor[shift.type])}33`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: shift.color ?? typeColor[shift.type] }}
                  />
                  {shift.label ?? shiftTypeLabels[shift.type] ?? shift.type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/30 px-4 py-5 text-sm text-white/60">
            Cuando agregues turnos, aquí aparecerán los próximos hitos compartidos con tu equipo.
          </p>
        )}
      </div>

      {/* CTA Invitar */}
      <div className="space-y-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
        <p className="font-semibold">Invita a tu equipo</p>
        <p className="mt-1 text-blue-100/80">
          Genera un enlace compartido y distribúyelo para sumar hasta {MEMBER_LIMIT} personas.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGenerateInvite}
            disabled={!team || isGeneratingInvite || spotsLeft <= 0}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!team
              ? "Crea un equipo para generar enlaces"
              : spotsLeft <= 0
                ? "Sin plazas disponibles"
                : isGeneratingInvite
                  ? "Generando enlace..."
                  : "Generar enlace compartido"}
          </button>
          {inviteError && (
            <p className="text-xs text-red-200">{inviteError}</p>
          )}
        </div>

        {invite && inviteUrl && (
          <div className="space-y-2 rounded-xl border border-blue-400/30 bg-slate-950/40 p-3 text-xs">
            <p className="font-semibold text-blue-100">Enlace listo</p>
            <p className="break-all text-white/90">{inviteUrl}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-blue-300/60"
              >
                Copiar enlace
              </button>
              <span className="text-[11px] text-blue-100/70">
                Usos {invite.uses}/{invite.maxUses || spotsLeft}
              </span>
              {copyState === "copied" && (
                <span className="text-[11px] text-emerald-200">Copiado ✓</span>
              )}
              {copyState === "error" && (
                <span className="text-[11px] text-red-200">
                  No se pudo copiar automáticamente
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default TeamSpotlight
