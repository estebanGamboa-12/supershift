"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import ShiftTemplateCard from "@/components/dashboard/ShiftTemplateCard"
import ShiftTemplateModal, { type ShiftTemplateSubmitPayload } from "@/components/ShiftTemplateModal"
import { getTemplateDefaultPluses, setTemplateDefaultPluses } from "@/lib/template-default-pluses"
import EditRotationModal from "@/components/EditRotationModal"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import type { UserSummary } from "@/types/users"
import type { RotationTemplate, ShiftTemplate } from "@/types/templates"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import { useShiftTemplates } from "@/lib/useShiftTemplates"
import { useRotationTemplates } from "@/lib/useRotationTemplates"
import { useConfirmDelete } from "@/lib/ConfirmDeleteContext"
import { useToast } from "@/lib/ToastContext"
import { openNoCreditsModal } from "@/components/dashboard/NoCreditsModalListener"
import ScreenInfoIcon from "@/components/ui/ScreenInfoIcon"
import CreditsBottomBar from "@/components/dashboard/CreditsBottomBar"
import { runTemplatesTour } from "@/components/onboarding/TemplatesOnboarding"
import { runRotationFormTour } from "@/components/onboarding/RotationFormOnboarding"
import { loadUserPreferences } from "@/lib/user-preferences"

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

export default function TemplatesPage() {
  const router = useRouter()
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

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

  const handleNavigateTab = useCallback((tab: MobileTab) => {
    if (tab === "calendar") {
      router.push("/")
    } else if (tab === "settings") {
      router.push("/?tab=settings")
    }
  }, [router])

  const handleNavigateLink = useCallback((href: string) => {
    router.push(href)
  }, [router])

  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(false)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"shifts" | "rotations">("shifts")

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftModalTemplate, setShiftModalTemplate] = useState<ShiftTemplate | null>(null)
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false)
  const [rotationModalTemplate, setRotationModalTemplate] = useState<RotationTemplate | null>(null)
  const [showInfoIcon, setShowInfoIcon] = useState(true)

  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded?.preferences?.showInfoIcon === false) setShowInfoIcon(false)
  }, [])

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

  // Cargar saldo de créditos cuando hay usuario
  useEffect(() => {
    if (!currentUser?.id || !supabase) {
      setCreditBalance(null)
      return
    }
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token || !isMounted) return
      fetch(`/api/users/${encodeURIComponent(currentUser.id)}/credits`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json().catch(() => null))
        .then((data) => {
          if (isMounted && typeof data?.balance === "number") {
            setCreditBalance(data.balance)
          }
        })
        .catch(() => {})
    })
    return () => {
      isMounted = false
    }
  }, [currentUser?.id, supabase])

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
  } = useShiftTemplates(currentUser?.id, {
    onCreditsRequired: (cost) => openNoCreditsModal({ cost }),
  })

  const {
    templates: rotationTemplates,
    isLoading: isLoadingRotations,
    error: rotationError,
    refetch: refetchRotations,
    createRotationTemplate,
    updateRotationTemplate,
    deleteRotationTemplate,
  } = useRotationTemplates(currentUser?.id, {
    onCreditsRequired: (cost) => openNoCreditsModal({ cost }),
  })

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

  const handleDeleteShift = (template: ShiftTemplate) => {
    confirmDelete({
      itemName: `la plantilla "${template.title}"`,
      onConfirm: async () => {
        await deleteShiftTemplate(template.id)
        showToast({ type: "delete", message: "Plantilla eliminada" })
      },
    })
  }

  const handleSubmitShiftTemplate = async (payload: ShiftTemplateSubmitPayload) => {
    const { defaultPluses, ...input } = payload
    if (shiftModalTemplate) {
      const result = await updateShiftTemplate(shiftModalTemplate.id, input)
      if (!result) {
        throw new Error("No se pudo actualizar la plantilla de turno")
      }
      setTemplateDefaultPluses(shiftModalTemplate.id, defaultPluses)
      showToast({ type: "update", message: "Plantilla modificada" })
    } else {
      const result = await createShiftTemplate(input)
      if (!result) {
        throw new Error("No se pudo crear la plantilla de turno")
      }
      setTemplateDefaultPluses(result.id, defaultPluses)
      showToast({ type: "create", message: "Plantilla creada" })
    }
    setShiftModalTemplate(null)
  }

  const closeShiftModal = () => {
    setIsShiftModalOpen(false)
    setShiftModalTemplate(null)
  }

  const SHIFT_PRESETS = [
    { title: "Trabajo", color: "#3b82f6", startTime: "09:00", endTime: "17:00" },
    { title: "Nocturno", color: "#a855f7", startTime: "22:00", endTime: "06:00" },
    { title: "Descanso", color: "#94a3b8", startTime: "00:00", endTime: "00:00" },
    { title: "Vacaciones", color: "#10b981", startTime: "00:00", endTime: "00:00" },
    { title: "Personalizado", color: "#f59e0b", startTime: "09:00", endTime: "17:00" },
  ] as const

  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const handleCreatePresetShift = async (preset: (typeof SHIFT_PRESETS)[number]) => {
    if (isCreatingPreset) return
    const exists = shiftTemplates.some((t) => t.title === preset.title)
    if (exists) return
    setIsCreatingPreset(true)
    try {
      const result = await createShiftTemplate({
        title: preset.title,
        color: preset.color,
        startTime: preset.startTime,
        endTime: preset.endTime,
        icon: null,
        breakMinutes: null,
        alertMinutes: null,
        location: null,
      })
      if (!result) throw new Error("No se pudo crear")
      showToast({ type: "create", message: "Plantilla creada" })
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreatingPreset(false)
    }
  }

  const openNewRotationModal = () => {
    setRotationModalTemplate(null)
    setIsRotationModalOpen(true)
  }

  const handleEditRotation = (template: RotationTemplate) => {
    setRotationModalTemplate(template)
    setIsRotationModalOpen(true)
  }

  const handleDeleteRotation = (template: RotationTemplate) => {
    confirmDelete({
      itemName: `la rotación "${template.title}"`,
      onConfirm: async () => {
        const ok = await deleteRotationTemplate(template.id)
        if (ok) {
          if (rotationModalTemplate?.id === template.id) {
            closeRotationModal()
          }
          refetchRotations()
          showToast({ type: "delete", message: "Rotación eliminada" })
        } else {
          showToast({ type: "delete", message: "No se pudo eliminar la rotación" })
        }
      },
    })
  }

  const handleSubmitRotationTemplate = async (payload: Parameters<typeof createRotationTemplate>[0]) => {
    if (rotationModalTemplate && rotationModalTemplate.id > 0) {
      const result = await updateRotationTemplate(rotationModalTemplate.id, payload)
      if (!result) {
        throw new Error("No se pudo actualizar la plantilla de rotación")
      }
      refetchRotations()
      showToast({ type: "update", message: "Rotación modificada" })
    } else {
      const result = await createRotationTemplate(payload)
      if (!result) {
        throw new Error("No se pudo crear la plantilla de rotación")
      }
      refetchRotations()
      showToast({ type: "create", message: "Rotación creada" })
    }
    closeRotationModal()
  }

  const closeRotationModal = () => {
    setIsRotationModalOpen(false)
    setRotationModalTemplate(null)
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
              {isCheckingSession || isLoadingUsers ? (
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
    <div className="relative min-h-screen bg-slate-950 text-white pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.18),transparent_55%),_radial-gradient(circle_at_80%_105%,rgba(139,92,246,0.2),transparent_60%),_radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_65%)]" aria-hidden />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-4 pb-20 sm:px-6 sm:pb-24 sm:pt-4 lg:px-8 lg:pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <PlanLoopLogo size="sm" showText={true} />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              ← Panel
            </Link>
            {showInfoIcon && (
              <ScreenInfoIcon
                title="Plantillas"
                placement="bottom"
                className="shrink-0"
                onLaunchTour={() => {
                  setActiveTab("shifts")
                  setTimeout(() => runTemplatesTour(), 400)
                }}
              >
                <p className="mb-2">Aquí creas y guardas plantillas para reutilizar en el calendario.</p>
                <ul className="list-inside list-disc space-y-1 text-white/80">
                  <li><strong>Plantillas de turnos:</strong> horarios base (ej. mañana, tarde, noche). Crea una y úsala en muchas fechas.</li>
                  <li><strong>Rotaciones:</strong> secuencias de varios días (ej. 5 laborables + 2 libres). Así defines patrones que luego aplicas al mes.</li>
                </ul>
                <p className="mt-2 text-white/70">Los botones de abajo llevan tus plantillas al panel para aplicarlas al mes o generar una rotación.</p>
              </ScreenInfoIcon>
            )}
          </div>
        </div>

        {/* Tabs: Plantillas de turnos / Rotaciones */}
        <div className="sticky top-2 z-20 mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("shifts")}
            data-tour="templates-tab-shifts"
            className={`rounded-xl px-4 py-3 text-sm font-bold transition sm:px-5 sm:py-3 sm:text-base ${
              activeTab === "shifts"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400"
                : "border-2 border-white/20 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10"
            }`}
          >
            Plantillas de turnos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rotations")}
            data-tour="templates-tab-rotations"
            className={`rounded-xl px-4 py-3 text-sm font-bold transition sm:px-5 sm:py-3 sm:text-base ${
              activeTab === "rotations"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400"
                : "border-2 border-white/20 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10"
            }`}
          >
            Rotaciones
          </button>
        </div>

        <section className="mt-8 mb-12 space-y-8">
          {activeTab === "shifts" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Turnos base</h2>
                <button
                  type="button"
                  onClick={openNewShiftModal}
                  data-tour="templates-new-shift"
                  className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400"
                >
                  + Nueva
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2" data-tour="templates-presets">
                <span className="text-xs text-white/50">Crear con un clic:</span>
                {SHIFT_PRESETS.map((preset) => {
                  const exists = shiftTemplates.some((t) => t.title === preset.title)
                  return (
                    <button
                      key={preset.title}
                      type="button"
                      disabled={exists || isCreatingPreset}
                      onClick={() => handleCreatePresetShift(preset)}
                      className="rounded-xl border-2 px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        !exists && !isCreatingPreset
                          ? { borderColor: preset.color + "70", backgroundColor: preset.color + "25", color: preset.color }
                          : undefined
                      }
                    >
                      {preset.title}
                    </button>
                  )
                })}
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
                <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60" data-tour="templates-cards">
                  Aún no tienes plantillas guardadas. Crea tu primera plantilla para reutilizarla en rotaciones y agenda.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-tour="templates-cards">
                  {shiftTemplates.map((template) => (
                    <ShiftTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditShift}
                      onDelete={handleDeleteShift}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Rotaciones</h2>
                <button
                  type="button"
                  onClick={openNewRotationModal}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
                >
                  + Nueva
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
        initialDefaultPluses={shiftModalTemplate ? getTemplateDefaultPluses(shiftModalTemplate.id) : null}
        title={shiftModalTemplate ? "Editar plantilla de turno" : "Nueva plantilla de turno"}
        customShiftTypes={shiftTemplates.map((t) => ({ id: String(t.id), name: t.title, color: t.color ?? "#3b82f6", defaultStartTime: t.startTime, defaultEndTime: t.endTime }))}
      />

      <EditRotationModal
        open={isRotationModalOpen}
        onClose={closeRotationModal}
        onSubmit={handleSubmitRotationTemplate}
        template={rotationModalTemplate ?? undefined}
        shiftTemplates={shiftTemplates}
        onLaunchTour={showInfoIcon ? () => setTimeout(runRotationFormTour, 350) : undefined}
        onUpdateShiftTemplate={async (id, payload) => {
          const template = shiftTemplates.find((t) => t.id === id)
          if (!template) return
          const result = await updateShiftTemplate(id, {
            ...template,
            icon: payload.icon ?? template.icon,
            color: payload.color ?? template.color,
            title: template.title,
            startTime: template.startTime,
            endTime: template.endTime,
            breakMinutes: template.breakMinutes,
            alertMinutes: template.alertMinutes,
            location: template.location,
          })
          if (!result) {
            throw new Error("No se pudo actualizar la plantilla de turno")
          }
        }}
      />

      <MobileNavigation
        active="templates"
        onChange={handleNavigateTab}
        onNavigateLink={handleNavigateLink}
        creditBalance={creditBalance}
      />

      <CreditsBottomBar creditBalance={creditBalance} />
    </div>
  )
}
