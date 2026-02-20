"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FC,
  type FormEvent,
} from "react"
import Image from "next/image"
import { formatCompactDate } from "@/lib/formatDate"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import type { TeamDetails, TeamInviteSummary, TeamRole } from "@/types/teams"
import type { UserSummary } from "@/types/users"
import { useConfirmDelete } from "@/lib/ConfirmDeleteContext"
import { useToast } from "@/lib/ToastContext"

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

type RepeatPattern = "none" | "weekly" | "biweekly" | "monthly"

type ShiftTemplate = {
  id: string
  name: string
  type: ShiftType
  startTime: string
  endTime: string
  repeat: RepeatPattern
  day: number
}

type ManagedShift = {
  key: string
  source: "shift" | "template"
  name: string
  date: string
  type: ShiftType
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  templateId?: string
}

const defaultTemplates: ShiftTemplate[] = [
  {
    id: "morning",
    name: "Cobertura mañana",
    type: "WORK",
    startTime: "08:00",
    endTime: "15:00",
    repeat: "weekly",
    day: 1,
  },
  {
    id: "night-support",
    name: "Guardia nocturna",
    type: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    repeat: "biweekly",
    day: 5,
  },
]

const weeklyDayLabels = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }
  return hours * 60 + minutes
}

function calculateDuration(start: string, end: string): number {
  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)
  const diff = endMinutes - startMinutes
  if (diff <= 0) {
    return 24 * 60 + diff
  }
  return diff
}

function generateTemplateOccurrences(
  template: ShiftTemplate,
  repeatEnabled: boolean,
): ManagedShift[] {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)

  const occurrences: ManagedShift[] = []
  const durationMinutes = calculateDuration(template.startTime, template.endTime)
  const occurrenceCount = template.repeat === "none" ? 1 : repeatEnabled ? 3 : 0

  const pushOccurrence = (date: Date) => {
    occurrences.push({
      key: `template-${template.id}-${date.toISOString().slice(0, 10)}`,
      source: "template",
      name: template.name,
      date: date.toISOString().slice(0, 10),
      type: template.type,
      startTime: template.startTime,
      endTime: template.endTime,
      durationMinutes,
      templateId: template.id,
    })
  }

  if (template.repeat === "none") {
    const first = new Date(baseDate)
    first.setDate(first.getDate() + 1)
    pushOccurrence(first)
    return occurrences
  }

  if (!repeatEnabled) {
    return occurrences
  }

  if (template.repeat === "weekly" || template.repeat === "biweekly") {
    const step = template.repeat === "weekly" ? 7 : 14
    const current = new Date(baseDate)
    const currentDay = current.getDay()
    const diff = (template.day - currentDay + 7) % 7
    current.setDate(current.getDate() + diff)

    for (let index = 0; index < occurrenceCount; index += 1) {
      const next = new Date(current)
      next.setDate(current.getDate() + index * step)
      pushOccurrence(next)
    }

    return occurrences
  }

  if (template.repeat === "monthly") {
    const dayOfMonth = Math.min(Math.max(template.day, 1), 28)
    let year = baseDate.getFullYear()
    let month = baseDate.getMonth()

    for (let index = 0; index < occurrenceCount; index += 1) {
      let candidate = new Date(year, month, dayOfMonth)
      if (candidate <= baseDate) {
        month += 1
        if (month > 11) {
          month = 0
          year += 1
        }
        candidate = new Date(year, month, dayOfMonth)
      }
      pushOccurrence(candidate)
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
  }

  return occurrences
}

function formatRepeatLabel(repeat: RepeatPattern, day: number): string {
  switch (repeat) {
    case "weekly":
      return `Cada ${weeklyDayLabels[day] ?? "semana"}`
    case "biweekly":
      return `Cada 2 semanas - ${weeklyDayLabels[day] ?? "día"}`
    case "monthly":
      return `Día ${day} de cada mes`
    default:
      return "Único"
  }
}

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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberActionError, setMemberActionError] = useState<string | null>(null)
  const [memberActionNotice, setMemberActionNotice] = useState<string | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const [templates, setTemplates] = useState<ShiftTemplate[]>(defaultTemplates)
  const [autoRepeatEnabled, setAutoRepeatEnabled] = useState(true)
  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "WORK" as ShiftType,
    startTime: "09:00",
    endTime: "17:00",
    repeat: "weekly" as RepeatPattern,
    day: 1,
  })
  const [viewMode, setViewMode] = useState<"team" | "individual">("individual")
  const [roleOverrides, setRoleOverrides] = useState<Record<string, TeamRole>>({})
  const [roleNotice, setRoleNotice] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string | null>>({})
  const [selectedIndividualId, setSelectedIndividualId] = useState<string | null>(null)
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

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
    if (!currentUser?.id || !team || currentUser.id !== team.ownerUserId) {
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
  const isCurrentUserOwner = Boolean(team && currentUser?.id === team.ownerUserId)
  const selectedMember = useMemo(
    () => memberList.find((member) => member.id === selectedMemberId) ?? null,
    [memberList, selectedMemberId],
  )

  const managedShifts = useMemo<ManagedShift[]>(() => {
    const actualShifts: ManagedShift[] = upcomingShifts.map((shift) => ({
      key: `shift-${shift.id}`,
      source: "shift",
      name: shift.label ?? shiftTypeLabels[shift.type] ?? shift.type,
      date: shift.date,
      type: shift.type,
      startTime: shift.startTime ?? null,
      endTime: shift.endTime ?? null,
      durationMinutes: shift.durationMinutes,
    }))

    const templateShifts = templates.flatMap((template) =>
      generateTemplateOccurrences(template, autoRepeatEnabled),
    )

    return [...actualShifts, ...templateShifts]
  }, [autoRepeatEnabled, shiftTypeLabels, templates, upcomingShifts])

  useEffect(() => {
    if (!memberList.length) {
      setRoleOverrides({})
      return
    }
    setRoleOverrides((current) => {
      const next: Record<string, TeamRole> = { ...current }
      for (const member of memberList) {
        if (!next[member.id]) {
          next[member.id] = member.role
        }
      }
      return next
    })
  }, [memberList])

  useEffect(() => {
    if (!memberList.length) {
      setSelectedIndividualId(null)
      return
    }
    if (!selectedIndividualId) {
      const fallback = currentUser?.id ?? memberList[0]?.id ?? null
      setSelectedIndividualId(fallback)
    }
  }, [currentUser?.id, memberList, selectedIndividualId])

  useEffect(() => {
    if (!memberList.length) {
      setAssignments({})
      return
    }
    setAssignments((current) => {
      const next: Record<string, string | null> = { ...current }
      for (const managedShift of managedShifts) {
        if (!next[managedShift.key]) {
          next[managedShift.key] = currentUser?.id ?? memberList[0]?.id ?? null
        }
      }
      return next
    })
  }, [currentUser?.id, managedShifts, memberList])

  useEffect(() => {
    if (isCurrentUserOwner) {
      setViewMode("team")
    } else {
      setViewMode("individual")
    }
  }, [isCurrentUserOwner])

  useEffect(() => {
    if (!selectedMemberId) {
      return
    }
    const exists = memberList.some((member) => member.id === selectedMemberId)
    if (!exists) {
      setSelectedMemberId(null)
    }
  }, [memberList, selectedMemberId])

  useEffect(() => {
    if (selectedMemberId) {
      setMemberActionError(null)
      setMemberActionNotice(null)
    }
  }, [selectedMemberId])

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!team || !currentUser?.id || currentUser.id !== team.ownerUserId) {
        return
      }

      if (memberId === currentUser.id) {
        setMemberActionError("No puedes eliminarte a ti mismo del equipo")
        return
      }

      setIsRemovingMember(true)
      setMemberActionError(null)
      setMemberActionNotice(null)

      try {
        const response = await fetch(
          `/api/teams/${encodeURIComponent(team.id)}/members/${encodeURIComponent(memberId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requesterId: currentUser.id }),
          },
        )

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        if (!response.ok) {
          throw new Error(
            (data && typeof data?.error === "string"
              ? data.error
              : null) ?? "No se pudo eliminar al miembro",
          )
        }

        setMemberActionNotice("Miembro eliminado correctamente")
        showToast({ type: "delete", message: "Miembro eliminado del equipo" })
        setSelectedMemberId(null)
        await refreshTeam(currentUser.id)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo eliminar al miembro"
        setMemberActionError(message)
      } finally {
        setIsRemovingMember(false)
      }
    },
    [currentUser?.id, refreshTeam, showToast, team],
  )

  const canRemoveSelectedMember = Boolean(
    selectedMember &&
      isCurrentUserOwner &&
      currentUser?.id &&
      selectedMember.id !== currentUser.id,
  )

  const assignmentSummary = useMemo(() => {
    const summary = new Map<
      string,
      { minutes: number; shifts: ManagedShift[]; memberName: string; role: TeamRole }
    >()

    for (const managedShift of managedShifts) {
      const assignedId = assignments[managedShift.key]
      if (!assignedId) {
        continue
      }
      const member = memberList.find((candidate) => candidate.id === assignedId)
      if (!member) {
        continue
      }
      const role = roleOverrides[member.id] ?? member.role
      if (!summary.has(member.id)) {
        summary.set(member.id, {
          minutes: 0,
          shifts: [],
          memberName: member.name,
          role,
        })
      }
      const record = summary.get(member.id)
      if (!record) {
        continue
      }
      record.minutes += managedShift.durationMinutes
      record.shifts.push(managedShift)
    }

    return summary
  }, [assignments, managedShifts, memberList, roleOverrides])

  const totalAssignedMinutes = useMemo(() => {
    let total = 0
    for (const record of assignmentSummary.values()) {
      total += record.minutes
    }
    return total
  }, [assignmentSummary])

  const handleRoleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>, memberId: string) => {
      const nextRole = event.target.value as TeamRole
      setRoleOverrides((current) => ({ ...current, [memberId]: nextRole }))
      setRoleNotice(
        "Rol actualizado solo a nivel visual. Sincroniza para aplicar cambios definitivos.",
      )
      setTimeout(() => setRoleNotice(null), 4000)
    },
    [],
  )

  const handleAssignmentChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>, shiftKey: string) => {
      const memberId = event.target.value
      setAssignments((current) => ({ ...current, [shiftKey]: memberId }))
    },
    [],
  )

  const handleTemplateFormChange = useCallback(
    <Field extends keyof typeof templateForm>(
      field: Field,
      value: (typeof templateForm)[Field],
    ) => {
      setTemplateForm((current) => ({ ...current, [field]: value }))
    },
    [],
  )

  const handleAddTemplate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!templateForm.name.trim()) {
        return
      }
      const newTemplate: ShiftTemplate = {
        id: `template-${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
        name: templateForm.name,
        type: templateForm.type,
        startTime: templateForm.startTime,
        endTime: templateForm.endTime,
        repeat: templateForm.repeat,
        day: templateForm.day,
      }
      setTemplates((current) => [newTemplate, ...current])
      setTemplateForm((current) => ({
        ...current,
        name: "",
      }))
    },
    [templateForm],
  )

  const handleRemoveTemplate = useCallback(
    (template: ShiftTemplate) => {
      confirmDelete({
        itemName: `la plantilla "${template.name}"`,
        onConfirm: () => {
          setTemplates((current) => current.filter((item) => item.id !== template.id))
          setAssignments((current) => {
            const next: Record<string, string | null> = {}
            for (const [key, value] of Object.entries(current)) {
              if (!key.startsWith(`template-${template.id}`)) {
                next[key] = value
              }
            }
            return next
          })
          showToast({ type: "delete", message: "Plantilla eliminada" })
        },
      })
    },
    [confirmDelete, showToast],
  )

  const selectedIndividualSummary = useMemo(() => {
    if (!selectedIndividualId) {
      return null
    }
    const record = assignmentSummary.get(selectedIndividualId)
    return record ?? null
  }, [assignmentSummary, selectedIndividualId])

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
              {memberList.map((member) => {
                const isSelected = member.id === selectedMemberId
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMemberId((current) =>
                          current === member.id ? null : member.id,
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/70 ${
                        isSelected
                          ? "border-blue-400/50 bg-blue-500/10"
                          : "border-white/10 bg-slate-900/70 hover:border-blue-300/30 hover:bg-slate-900/80"
                      }`}
                      aria-pressed={isSelected}
                      aria-expanded={isSelected}
                      aria-controls="team-member-details"
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
                      <div className="flex flex-col items-end gap-1 text-xs text-white/60">
                        <span>
                          Desde {formatCompactDate(new Date(member.joinedAt))}
                        </span>
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wide ${
                            isSelected ? "text-blue-100" : "text-blue-200/80"
                          }`}
                        >
                          {isSelected ? "Ocultar perfil" : "Ver perfil"}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            {memberList.length > 0 && (
              <div
                id="team-member-details"
                className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                {selectedMember ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        {selectedMember.avatarUrl ? (
                          <Image
                            src={selectedMember.avatarUrl}
                            alt={selectedMember.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-full border border-white/20 object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base font-semibold">
                            {formatMemberInitials(selectedMember.name)}
                          </span>
                        )}
                        <div>
                          <p className="text-base font-semibold text-white">
                            {selectedMember.name}
                          </p>
                          <p className="text-xs text-white/60">
                            {memberRoleLabel[selectedMember.role] ?? "Miembro"}
                          </p>
                        </div>
                      </div>
                      {canRemoveSelectedMember && (
                        <button
                          type="button"
                          onClick={() =>
                            confirmDelete({
                              itemName: `a ${selectedMember.name} del equipo`,
                              onConfirm: () => handleRemoveMember(selectedMember.id),
                            })
                          }
                          disabled={isRemovingMember}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isRemovingMember ? "Eliminando..." : "Eliminar del equipo"}
                        </button>
                      )}
                    </div>

                    <dl className="grid grid-cols-1 gap-3 text-sm text-white/80 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Correo
                        </dt>
                        <dd>{selectedMember.email || "No indicado"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Zona horaria
                        </dt>
                        <dd>{selectedMember.timezone ?? "No especificada"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Rol
                        </dt>
                        <dd>{memberRoleLabel[selectedMember.role] ?? "Miembro"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Miembro desde
                        </dt>
                        <dd>{formatCompactDate(new Date(selectedMember.joinedAt))}</dd>
                      </div>
                    </dl>

                    {isCurrentUserOwner &&
                      selectedMember.id === currentUser?.id && (
                        <p className="text-xs text-white/60">
                          Eres el propietario del equipo. No puedes eliminar tu propio
                          perfil.
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">
                    Selecciona un miembro para ver los detalles de su perfil.
                  </p>
                )}
                {memberActionNotice && (
                  <p className="text-xs text-emerald-200">{memberActionNotice}</p>
                )}
                {memberActionError && (
                  <p className="text-xs text-rose-200">{memberActionError}</p>
                )}
                {!isCurrentUserOwner && (
                  <p className="text-xs text-white/60">
                    Solo el propietario puede gestionar los miembros del equipo.
                  </p>
                )}
              </div>
            )}
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

      {team && memberList.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-200/80">
                Panel del propietario
              </p>
              <h4 className="text-xl font-semibold text-white">
                Vista de equipo, asignaciones y roles
              </h4>
              <p className="text-sm text-white/60">
                Ajusta rápidamente quién cubre cada plantilla y repasa la carga de horas por miembro.
              </p>
            </div>
            {isCurrentUserOwner ? (
              <div className="inline-flex overflow-hidden rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase tracking-wide">
                <button
                  type="button"
                  onClick={() => setViewMode("team")}
                  className={`rounded-full px-3 py-1 transition ${
                    viewMode === "team"
                      ? "bg-blue-500 text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Vista equipo
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("individual")}
                  className={`rounded-full px-3 py-1 transition ${
                    viewMode === "individual"
                      ? "bg-blue-500 text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Vista individual
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                <span aria-hidden>🔒</span>
                Solo ves tus propios turnos
              </span>
            )}
          </header>

          {roleNotice && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {roleNotice}
            </p>
          )}

          {viewMode === "team" && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Resumen de carga
                </p>
                <ul className="space-y-3">
                  {memberList.map((member) => {
                    const record = assignmentSummary.get(member.id)
                    const minutes = record?.minutes ?? 0
                    const ratio = totalAssignedMinutes
                      ? Math.min(1, minutes / totalAssignedMinutes)
                      : 0
                    const hours = Math.floor(minutes / 60)
                    const remainder = minutes % 60
                    const effectiveRole = roleOverrides[member.id] ?? member.role
                    return (
                      <li
                        key={`summary-${member.id}`}
                        className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{member.name}</p>
                            <p className="text-xs text-white/60">
                              {memberRoleLabel[effectiveRole] ?? "Miembro"}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-xs text-white/60 sm:items-end">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                              ⏱️ {hours}h {String(remainder).padStart(2, "0")}m asignados
                            </span>
                            <span className="text-[11px] text-white/40">
                              {record?.shifts.length ?? 0} turnos / plantillas
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Roles del equipo
                    </p>
                    <p className="text-sm text-white/60">
                      Cambia el rol visible de cada persona para anticipar permisos y responsabilidades.
                    </p>
                  </div>
                </header>
                <ul className="space-y-3">
                  {memberList.map((member) => {
                    const effectiveRole = roleOverrides[member.id] ?? member.role
                    return (
                      <li
                        key={`role-${member.id}`}
                        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{member.name}</p>
                          <p className="text-xs text-white/50">{member.email}</p>
                        </div>
                        <select
                          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-auto"
                          value={effectiveRole}
                          onChange={(event) => handleRoleChange(event, member.id)}
                          disabled={!isCurrentUserOwner || member.id === team.ownerUserId}
                        >
                          <option value="owner">Propietario</option>
                          <option value="admin">Administrador</option>
                          <option value="member">Miembro</option>
                        </select>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Asignación de turnos
                    </p>
                    <p className="text-sm text-white/60">
                      Distribuye turnos reales y los generados por plantilla con un clic.
                    </p>
                  </div>
                </header>
                {managedShifts.length > 0 ? (
                  <ul className="space-y-3">
                    {managedShifts.map((managedShift) => {
                      const assignment = assignments[managedShift.key] ?? ""
                      return (
                        <li
                          key={managedShift.key}
                          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {managedShift.name}
                              {managedShift.source === "template" && (
                                <span className="ml-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-blue-100">
                                  Plantilla
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-white/60">
                              {formatCompactDate(new Date(managedShift.date))}
                              {managedShift.startTime && managedShift.endTime
                                ? ` · ${managedShift.startTime} – ${managedShift.endTime}`
                                : " · Turno sin horario"}
                            </p>
                          </div>
                          <select
                            className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-auto"
                            value={assignment}
                            onChange={(event) => handleAssignmentChange(event, managedShift.key)}
                            disabled={!isCurrentUserOwner}
                          >
                            <option value="">Sin asignar</option>
                            {memberList.map((member) => (
                              <option key={`assign-${managedShift.key}-${member.id}`} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-white/60">
                    Añade turnos o plantillas para comenzar a asignar responsabilidades.
                  </p>
                )}
              </div>
            </div>
          )}

          {viewMode === "individual" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/50">Modo individual</p>
                  <h5 className="text-lg font-semibold text-white">
                    {selectedIndividualSummary?.memberName ?? "Selecciona un miembro"}
                  </h5>
                  <p className="text-sm text-white/60">
                    Visualiza únicamente los turnos y plantillas asignadas a la persona seleccionada.
                  </p>
                </div>
                <select
                  className="w-full max-w-xs rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={selectedIndividualId ?? ""}
                  onChange={(event) => setSelectedIndividualId(event.target.value || null)}
                  disabled={!isCurrentUserOwner && memberList.length <= 1}
                >
                  <option value="">Selecciona un miembro</option>
                  {memberList.map((member) => (
                    <option key={`individual-${member.id}`} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndividualSummary ? (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                      ⏱️ {Math.floor(selectedIndividualSummary.minutes / 60)}h {String(selectedIndividualSummary.minutes % 60).padStart(2, "0")}m asignados
                    </span>
                    <span className="text-xs text-white/50">
                      {selectedIndividualSummary.shifts.length} próximos turnos
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {selectedIndividualSummary.shifts.map((shift) => (
                      <li
                        key={`personal-${shift.key}`}
                        className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
                      >
                        <p className="text-sm font-semibold text-white">{shift.name}</p>
                        <p className="text-xs text-white/60">
                          {formatCompactDate(new Date(shift.date))}
                          {shift.startTime && shift.endTime
                            ? ` · ${shift.startTime} – ${shift.endTime}`
                            : " · Turno sin horario"}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60">
                          {shiftTypeLabels[shift.type] ?? shift.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/20 bg-slate-950/40 px-4 py-5 text-sm text-white/60">
                  Selecciona un miembro del equipo para ver su programación personal.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {team && memberList.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-200/80">
                Plantillas inteligentes
              </p>
              <h4 className="text-xl font-semibold text-white">Diseña y repite tus turnos estrella</h4>
              <p className="text-sm text-white/60">
                Guarda configuraciones frecuentes y deja que se programen automáticamente cuando lo necesites.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
              <span>Repetición automática</span>
              <input
                type="checkbox"
                checked={autoRepeatEnabled}
                onChange={(event) => setAutoRepeatEnabled(event.target.checked)}
                className="h-5 w-5 rounded border border-white/20 bg-slate-950 text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
          </header>

          <form className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4" onSubmit={handleAddTemplate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/60">Nombre</span>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(event) => handleTemplateFormChange("name", event.target.value)}
                  placeholder="Ej. Turno apertura"
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/60">Tipo</span>
                <select
                  value={templateForm.type}
                  onChange={(event) => handleTemplateFormChange("type", event.target.value as ShiftType)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="WORK">Trabajo</option>
                  <option value="REST">Descanso</option>
                  <option value="NIGHT">Nocturno</option>
                  <option value="VACATION">Vacaciones</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/60">Inicio</span>
                <input
                  type="time"
                  value={templateForm.startTime}
                  onChange={(event) => handleTemplateFormChange("startTime", event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/60">Fin</span>
                <input
                  type="time"
                  value={templateForm.endTime}
                  onChange={(event) => handleTemplateFormChange("endTime", event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/60">Repetición</span>
                <select
                  value={templateForm.repeat}
                  onChange={(event) => handleTemplateFormChange("repeat", event.target.value as RepeatPattern)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="none">Una sola vez</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-wide text-white/60">
                {templateForm.repeat === "monthly" ? "Día del mes" : "Día de la semana"}
              </span>
              {templateForm.repeat === "monthly" ? (
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={templateForm.day}
                  onChange={(event) =>
                    handleTemplateFormChange("day", Number.parseInt(event.target.value || "1", 10))
                  }
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              ) : (
                <select
                  value={templateForm.day}
                  onChange={(event) => handleTemplateFormChange("day", Number.parseInt(event.target.value, 10))}
                  className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white/80 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {weeklyDayLabels.map((label, index) => (
                    <option key={`weekday-${label}`} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!templateForm.name.trim()}
            >
              Guardar plantilla
            </button>
          </form>

          {templates.length > 0 ? (
            <ul className="space-y-3">
              {templates.map((template) => {
                const occurrences = generateTemplateOccurrences(template, autoRepeatEnabled)
                return (
                  <li
                    key={`template-preview-${template.id}`}
                    className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{template.name}</p>
                        <p className="text-xs text-white/60">
                          {formatRepeatLabel(template.repeat, template.day)} · {template.startTime} – {template.endTime}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                          {shiftTypeLabels[template.type] ?? template.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplate(template)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-100 transition hover:border-red-300/60 hover:bg-red-500/20"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {autoRepeatEnabled && occurrences.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-white/70">
                        <p className="font-semibold text-white/80">Próximas repeticiones</p>
                        <ul className="space-y-2">
                          {occurrences.map((occurrence) => (
                            <li key={`preview-${occurrence.key}`} className="flex items-center justify-between">
                              <span>{formatCompactDate(new Date(occurrence.date))}</span>
                              <span>
                                {occurrence.startTime} – {occurrence.endTime}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-white/60">
                        La repetición automática está desactivada. Actívala para planificar esta plantilla en el calendario.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/40 px-4 py-5 text-sm text-white/60">
              Aún no tienes plantillas guardadas. Crea una para acelerar tus turnos recurrentes.
            </p>
          )}
        </div>
      )}

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
            disabled={!team || !isCurrentUserOwner || isGeneratingInvite || spotsLeft <= 0}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!team
              ? "Crea un equipo para generar enlaces"
              : !isCurrentUserOwner
                ? "Solo el propietario puede generar enlaces"
                : spotsLeft <= 0
                  ? "Sin plazas disponibles"
                  : isGeneratingInvite
                    ? "Generando enlace..."
                    : "Generar enlace compartido"}
          </button>
          {inviteError && isCurrentUserOwner && (
            <p className="text-xs text-red-200">{inviteError}</p>
          )}
          {team && !isCurrentUserOwner && (
            <p className="text-xs text-blue-100/70">
              Solo la persona que creó el equipo puede compartir nuevos enlaces de
              invitación.
            </p>
          )}
        </div>

        {isCurrentUserOwner && invite && inviteUrl && (
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
