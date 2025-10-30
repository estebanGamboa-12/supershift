"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import { exchangeAccessToken } from "@/lib/auth-client"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { UserSummary } from "@/types/users"

type ApiUser = Partial<UserSummary> & {
  userId?: unknown
  calendar_id?: unknown
  avatar_url?: unknown
}

type ApiUsersResponse = {
  users?: ApiUser[]
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  if (typeof value === "bigint" && value > 0n) {
    return Number(value)
  }

  return null
}

function toUserId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === "bigint" && value > 0n) {
    const text = value.toString()
    return text.length > 0 ? text : null
  }

  return null
}

function sanitizeUserSummary(value: ApiUser | null | undefined): UserSummary | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const id =
    toUserId(value.id) ?? toUserId(value.userId) ?? toUserId((value as { user_id?: unknown }).user_id)

  if (!id) {
    return null
  }

  const calendarCandidate =
    value.calendarId ?? value.calendar_id ?? (value as { calendar_id?: unknown }).calendar_id
  const calendarId = toPositiveInteger(calendarCandidate) ?? null

  const name =
    typeof value.name === "string" && value.name.trim().length > 0 ? value.name : ""

  const email =
    typeof value.email === "string" && value.email.trim().length > 0 ? value.email : ""

  const avatarCandidate = value.avatarUrl ?? value.avatar_url
  const avatarUrl =
    typeof avatarCandidate === "string" && avatarCandidate.trim().length > 0
      ? avatarCandidate
      : null

  const timezone =
    typeof value.timezone === "string" && value.timezone.trim().length > 0
      ? value.timezone
      : "Europe/Madrid"

  return {
    id,
    name,
    email,
    calendarId,
    avatarUrl,
    timezone,
  }
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState<UserSummary[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  const searchParamsString = useMemo(
    () => (searchParams ? searchParams.toString() : ""),
    [searchParams],
  )

  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("Supabase client could not be initialised", error)
      return null
    }
  }, [])

  const handleLoginSuccess = useCallback(
    (user: UserSummary) => {
      const sanitized = sanitizeUserSummary(user)
      if (!sanitized) {
        return
      }

      setUsers((previous) => {
        const exists = previous.some((entry) => entry.id === sanitized.id)
        if (exists) {
          return previous.map((entry) => (entry.id === sanitized.id ? sanitized : entry))
        }
        return [...previous, sanitized].sort((a, b) => a.name.localeCompare(b.name || "", "es"))
      })

      const params = new URLSearchParams(searchParamsString)
      if (sanitized.calendarId) {
        params.set("calendarId", String(sanitized.calendarId))
      } else {
        params.delete("calendarId")
      }
      params.set("userId", sanitized.id)

      const query = params.toString()
      router.push(`/onboarding${query ? `?${query}` : ""}`)
    },
    [router, searchParamsString],
  )

  const handleUserCreated = useCallback(
    (user: UserSummary) => {
      const sanitized = sanitizeUserSummary(user)
      if (!sanitized) {
        return
      }

      setUsers((previous) => {
        const exists = previous.some((entry) => entry.id === sanitized.id)
        if (exists) {
          return previous.map((entry) => (entry.id === sanitized.id ? sanitized : entry))
        }
        return [...previous, sanitized].sort((a, b) => a.name.localeCompare(b.name || "", "es"))
      })
    },
    [],
  )

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      setIsLoadingUsers(true)

      try {
        const response = await fetch("/api/users", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("No se pudieron cargar los usuarios")
        }

        const data = (await response.json().catch(() => null)) as ApiUsersResponse | null
        if (!isMounted) {
          return
        }

        const loadedUsers = Array.isArray(data?.users)
          ? data!.users
              .map((user) => sanitizeUserSummary(user))
              .filter((user): user is UserSummary => Boolean(user))
              .sort((a, b) => a.name.localeCompare(b.name || "", "es"))
          : []

        setUsers(loadedUsers)
        setUsersError(null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : "No se pudieron cargar los usuarios"
        setUsersError(message)
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    const synchronizeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session?.access_token || !isMounted) {
          return
        }

        const user = await exchangeAccessToken(data.session.access_token)
        if (isMounted) {
          handleLoginSuccess(user)
        }
      } catch (error) {
        console.error("No se pudo validar la sesión de Supabase", error)
      }
    }

    void synchronizeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token || !isMounted) {
        return
      }

      void exchangeAccessToken(session.access_token)
        .then((user) => {
          if (isMounted) {
            handleLoginSuccess(user)
          }
        })
        .catch((error) => {
          console.error("No se pudo validar la sesión de Supabase", error)
        })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [handleLoginSuccess, supabase])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/60">
              Bienvenido a
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">Planloop</h1>
            <p className="text-sm text-white/60">
              Inicia sesión o crea una cuenta para continuar organizando tus turnos.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            {isLoadingUsers ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            ) : (
              <div className="space-y-6">
                {usersError ? (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                    {usersError}
                  </div>
                ) : null}

                <UserAuthPanel
                  users={users}
                  onLogin={handleLoginSuccess}
                  onUserCreated={handleUserCreated}
                />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-white/40">
            ¿Tienes problemas para iniciar sesión? Escríbenos a
            <span className="font-medium text-white"> soporte@planloop.com</span>
          </p>
        </div>
      </div>
    </main>
  )
}
