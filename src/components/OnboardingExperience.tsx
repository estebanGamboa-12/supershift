"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Loader2,
  CalendarPlus,
  Send,
  type LucideIcon,
} from "lucide-react"

import type { ShiftType } from "@/types/shifts"
import type { TeamDetails, TeamInviteSummary } from "@/types/teams"

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Turno de trabajo",
  REST: "Descanso",
  NIGHT: "Turno de noche",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

type StepKey = "shift" | "invite"

type InviteMode = "link" | "manual"

type StepDefinition = {
  key: StepKey
  title: string
  description: string
  icon: LucideIcon
}

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    key: "shift",
    title: "Programa tu primer turno",
    description: "Añade un turno para que el calendario comience a cobrar vida.",
    icon: CalendarPlus,
  },
  {
    key: "invite",
    title: "Invita a tus compañeros",
    description: "Comparte un enlace seguro para que se unan al equipo.",
    icon: Send,
  },
]

const INVITE_MODE_OPTIONS: { key: InviteMode; label: string; description: string }[] = [
  {
    key: "link",
    label: "Compartir enlace",
    description: "Genera un enlace seguro para que tu equipo se una cuando quiera.",
  },
  {
    key: "manual",
    label: "Gestionar manualmente",
    description: "Registra a cada compañero desde el panel principal sin usar enlaces.",
  },
]

type ShiftFormState = {
  date: string
  type: ShiftType
  label: string
  startTime: string
  endTime: string
}

type CreatedShiftSummary = {
  id: number
  date: string
  type: ShiftType
  label: string | null
  startTime: string | null
  endTime: string | null
}

type OnboardingExperienceProps = {
  userId?: string
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function OnboardingExperience({ userId }: OnboardingExperienceProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>("shift")
  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState(true)

  const [origin, setOrigin] = useState<string>("")

  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [isLoadingTeam, setIsLoadingTeam] = useState<boolean>(false)

  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() => ({
    date: formatDateInput(new Date()),
    type: "WORK",
    label: "Primer turno",
    startTime: "09:00",
    endTime: "17:00",
  }))
  const [createdShift, setCreatedShift] = useState<CreatedShiftSummary | null>(null)
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [shiftNotice, setShiftNotice] = useState<string | null>(null)
  const [isCreatingShift, setIsCreatingShift] = useState<boolean>(false)

  const [invite, setInvite] = useState<TeamInviteSummary | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteNotice, setInviteNotice] = useState<string | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState<boolean>(false)
  const [remainingSpots, setRemainingSpots] = useState<number | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const [inviteMode, setInviteMode] = useState<InviteMode>("link")
  const [manualInviteCompleted, setManualInviteCompleted] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!autoNavigationEnabled) {
      return
    }

    if (!createdShift) {
      setCurrentStep("shift")
      return
    }

    setCurrentStep("invite")
  }, [autoNavigationEnabled, createdShift])

  useEffect(() => {
    if (!userId) {
      setTeam(null)
      setInvite(null)
      setRemainingSpots(null)
      setTeamError(null)
      setIsLoadingTeam(false)
      return
    }

    let cancelled = false

    const loadTeam = async () => {
      setIsLoadingTeam(true)
      setTeamError(null)
      try {
        const response = await fetch(`/api/teams?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        })

        const data = (await response.json().catch(() => null)) as
          | { team: TeamDetails | null; memberLimit?: number }
          | { error?: string }
          | null

        if (!response.ok) {
          throw new Error(
            (data && "error" in data && typeof data.error === "string"
              ? data.error
              : null) ?? "No se pudo cargar tu equipo",
          )
        }

        if (cancelled) {
          return
        }

        const fetchedTeam = data && "team" in data ? data.team ?? null : null
        setTeam(fetchedTeam)
        setInvite(fetchedTeam?.invite ?? null)
        const computedSpots = fetchedTeam
          ? Math.max(0, fetchedTeam.memberLimit - fetchedTeam.members.length)
          : null
        setRemainingSpots(computedSpots)
      } catch (error) {
        if (cancelled) {
          return
        }
        const message =
          error instanceof Error ? error.message : "No se pudo cargar tu equipo"
        setTeamError(message)
        setTeam(null)
        setInvite(null)
        setRemainingSpots(null)
      } finally {
        if (!cancelled) {
          setIsLoadingTeam(false)
        }
      }
    }

    void loadTeam()

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleSelectStep = useCallback(
    (key: StepKey) => {
      setAutoNavigationEnabled(false)
      setCurrentStep(key)
    },
    [],
  )

  const isOwner = useMemo(() => {
    if (!team || !userId) {
      return false
    }
    return team.ownerUserId === userId
  }, [team, userId])

  const inviteUrl = useMemo(() => {
    if (!invite) {
      return ""
    }

    const base = origin || process.env.NEXT_PUBLIC_APP_URL || ""
    return `${base}/teams/join/${invite.token}`
  }, [invite, origin])

  const shiftOptions = useMemo(
    () =>
      (Object.keys(SHIFT_TYPE_LABELS) as ShiftType[]).map((value) => ({
        value,
        label: SHIFT_TYPE_LABELS[value],
      })),
    [],
  )

  const spotsLeft = useMemo(() => {
    if (remainingSpots !== null) {
      return remainingSpots
    }

    if (!team) {
      return null
    }

    return Math.max(0, team.memberLimit - team.members.length)
  }, [remainingSpots, team])

  const handleShiftFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = event.target
      setShiftForm((current) => ({
        ...current,
        [name]: name === "type" ? (value.toUpperCase() as ShiftType) : value,
      }))
    },
    [],
  )

  const handleCreateShift = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!userId) {
        setShiftError("Debes seleccionar un usuario antes de crear turnos")
        return
      }

      if (!shiftForm.startTime || !shiftForm.endTime) {
        setShiftError("Indica la hora de inicio y fin del turno")
        return
      }

      setIsCreatingShift(true)
      setShiftError(null)
      setShiftNotice(null)

      try {
        const response = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            date: shiftForm.date,
            type: shiftForm.type,
            label: shiftForm.label,
            note: null,
            color: null,
            startTime: shiftForm.startTime,
            endTime: shiftForm.endTime,
            plusNight: 0,
            plusHoliday: 0,
            plusAvailability: 0,
            plusOther: 0,
          }),
        })

        const data = (await response.json().catch(() => null)) as
          | { shift?: { id: number; date: string; type: ShiftType; label?: string | null; startTime?: string | null; endTime?: string | null } }
          | { error?: string }
          | null

        if (!response.ok || !data || !("shift" in data) || !data.shift) {
          throw new Error(
            (data && "error" in data && typeof data.error === "string"
              ? data.error
              : null) ?? "No se pudo crear el turno",
          )
        }

        setCreatedShift({
          id: data.shift.id,
          date: data.shift.date,
          type: data.shift.type,
          label: data.shift.label ?? null,
          startTime: data.shift.startTime ?? null,
          endTime: data.shift.endTime ?? null,
        })
        setShiftNotice("Turno creado correctamente")
        setAutoNavigationEnabled(true)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo crear el turno"
        setShiftError(message)
      } finally {
        setIsCreatingShift(false)
      }
    },
    [shiftForm, userId],
  )

  const handleGenerateInvite = useCallback(async () => {
    if (!userId) {
      setInviteError("Debes iniciar sesión para generar invitaciones")
      return
    }

    if (!team) {
      setInviteError("Necesitas un equipo activo de Supershift Premium para generar invitaciones")
      return
    }

    setIsGeneratingInvite(true)
    setInviteError(null)
    setInviteNotice(null)
    setManualInviteCompleted(false)

    try {
      const response = await fetch(`/api/teams/${encodeURIComponent(team.id)}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = (await response.json().catch(() => null)) as
        | { invite?: TeamInviteSummary; remainingSpots?: number }
        | { error?: string }
        | null

      if (!response.ok || !data || !("invite" in data) || !data.invite) {
        throw new Error(
          (data && "error" in data && typeof data.error === "string"
            ? data.error
            : null) ?? "No se pudo generar el enlace de invitación",
        )
      }

      setInvite(data.invite)
      setInviteNotice("Enlace generado. ¡Compártelo con tu equipo!")
      if (typeof data.remainingSpots === "number") {
        setRemainingSpots(data.remainingSpots)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el enlace de invitación"
      setInviteError(message)
    } finally {
      setIsGeneratingInvite(false)
    }
  }, [team, userId])

  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) {
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = inviteUrl
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 3000)
    } catch (error) {
      console.error("No se pudo copiar el enlace de invitación", error)
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 3000)
    }
  }, [inviteUrl])

  const handleManualInviteCompletion = useCallback(() => {
    setInviteError(null)
    setManualInviteCompleted(true)
    setInviteNotice(
      "Has marcado este paso como gestionado manualmente. Siempre podrás invitar a más personas desde el panel principal.",
    )
  }, [])

  const handleManualInviteReset = useCallback(() => {
    setManualInviteCompleted(false)
    setInviteNotice(null)
  }, [])

  const completedSteps: Record<StepKey, boolean> = useMemo(
    () => ({
      shift: Boolean(createdShift),
      invite: Boolean(invite) || manualInviteCompleted,
    }),
    [createdShift, invite, manualInviteCompleted],
  )

  const renderStepper = () => (
    <nav className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {STEP_DEFINITIONS.map((step, index) => {
        const Icon = step.icon
        const isActive = currentStep === step.key
        const isCompleted = completedSteps[step.key]
        const isLocked = step.key === "invite" ? !createdShift : false

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => {
              if (isLocked) {
                return
              }
              handleSelectStep(step.key)
            }}
            disabled={isLocked}
            className={`group flex flex-1 items-start gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:items-center sm:p-5 ${
              isActive
                ? "border-sky-400/70 bg-sky-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            } ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-white">
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden />
              ) : (
                <Circle className="h-6 w-6 text-white/60" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/60">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              <p className="text-sm text-white/60">{step.description}</p>
            </div>
          </button>
        )
      })}
    </nav>
  )

  const renderShiftStep = () => (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/40 sm:p-8">
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold text-white">Programa tu primer turno</h3>
        <p className="text-sm text-white/70">
          Un primer turno ayuda a tu equipo a visualizar la planificación. Podrás editarlo o eliminarlo más adelante desde el
          panel principal.
        </p>
      </header>

        {!userId ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
            Inicia sesión para programar turnos.
          </div>
        ) : (
        <div className="space-y-5">
          {!createdShift && (
            <form onSubmit={handleCreateShift} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="shift-date" className="text-sm font-medium text-white">
                  Fecha
                </label>
                <input
                  id="shift-date"
                  name="date"
                  type="date"
                  value={shiftForm.date}
                  onChange={handleShiftFieldChange}
                  disabled={isCreatingShift}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="shift-type" className="text-sm font-medium text-white">
                  Tipo de turno
                </label>
                <select
                  id="shift-type"
                  name="type"
                  value={shiftForm.type}
                  onChange={handleShiftFieldChange}
                  disabled={isCreatingShift}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                >
                  {shiftOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="shift-start" className="text-sm font-medium text-white">
                  Hora de inicio
                </label>
                <input
                  id="shift-start"
                  name="startTime"
                  type="time"
                  value={shiftForm.startTime}
                  onChange={handleShiftFieldChange}
                  disabled={isCreatingShift}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="shift-end" className="text-sm font-medium text-white">
                  Hora de fin
                </label>
                <input
                  id="shift-end"
                  name="endTime"
                  type="time"
                  value={shiftForm.endTime}
                  onChange={handleShiftFieldChange}
                  disabled={isCreatingShift}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="space-y-2">
                  <label htmlFor="shift-label" className="text-sm font-medium text-white">
                    Etiqueta
                  </label>
                  <input
                    id="shift-label"
                    name="label"
                    type="text"
                    value={shiftForm.label}
                    onChange={handleShiftFieldChange}
                    disabled={isCreatingShift}
                    placeholder="Ej. Guardia de bienvenida"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isCreatingShift}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingShift ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {isCreatingShift ? "Guardando turno..." : "Crear turno"}
                </button>
              </div>
            </form>
          )}

          {createdShift && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p>
                  Tu turno del {createdShift.date} está listo. {createdShift.label ?? "Sin etiqueta"} · {SHIFT_TYPE_LABELS[createdShift.type]} ·
                  {" "}
                  {createdShift.startTime && createdShift.endTime
                    ? `${createdShift.startTime} - ${createdShift.endTime}`
                    : "Todo el día"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoNavigationEnabled(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
              >
                Pasar a la invitación del equipo
              </button>
            </div>
          )}
        </div>
      )}

      {shiftNotice && !createdShift && !shiftError && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {shiftNotice}
        </div>
      )}

      {shiftError && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          {shiftError}
        </div>
      )}
    </section>
  )

  const renderInviteStep = () => (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/40 sm:p-8">
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold text-white">Invita a tus compañeros</h3>
        <p className="text-sm text-white/70">
          Genera un enlace único para que tu equipo se una a Supershift. Podrás revocarlo o generar uno nuevo desde el panel de
          equipo cuando lo necesites.
        </p>
      </header>

      {!userId ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          Inicia sesión para gestionar invitaciones.
        </div>
      ) : isLoadingTeam ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Cargando información del equipo...</span>
        </div>
      ) : teamError ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{teamError}</div>
      ) : (
        <div className="space-y-6">
          {!team ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              La creación de equipos forma parte de Supershift Premium. Ponte en contacto con nosotros para activar esta
              funcionalidad y poder invitar a tus compañeros.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">¿Cómo quieres continuar?</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {INVITE_MODE_OPTIONS.map((option) => {
                    const isActive = inviteMode === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setInviteMode(option.key)}
                        aria-pressed={isActive}
                        className={`group rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                          isActive
                            ? "border-sky-400/80 bg-sky-500/10 shadow-lg shadow-sky-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <p className="text-sm font-semibold text-white">{option.label}</p>
                        <p className="mt-1 text-sm text-white/60">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {inviteMode === "link" ? (
                !isOwner ? (
                  <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 text-sm text-sky-100">
                    Solo los propietarios pueden generar enlaces de invitación. Pide al propietario que comparta el acceso con el
                    equipo o cambia a la opción de gestión manual.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                      <p>
                        Espacios disponibles: {spotsLeft ?? "-"} de {team.memberLimit}. Comparte el enlace solo con compañeros de
                        confianza.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={handleGenerateInvite}
                        disabled={isGeneratingInvite}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isGeneratingInvite ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        {isGeneratingInvite ? "Generando enlace..." : invite ? "Obtener enlace actualizado" : "Generar enlace"}
                      </button>

                      {invite && (
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        >
                          <ClipboardCopy className="h-4 w-4" aria-hidden />
                          {copyState === "copied"
                            ? "Copiado"
                            : copyState === "error"
                              ? "No se pudo copiar"
                              : "Copiar enlace"}
                        </button>
                      )}
                    </div>

                    {invite && (
                      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100 break-words">
                        <p className="font-semibold text-emerald-100">Enlace de invitación</p>
                        <p className="mt-1 text-emerald-100/80">{inviteUrl}</p>
                        <p className="mt-2 text-emerald-100/70">
                          Creado el {new Date(invite.createdAt).toLocaleString()}. {invite.uses} de {invite.maxUses} usos
                          consumidos.
                        </p>
                        {invite.expiresAt ? (
                          <p className="text-emerald-100/70">Caduca el {new Date(invite.expiresAt).toLocaleString()}.</p>
                        ) : (
                          <p className="text-emerald-100/70">Sin fecha de caducidad establecida.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-white">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Gestiona las incorporaciones manualmente</h3>
                    <p className="text-sm text-white/70">
                      Si prefieres controlar cada alta personalmente, añade a tus compañeros desde el panel principal sin
                      compartir enlaces públicos.
                    </p>
                    {!isOwner ? (
                      <p className="text-sm text-sky-100/80">
                        Necesitarás pedir al propietario que te habilite permisos o que ejecute estos pasos.
                      </p>
                    ) : null}
                  </div>

                  <ol className="space-y-3 text-sm text-white/70">
                    {["Ve al panel principal y abre la sección Equipo.", "Añade a cada persona indicando su correo y rol.", "Confirma los permisos y guarda los cambios para activar su acceso."].map((step, index) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sm font-semibold text-sky-200">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleManualInviteCompletion}
                      disabled={manualInviteCompleted}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      {manualInviteCompleted ? "Paso marcado como completado" : "Marcar paso como completado"}
                    </button>

                    {manualInviteCompleted ? (
                      <button
                        type="button"
                        onClick={handleManualInviteReset}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                      >
                        Deshacer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setInviteMode("link")}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                      >
                        Prefiero compartir un enlace
                      </button>
                    )}
                  </div>

                  {manualInviteCompleted ? (
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      Recuerda que puedes volver a esta pantalla cuando quieras para cambiar de estrategia o generar un enlace de
                      invitación.
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {inviteNotice && !inviteError && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {inviteNotice}
        </div>
      )}

      {inviteError && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          {inviteError}
        </div>
      )}
    </section>
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-10"
    >
      <header className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-white shadow-xl shadow-black/40">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Configura Supershift en dos pasos</h1>
          <p className="max-w-3xl text-sm text-white/70">
            Te acompañamos para que empieces a trabajar cuanto antes: programa un turno de referencia y comparte el acceso con tus
            compañeros.
          </p>
        </div>
      </header>

      {renderStepper()}
      {currentStep === "shift" && renderShiftStep()}
      {currentStep === "invite" && renderInviteStep()}

      <footer className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-white/60">
        <p>
          ¿Necesitas realizar más ajustes? Desde el panel principal podrás modificar turnos, gestionar miembros y actualizar las
          preferencias de tu equipo en cualquier momento.
        </p>
      </footer>
    </motion.div>
  )
}
