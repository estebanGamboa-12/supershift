"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { Session } from "@supabase/supabase-js"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import ShiftTemplateCard from "@/components/dashboard/ShiftTemplateCard"
import ShiftTemplateModal from "@/components/ShiftTemplateModal"
import EditRotationModal from "@/components/EditRotationModal"
import type { UserSummary } from "@/types/users"
import type { RotationTemplate, ShiftTemplate } from "@/types/templates"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import { useShiftTemplates } from "@/lib/useShiftTemplates"
import { useRotationTemplates } from "@/lib/useRotationTemplates"

function sanitizeUserSummary(value: unknown): UserSummary | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Partial<UserSummary> & {
    calendar_id?: unknown
    avatar_url?: unknown
    time_zone?: unknown
  }

  const id = typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : null

  if (!id) {
    return null
  }

  const calendarId =
    typeof candidate.calendarId === "number"
      ? candidate.calendarId
      : typeof candidate.calendar_id === "number"
        ? candidate.calendar_id
        : null

  const name = typeof candidate.name === "string" ? candidate.name : ""
  const email = typeof candidate.email === "string" ? candidate.email : ""
  const avatarUrl =
    typeof candidate.avatarUrl === "string"
      ? candidate.avatarUrl
      : typeof candidate.avatar_url === "string"
        ? candidate.avatar_url
        : null

  const timezone =
    typeof candidate.timezone === "string"
      ? candidate.timezone
      : typeof candidate.time_zone === "string"
        ? candidate.time_zone
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

function buildSeedRotation(template: ShiftTemplate, days = 7): RotationTemplate {
  return {
    id: 0,
    userId: template.userId,
    title: `Rotación · ${template.title}`,
    icon: template.icon ?? "🔄",
    description: "",
    daysCount: days,
    assignments: Array.from({ length: days }, (_, index) => ({
      dayIndex: index,
      shiftTemplateId: template.id,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function TemplatesPage() {
  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("No se pudo inicializar Supabase en templates", error)
      return null
    }
  }, [])

  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"shifts" | "rotations">("shifts")

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftModalTemplate, setShiftModalTemplate] = useState<ShiftTemplate | null>(null)
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false)
  const [rotationModalTemplate, setRotationModalTemplate] = useState<RotationTemplate | null>(null)

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false)
      return
    }

    let isMounted = true

    const resolveSession = async (session: Session | null) => {
      if (!session?.access_token) {
        if (isMounted) {
          setCurrentUser(null)
        }
        return
      }

      try {
        const user = await exchangeAccessToken(session.access_token)
        if (isMounted) {
          setCurrentUser(user)
        }
      } catch (error) {
        console.error("No se pudo intercambiar el token de Supabase", error)
        if (isMounted) {
          setCurrentUser(null)
        }
      }
    }

    const loadInitialSession = async () => {
      setIsCheckingSession(true)
      try {
        const { data } = await supabase.auth.getSession()
        await resolveSession(data.session ?? null)
      } finally {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      }
    }

    void loadInitialSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveSession(session)
    })

    return () => {
      isMounted = false
      subscription?.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const response = await fetch("/api/users", { cache: "no-store" })
        const data = await response.json().catch(() => null)

        if (!isMounted) {
          return
        }

        const sanitized = Array.isArray(data?.users)
          ? data.users
              .map((user: unknown) => sanitizeUserSummary(user))
              .filter(
                (user: UserSummary | null | undefined): user is UserSummary =>
                  Boolean(user),
              )
          : []

        setUsers(sanitized)
        setUserError(null)
      } catch (error) {
        console.error("No se pudieron cargar los usuarios", error)
        if (isMounted) {
          setUserError("No se pudieron cargar los usuarios disponibles")
        }
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

  const {
    templates: shiftTemplates,
    isLoading: isLoadingShifts,
    error: shiftError,
    createShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
  } = useShiftTemplates(currentUser?.id)

  const {
    templates: rotationTemplates,
    isLoading: isLoadingRotations,
    error: rotationError,
    createRotationTemplate,
    updateRotationTemplate,
    deleteRotationTemplate,
  } = useRotationTemplates(currentUser?.id)

  const handleLogin = useCallback((user: UserSummary) => {
    setCurrentUser(user)
  }, [])

  const handleUserCreated = useCallback((user: UserSummary) => {
    setUsers((current) => [...current, user])
    setCurrentUser(user)
  }, [])

  const openNewShiftModal = () => {
    setShiftModalTemplate(null)
    setIsShiftModalOpen(true)
  }

  const handleEditShift = (template: ShiftTemplate) => {
    setShiftModalTemplate(template)
    setIsShiftModalOpen(true)
  }

  const handleDeleteShift = async (template: ShiftTemplate) => {
    const confirmed = window.confirm(`¿Eliminar la plantilla "${template.title}"?`)
    if (!confirmed) {
      return
    }

    await deleteShiftTemplate(template.id)
  }

  const handleSubmitShiftTemplate = async (payload: Parameters<typeof createShiftTemplate>[0]) => {
    if (shiftModalTemplate) {
      const result = await updateShiftTemplate(shiftModalTemplate.id, payload)
      if (!result) {
        throw new Error("No se pudo actualizar la plantilla de turno")
      }
    } else {
      const result = await createShiftTemplate(payload)
      if (!result) {
        throw new Error("No se pudo crear la plantilla de turno")
      }
    }
    setShiftModalTemplate(null)
  }

  const closeShiftModal = () => {
    setIsShiftModalOpen(false)
    setShiftModalTemplate(null)
  }

  const openNewRotationModal = () => {
    setRotationModalTemplate(null)
    setIsRotationModalOpen(true)
  }

  const handleEditRotation = (template: RotationTemplate) => {
    setRotationModalTemplate(template)
    setIsRotationModalOpen(true)
  }

  const handleSeedRotation = (template: ShiftTemplate) => {
    setRotationModalTemplate(buildSeedRotation({ ...template, userId: currentUser?.id ?? template.userId }))
    setActiveTab("rotations")
    setIsRotationModalOpen(true)
  }

  const handleDeleteRotation = async (template: RotationTemplate) => {
    const confirmed = window.confirm(`¿Eliminar la rotación "${template.title}"?`)
    if (!confirmed) {
      return
    }

    await deleteRotationTemplate(template.id)
  }

  const handleSubmitRotationTemplate = async (payload: Parameters<typeof createRotationTemplate>[0]) => {
    if (rotationModalTemplate && rotationModalTemplate.id > 0) {
      const result = await updateRotationTemplate(rotationModalTemplate.id, payload)
      if (!result) {
        throw new Error("No se pudo actualizar la plantilla de rotación")
      }
    } else {
      const result = await createRotationTemplate(payload)
      if (!result) {
        throw new Error("No se pudo crear la plantilla de rotación")
      }
    }
    setRotationModalTemplate(null)
  }

  const closeRotationModal = () => {
    setIsRotationModalOpen(false)
    setRotationModalTemplate(null)
  }

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <FloatingParticlesLoader />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-16">
          <div className="w-full space-y-6">
            {userError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {userError}
              </div>
            ) : null}
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_80px_-48px_rgba(59,130,246,0.6)]">
              {isLoadingUsers ? (
                <div className="flex justify-center py-12">
                  <FloatingParticlesLoader />
                </div>
              ) : (
                <UserAuthPanel users={users} onLogin={handleLogin} onUserCreated={handleUserCreated} />
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.18),transparent_55%),_radial-gradient(circle_at_80%_105%,rgba(139,92,246,0.2),transparent_60%),_radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_65%)]" aria-hidden />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_40px_100px_-60px_rgba(56,189,248,0.6)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-100">
              Plantillas
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Biblioteca de turnos y rotaciones</h1>
            <p className="max-w-2xl text-sm text-white/70">
              Crea plantillas reutilizables para acelerar la programación de turnos, construir rotaciones circulares y compartir patrones con tu equipo.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white"
            >
              ← Volver al panel
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab("rotations")}
              className="inline-flex items-center justify-center rounded-full border border-sky-400/50 bg-sky-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 shadow hover:bg-sky-400/30"
            >
              Construir rotación
            </button>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          <button
            type="button"
            onClick={() => setActiveTab("shifts")}
            className={`rounded-full px-3 py-1 transition ${
              activeTab === "shifts" ? "bg-sky-500 text-white shadow shadow-sky-500/30" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Plantillas de turnos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rotations")}
            className={`rounded-full px-3 py-1 transition ${
              activeTab === "rotations" ? "bg-sky-500 text-white shadow shadow-sky-500/30" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Rotaciones
          </button>
        </div>

        <section className="mt-8 space-y-8">
          {activeTab === "shifts" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Turnos base</h2>
                  <p className="text-sm text-white/60">
                    Define horarios con descansos y recordatorios preconfigurados para aplicarlos en segundos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewShiftModal}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_20px_40px_-28px_rgba(14,165,233,0.65)] transition hover:brightness-110"
                >
                  Nueva plantilla
                </button>
              </div>

              {shiftError ? (
                <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {shiftError}
                </div>
              ) : null}

              {isLoadingShifts ? (
                <div className="flex justify-center py-12">
                  <FloatingParticlesLoader />
                </div>
              ) : shiftTemplates.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60">
                  Aún no tienes plantillas guardadas. Crea tu primera plantilla para reutilizarla en rotaciones y agenda.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {shiftTemplates.map((template) => (
                    <ShiftTemplateCard
                      key={template.id}
                      template={template}
                      onAdd={() => handleSeedRotation(template)}
                      onEdit={handleEditShift}
                      onDelete={handleDeleteShift}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Rotaciones automáticas</h2>
                  <p className="text-sm text-white/60">
                    Organiza ciclos circulares asignando plantillas de turno a cada día. Perfecto para guardias y equipos 24/7.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewRotationModal}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_24px_48px_-28px_rgba(16,185,129,0.55)] transition hover:brightness-110"
                >
                  Nueva rotación
                </button>
              </div>

              {rotationError ? (
                <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {rotationError}
                </div>
              ) : null}

              {isLoadingRotations ? (
                <div className="flex justify-center py-12">
                  <FloatingParticlesLoader />
                </div>
              ) : rotationTemplates.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60">
                  No hay rotaciones guardadas todavía. Crea una para reutilizarla en calendarios y asignaciones de equipo.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rotationTemplates.map((template) => {
                    const assignedCount = template.assignments.filter((item) => item.shiftTemplateId != null).length
                    return (
                      <article
                        key={template.id}
                        className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_30px_60px_-40px_rgba(59,130,246,0.65)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                              {template.icon ?? "🔄"}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold tracking-tight">{template.title}</h3>
                              <p className="text-sm text-white/60">{template.daysCount} días · {assignedCount} asignados</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditRotation(template)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm text-white/80 transition hover:bg-white/20"
                              aria-label={`Editar ${template.title}`}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRotation(template)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sm text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20"
                              aria-label={`Eliminar ${template.title}`}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-white/70">
                          {template.description?.trim() || "Sin descripción"}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-white/60">
                          {template.assignments.slice(0, 8).map((assignment) => {
                            const shift = shiftTemplates.find((item) => item.id === assignment.shiftTemplateId)
                            return (
                              <span
                                key={`${template.id}-${assignment.dayIndex}`}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                              >
                                <span className="text-base">{shift?.icon ?? "○"}</span>
                                Día {assignment.dayIndex + 1}
                              </span>
                            )
                          })}
                          {template.assignments.length > 8 ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                              +{template.assignments.length - 8} días más
                            </span>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <ShiftTemplateModal
        open={isShiftModalOpen}
        onClose={closeShiftModal}
        onSubmit={handleSubmitShiftTemplate}
        template={shiftModalTemplate}
        title={shiftModalTemplate ? "Editar plantilla de turno" : "Nueva plantilla de turno"}
      />

      <EditRotationModal
        open={isRotationModalOpen}
        onClose={closeRotationModal}
        onSubmit={handleSubmitRotationTemplate}
        template={rotationModalTemplate ?? undefined}
        shiftTemplates={shiftTemplates}
      />
    </div>
  )
}
