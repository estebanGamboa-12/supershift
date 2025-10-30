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
  Users,
  CalendarPlus,
  Send,
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

type StepKey = "team" | "shift" | "invite"

type StepDefinition = {
  key: StepKey
  title: string
  description: string
  icon: typeof Users
}

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    key: "team",
    title: "Crea tu equipo",
    description: "Define el nombre del equipo y conviértete en su propietario.",
    icon: Users,
  },
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
  const [currentStep, setCurrentStep] = useState<StepKey>("team")
  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState(true)

  const [origin, setOrigin] = useState<string>("")

  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [teamName, setTeamName] = useState<string>("")
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamNotice, setTeamNotice] = useState<string | null>(null)
  const [isLoadingTeam, setIsLoadingTeam] = useState<boolean>(false)
  const [isCreatingTeam, setIsCreatingTeam] = useState<boolean>(false)

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

    if (!team) {
      setCurrentStep("team")
      return
    }

    if (!createdShift) {
      setCurrentStep("shift")
      return
    }

    setCurrentStep("invite")
  }, [autoNavigationEnabled, team, createdShift])

  useEffect(() => {
    if (!userId) {
      setTeam(null)
      setInvite(null)
      setRemainingSpots(null)
      setTeamName("")
      setIsLoadingTeam(false)
      return
    }

    let cancelled = false

    const loadTeam = async () => {
      setIsLoadingTeam(true)
      setTeamError(null)
      setTeamNotice(null)
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
        setTeamName(fetchedTeam?.name ?? "")
        const computedSpots = fetchedTeam
          ? Math.max(0, fetchedTeam.memberLimit - fetchedTeam.members.length)
          : null
        setRemainingSpots(computedSpots)
        if (fetchedTeam) {
          setTeamNotice(`Ya formas parte del equipo ${fetchedTeam.name}`)
        }
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

  const handleTeamNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTeamName(event.target.value)
  }, [])

  const handleCreateTeam = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!userId) {
        setTeamError("Debes iniciar sesión para crear un equipo")
        return
      }

      if (!teamName.trim()) {
        setTeamError("El nombre del equipo es obligatorio")
        return
      }

      setIsCreatingTeam(true)
      setTeamError(null)
      setTeamNotice(null)

      try {
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: userId, name: teamName.trim() }),
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
        setRemainingSpots(Math.max(0, data.team.memberLimit - data.team.members.length))
        setTeamNotice(`Equipo ${data.team.name} creado correctamente`)
        setAutoNavigationEnabled(true)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo crear el equipo"
        setTeamError(message)
      } finally {
        setIsCreatingTeam(false)
      }
    },
    [teamName, userId],
  )

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
    if (!team || !userId) {
      setInviteError("Debes completar los pasos anteriores antes de invitar a tu equipo")
      return
    }

    setIsGeneratingInvite(true)
    setInviteError(null)
    setInviteNotice(null)

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

  const completedSteps: Record<StepKey, boolean> = useMemo(
    () => ({
      team: Boolean(team),
      shift: Boolean(createdShift),
      invite: Boolean(invite),
    }),
    [createdShift, invite, team],
  )

  const renderStepper = () => (
    <nav className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {STEP_DEFINITIONS.map((step, index) => {
        const Icon = step.icon
        const isActive = currentStep === step.key
        const isCompleted = completedSteps[step.key]
        const isLocked =
          step.key === "shift" ? !team : step.key === "invite" ? !team || !createdShift : false

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

  const renderTeamStep = () => (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/40 sm:p-8">
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold text-white">Pon nombre a tu equipo</h3>
        <p className="text-sm text-white/70">
          El propietario puede invitar a nuevos miembros y gestionar la configuración general. Este paso te ayudará a activar el
          espacio compartido para tu organización.
        </p>
      </header>

      {!userId ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          Inicia sesión para crear o gestionar tu equipo.
        </div>
      ) : (
        <div className="space-y-5">
          {!team && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="team-name" className="text-sm font-medium text-white">
                  Nombre del equipo
                </label>
                <input
                  id="team-name"
                  name="team-name"
                  type="text"
                  value={teamName}
                  onChange={handleTeamNameChange}
                  disabled={isCreatingTeam}
                  placeholder="Ej. Soporte 24/7"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingTeam}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingTeam ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {isCreatingTeam ? "Creando equipo..." : "Crear equipo"}
              </button>
            </form>
          )}

          {isLoadingTeam && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Cargando información del equipo...</span>
            </div>
          )}

          {team && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p>
                  <strong>{team.name}</strong> está listo. Actualmente hay {team.members.length} de {team.memberLimit} espacios ocupados.
                </p>
                <p className="mt-2 text-emerald-100/80">
                  Como propietario podrás invitar a tu equipo y asignar roles adicionales más adelante.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoNavigationEnabled(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
              >
                Continuar con la planificación de turnos
              </button>
            </div>
          )}

          {teamNotice && !teamError && !isLoadingTeam && !isCreatingTeam && !team && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {teamNotice}
            </div>
          )}
        </div>
      )}

      {teamError && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          {teamError}
        </div>
      )}
    </section>
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

      {!userId || !team ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Completa el paso anterior para activar la planificación de turnos.
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

      {!team || !userId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Completa los pasos anteriores para generar un enlace de invitación.
        </div>
      ) : !isOwner ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Solo el propietario del equipo puede generar enlaces de invitación. Solicita acceso a la persona que creó el equipo.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <p>
              Espacios disponibles: {spotsLeft ?? "-"} de {team.memberLimit}. Comparte el enlace solo con compañeros de confianza.
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
                Creado el {new Date(invite.createdAt).toLocaleString()}. {invite.uses} de {invite.maxUses} usos consumidos.
              </p>
              {invite.expiresAt ? (
                <p className="text-emerald-100/70">Caduca el {new Date(invite.expiresAt).toLocaleString()}.</p>
              ) : (
                <p className="text-emerald-100/70">Sin fecha de caducidad establecida.</p>
              )}
            </div>
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Configura Supershift en tres pasos</h1>
          <p className="max-w-3xl text-sm text-white/70">
            Te acompañamos para que tu equipo empiece a trabajar cuanto antes: crea el espacio compartido, programa un turno de
            referencia y comparte el acceso con tus compañeros.
          </p>
        </div>
      </header>

      {renderStepper()}

      {currentStep === "team" && renderTeamStep()}
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
