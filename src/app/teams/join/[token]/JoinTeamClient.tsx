"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { TeamDetails } from "@/types/teams"

const MEMBER_LIMIT = 5

type JoinTeamClientProps = {
  token: string
}

type InvitePreview = {
  team: { id: string; name: string }
  invite: { token: string; maxUses: number; uses: number; expiresAt: string | null }
  remainingSpots: number
  memberLimit: number
}

type JoinResponse = {
  team: TeamDetails
}

type ApiError = { error?: string | null }

type JoinState = "idle" | "loading" | "success"

const JoinTeamClient: FC<JoinTeamClientProps> = ({ token }) => {
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null)
  const [isLoadingInvite, setIsLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [joinState, setJoinState] = useState<JoinState>("idle")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinedTeam, setJoinedTeam] = useState<TeamDetails | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      const user = data.user
      setSessionUserId(user?.id ?? null)
      setSessionEmail(user?.email ?? null)
    } catch (error) {
      console.error("No se pudo comprobar la sesión actual", error)
      setSessionUserId(null)
      setSessionEmail(null)
    }
  }, [supabase])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    let isMounted = true

    const loadInvite = async () => {
      setIsLoadingInvite(true)
      setInviteError(null)
      try {
        const response = await fetch(`/api/teams/invite/${encodeURIComponent(token)}`, {
          cache: "no-store",
        })

        const data = (await response.json().catch(() => null)) as
          | InvitePreview
          | ApiError
          | null

        if (!isMounted) {
          return
        }

        if (!response.ok || !data || !("team" in data)) {
          throw new Error(
            (data && "error" in data && typeof data.error === "string"
              ? data.error
              : null) ?? "El enlace no es válido",
          )
        }

        setInvitePreview(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo validar el enlace"
        setInviteError(message)
        setInvitePreview(null)
      } finally {
        if (isMounted) {
          setIsLoadingInvite(false)
        }
      }
    }

    void loadInvite()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleJoinTeam = useCallback(async () => {
    if (!invitePreview) {
      return
    }

    if (!sessionUserId) {
      setJoinError("Debes iniciar sesión para unirte al equipo.")
      return
    }

    setJoinError(null)
    setJoinState("loading")

    try {
      const response = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: sessionUserId }),
      })

      const data = (await response.json().catch(() => null)) as JoinResponse | ApiError | null

      if (!response.ok || !data || !("team" in data)) {
        throw new Error(
          (data && "error" in data && typeof data.error === "string"
            ? data.error
            : null) ?? "No se pudo unir al equipo",
        )
      }

      setJoinedTeam(data.team)
      setJoinState("success")
      setInvitePreview(null)
      setTimeout(() => {
        router.push("/")
      }, 1800)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo unir al equipo"
      setJoinError(message)
      setJoinState("idle")
    }
  }, [invitePreview, router, sessionUserId, token])

  const spotsLeft = invitePreview
    ? Math.max(0, invitePreview.remainingSpots)
    : MEMBER_LIMIT

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-blue-500/20">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
              Invitación a equipo
            </p>
            <h1 className="text-3xl font-semibold">
              {invitePreview ? invitePreview.team.name : "Unirse a un equipo"}
            </h1>
            <p className="text-sm text-white/70">
              Acepta la invitación y coordina turnos con tu equipo de forma instantánea.
            </p>
          </header>

          {isLoadingInvite ? (
            <p className="text-sm text-white/60">Comprobando el enlace de invitación...</p>
          ) : inviteError ? (
            <div className="space-y-3">
              <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {inviteError}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-400/40 hover:text-blue-100"
              >
                Volver al inicio
              </Link>
            </div>
          ) : invitePreview ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white/70">
                <p>
                  Quedan <strong>{spotsLeft}</strong> plazas disponibles de un máximo de {invitePreview.memberLimit} integrantes.
                </p>
                <p className="mt-2 text-white/60">
                  Este enlace es personal y puede dejar de estar disponible cuando se alcance el límite de miembros.
                </p>
              </div>

              {sessionUserId ? (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <p className="font-semibold">Sesión actual</p>
                  <p>{sessionEmail ?? "Cuenta sin correo asociado"}</p>
                  <button
                    type="button"
                    onClick={handleJoinTeam}
                    disabled={joinState === "loading" || spotsLeft <= 0}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {spotsLeft <= 0
                      ? "Equipo completo"
                      : joinState === "loading"
                        ? "Uniéndote al equipo..."
                        : "Unirme al equipo"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p>
                    Necesitas iniciar sesión en Supershift para aceptar la invitación.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/auth"
                      className="inline-flex items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-blue-300/60"
                    >
                      Iniciar sesión
                    </Link>
                    <button
                      type="button"
                      onClick={() => void refreshSession()}
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-blue-400/40 hover:text-blue-100"
                    >
                      Ya inicié sesión
                    </button>
                  </div>
                </div>
              )}

              {joinError && (
                <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {joinError}
                </p>
              )}

              {joinState === "success" && joinedTeam && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  ¡Ya formas parte de {joinedTeam.name}! Te llevaremos al panel principal en un momento.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default JoinTeamClient
