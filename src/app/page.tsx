"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftPluses, ShiftType } from "@/types/shifts"
import EditShiftModal from "@/components/EditShiftModal"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"
import ShiftPlannerLab from "@/components/ShiftPlannerLab"
import ConfigurationPanel, {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/components/dashboard/ConfigurationPanel"
import DashboardSidebar from "@/components/dashboard/DashboardSidebar"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import MobileAddShiftSheet from "@/components/dashboard/MobileAddShiftSheet"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import TeamSpotlight from "@/components/dashboard/TeamSpotlight"
import DailyHoursSummary from "@/components/dashboard/DailyHoursSummary"
import ChangeHistoryPanel from "@/components/dashboard/ChangeHistoryPanel"
import ResponsiveNav from "@/components/dashboard/ResponsiveNav"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import type { UserSummary } from "@/types/users"
import type { Session } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import {
  CalendarTab,
  HistoryTab,
  HoursTab,
  SettingsTab,
  StatsTab,
  TeamTab,
} from "@/components/dashboard/mobile-tabs"
import {
  addPendingShiftRequest,
  cacheShiftsForUser,
  cacheUsers,
  countPendingShiftRequests,
  listPendingShiftRequests,
  readCachedShiftsForUser,
  readCachedUsers,
  removePendingShiftRequest,
  updatePendingRequestsForOptimisticId,
  type CachedShiftEvent,
  type ShiftMutationRequestBody,
} from "@/lib/offline-db"
import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner"

type ApiShift = {
  id: number
  date: string
  startTime?: string | null
  endTime?: string | null
  durationMinutes?: number | null
  type: ShiftType
  note?: string | null
  label?: string | null
  color?: string | null
  plusNight?: number | null
  plusHoliday?: number | null
  plusAvailability?: number | null
  plusOther?: number | null
}

function toPositiveInteger(value: unknown): number | null {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : typeof value === "bigint"
          ? Number(value)
          : Number.NaN

  if (!Number.isFinite(numericValue)) {
    return null
  }

  const integerValue = Math.trunc(numericValue)
  if (integerValue <= 0) {
    return null
  }

  return integerValue
}

function sanitizeUserId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === "bigint") {
    const candidate = value.toString()
    return candidate.length > 0 ? candidate : null
  }

  return null
}

function sanitizeUserSummary(value: unknown): UserSummary | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Partial<UserSummary>
  const id = sanitizeUserId(
    candidate.id ?? (candidate as { userId?: unknown }).userId
  )

  if (!id) {
    return null
  }

  const calendarId =
    toPositiveInteger(
      candidate.calendarId ?? (candidate as { calendar_id?: unknown }).calendar_id
    ) ?? null

  const name =
    typeof candidate.name === "string" && candidate.name.trim().length > 0
      ? candidate.name
      : ""
  const email =
    typeof candidate.email === "string" && candidate.email.trim().length > 0
      ? candidate.email
      : ""
  const rawAvatar =
    (candidate as { avatarUrl?: unknown }).avatarUrl ??
    (candidate as { avatar_url?: unknown }).avatar_url ??
    null
  const avatarUrl =
    typeof rawAvatar === "string" && rawAvatar.trim().length > 0
      ? rawAvatar
      : null
  const rawTimezone =
    (candidate as { timezone?: unknown }).timezone ??
    (candidate as { time_zone?: unknown }).time_zone ??
    null
  const timezone =
    typeof rawTimezone === "string" && rawTimezone.trim().length > 0
      ? rawTimezone
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

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const DEFAULT_SHIFT_START_TIME = "09:00"
const DEFAULT_SHIFT_END_TIME = "17:00"

const HISTORY_STORAGE_KEY = "planloop:shift-history"
const MAX_HISTORY_ENTRIES = 100

type ShiftSnapshot = {
  date: string
  type: ShiftType
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  note?: string | null
  label?: string | null
  color?: string | null
  pluses?: ShiftPluses
}

type ShiftHistoryEntry = {
  id: string
  shiftId: number
  action: "create" | "update" | "delete"
  timestamp: string
  before?: ShiftSnapshot | null
  after?: ShiftSnapshot | null
}

const SECTION_IDS = ["overview", "calendar", "hours", "history", "team", "settings"] as const

const SESSION_STORAGE_KEY = "planloop:session"
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14 // 14 días

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TEMP_ID_BASE = -1_000_000
const BACKGROUND_SYNC_TAG = "sync-shifts"

function generateTemporaryShiftId(): number {
  const randomOffset = Math.floor(Math.random() * 10_000)
  return TEMP_ID_BASE - randomOffset - Date.now()
}

function isLikelyOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true
  }

  if (error instanceof TypeError) {
    return true
  }

  return false
}

function toCachedShiftEvent(
  shift: ShiftEvent,
  userId: string,
): CachedShiftEvent {
  return {
    id: shift.id,
    userId,
    date: shift.date,
    type: shift.type,
    start: shift.start.toISOString(),
    end: shift.end.toISOString(),
    startTime: shift.startTime,
    endTime: shift.endTime,
    durationMinutes: shift.durationMinutes,
    ...(shift.note ? { note: shift.note } : {}),
    ...(shift.label ? { label: shift.label } : {}),
    ...(shift.color ? { color: shift.color } : {}),
    ...(shift.pluses
      ? {
          pluses: {
            night: shift.pluses.night,
            holiday: shift.pluses.holiday,
            availability: shift.pluses.availability,
            other: shift.pluses.other,
          },
        }
      : {}),
  }
}

function fromCachedShiftEvent(shift: CachedShiftEvent): ShiftEvent {
  const startDate = new Date(shift.start)
  const endDate = new Date(shift.end)
  if (endDate.getTime() <= startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1)
  }
  const fallbackStartTime = startDate.toISOString().slice(11, 16)
  const fallbackEndTime = endDate.toISOString().slice(11, 16)
  const durationMinutes =
    typeof shift.durationMinutes === "number" && Number.isFinite(shift.durationMinutes)
      ? Math.max(0, Math.round(shift.durationMinutes))
      : Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
  return {
    id: shift.id,
    date: shift.date,
    type: shift.type,
    start: startDate,
    end: endDate,
    startTime:
      typeof shift.startTime === "string" && shift.startTime.trim().length >= 4
        ? shift.startTime.slice(0, 5)
        : fallbackStartTime,
    endTime:
      typeof shift.endTime === "string" && shift.endTime.trim().length >= 4
        ? shift.endTime.slice(0, 5)
        : fallbackEndTime,
    durationMinutes,
    ...(shift.note ? { note: shift.note } : {}),
    ...(shift.label ? { label: shift.label } : {}),
    ...(shift.color ? { color: shift.color } : {}),
    ...(shift.pluses
      ? {
          pluses: {
            night: shift.pluses.night,
            holiday: shift.pluses.holiday,
            availability: shift.pluses.availability,
            other: shift.pluses.other,
          },
        }
      : {}),
  }
}

function buildShiftRequestPayload(
  userId: string,
  {
    date,
    type,
    note,
    label,
    color,
    pluses,
    startTime,
    endTime,
  }: {
    date: string
    type: ShiftType
    note?: string
    label?: string
    color?: string
    pluses?: ShiftPluses
    startTime?: string | null
    endTime?: string | null
  },
): ShiftMutationRequestBody {
  return {
    date,
    type,
    note: note ?? null,
    label: label ?? null,
    color: color ?? null,
    plusNight: pluses?.night ?? 0,
    plusHoliday: pluses?.holiday ?? 0,
    plusAvailability: pluses?.availability ?? 0,
    plusOther: pluses?.other ?? 0,
    userId,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
  }
}

function createPendingRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function Home() {
  const [shifts, setShifts] = useState<ShiftEvent[]>([])
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] =
    useState<string | null>(null)
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("calendar")
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)
  const [isCommittingRotation, setIsCommittingRotation] = useState(false)
  const [rotationError, setRotationError] = useState<string | null>(null)
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES,
  )
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [preferencesSavedAt, setPreferencesSavedAt] = useState<Date | null>(
    null,
  )
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") {
      return false
    }

    return !navigator.onLine
  })
  const [isSyncingPendingShifts, setIsSyncingPendingShifts] = useState(false)
  const [pendingShiftMutations, setPendingShiftMutations] = useState(0)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const isSyncingRef = useRef(false)
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryEntry[]>(() => {
    if (typeof window === "undefined") {
      return []
    }
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!stored) {
        return []
      }
      const parsed = JSON.parse(stored) as ShiftHistoryEntry[] | null
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed.slice(0, MAX_HISTORY_ENTRIES)
    } catch (error) {
      console.error("No se pudo recuperar el historial guardado", error)
      return []
    }
  })
  const [activeSection, setActiveSection] = useState<string>(SECTION_IDS[0])

  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("No se pudo inicializar el cliente de Supabase", error)
      return null
    }
  }, [])

  const mapApiShift = useCallback((shift: ApiShift): ShiftEvent => {
    const plusNight = shift.plusNight ?? 0
    const plusHoliday = shift.plusHoliday ?? 0
    const plusAvailability = shift.plusAvailability ?? 0
    const plusOther = shift.plusOther ?? 0
    const hasPluses =
      plusNight > 0 || plusHoliday > 0 || plusAvailability > 0 || plusOther > 0
    const startTime =
      typeof shift.startTime === "string" && shift.startTime.trim().length >= 4
        ? shift.startTime.slice(0, 5)
        : null
    const endTime =
      typeof shift.endTime === "string" && shift.endTime.trim().length >= 4
        ? shift.endTime.slice(0, 5)
        : null
    const startDate = startTime
      ? new Date(`${shift.date}T${startTime}:00`)
      : new Date(`${shift.date}T00:00:00`)
    const endDate = endTime
      ? new Date(`${shift.date}T${endTime}:00`)
      : new Date(`${shift.date}T23:59:59`)
    if (endDate.getTime() <= startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1)
    }
    const durationMinutes =
      typeof shift.durationMinutes === "number" && Number.isFinite(shift.durationMinutes)
        ? Math.max(0, Math.round(shift.durationMinutes))
        : Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
    return {
      id: shift.id,
      date: shift.date,
      type: shift.type,
      start: startDate,
      end: endDate,
      startTime,
      endTime,
      durationMinutes,
      ...(shift.note && shift.note.trim().length > 0
        ? { note: shift.note }
        : {}),
      ...(shift.label && shift.label.trim().length > 0
        ? { label: shift.label }
        : {}),
      ...(shift.color && shift.color.trim().length > 0
        ? { color: shift.color }
        : {}),
      ...(hasPluses
        ? {
            pluses: {
              night: plusNight,
              holiday: plusHoliday,
              availability: plusAvailability,
              other: plusOther,
            },
          }
        : {}),
    }
  }, [])

  const parseJsonResponse = useCallback(async <T,>(response: Response) => {
    const payload = (await response.json().catch(() => null)) as
      | T
      | { error?: string }
      | null

    if (!response.ok || !payload) {
      const fallbackMessage = `Error en la solicitud (${response.status})`
      const message =
        payload &&
        typeof payload === "object"
          ? typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : fallbackMessage
          : fallbackMessage
      throw new ApiError(response.status, message)
    }

    return payload as T
  }, [])

  const fetchShiftsFromApi = useCallback(
    async (userId: string) => {
      const response = await fetch(`/api/shifts?userId=${userId}`, {
        cache: "no-store",
      })
      const data = await parseJsonResponse<{ shifts: ApiShift[] }>(response)
      return data.shifts.map((shift) => mapApiShift(shift))
    },
    [mapApiShift, parseJsonResponse]
  )

  const sortByDate = useCallback((items: ShiftEvent[]) => {
    return [...items].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(shiftHistory.slice(0, MAX_HISTORY_ENTRIES)),
      )
    } catch (error) {
      console.error("No se pudo guardar el historial de cambios", error)
    }
  }, [shiftHistory])

  const createSnapshot = useCallback((shift: ShiftEvent): ShiftSnapshot => {
    return {
      date: shift.date,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      durationMinutes: shift.durationMinutes,
      note: shift.note ?? null,
      label: shift.label ?? null,
      color: shift.color ?? null,
      pluses: shift.pluses
        ? {
            night: shift.pluses.night,
            holiday: shift.pluses.holiday,
            availability: shift.pluses.availability,
            other: shift.pluses.other,
          }
        : undefined,
    }
  }, [])

  const recordHistoryEntry = useCallback(
    (entry: Omit<ShiftHistoryEntry, "id" | "timestamp">) => {
      const identifier =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const timestamp = new Date().toISOString()
      setShiftHistory((current) => {
        const next = [{ id: identifier, timestamp, ...entry }, ...current]
        return next.slice(0, MAX_HISTORY_ENTRIES)
      })
    },
    [],
  )

  const navItems = useMemo(
    () => [
      { id: "overview", label: "Resumen", description: "Indicadores clave" },
      { id: "calendar", label: "Calendario", description: "Planificación" },
      { id: "hours", label: "Horas", description: "Totales diarios" },
      { id: "history", label: "Historial", description: "Cambios recientes" },
      { id: "team", label: "Equipo", description: "Disponibilidad" },
      { id: "settings", label: "Preferencias", description: "Perfil y cuenta" },
    ],
    [],
  )

  const handleNavigateSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    if (typeof window === "undefined") {
      return
    }
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          const currentId = visible[0].target.id
          if (currentId && SECTION_IDS.includes(currentId as (typeof SECTION_IDS)[number])) {
            setActiveSection(currentId)
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0.25, 0.6] },
    )

    SECTION_IDS.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const restoreSession = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedValue = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!storedValue) {
      return
    }
    try {
      const parsed = JSON.parse(storedValue) as {
        user?: unknown
        expiresAt?: unknown
      }

      const expiresAt =
        typeof parsed.expiresAt === "number"
          ? parsed.expiresAt
          : typeof parsed.expiresAt === "string"
            ? Number.parseInt(parsed.expiresAt, 10)
            : Number.NaN

      const user = sanitizeUserSummary(parsed.user)

      if (!user || !Number.isFinite(expiresAt)) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      if (expiresAt <= Date.now()) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      setCurrentUser(user)
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const persistSession = useCallback((user: UserSummary) => {
    if (typeof window === "undefined") {
      return
    }

    const sanitizedUser = sanitizeUserSummary(user)
    if (!sanitizedUser) {
      return
    }

    const payload = {
      user: sanitizedUser,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  }, [])

  const persistShiftsSnapshot = useCallback(
    (userId: string, snapshot: ShiftEvent[]) => {
      void cacheShiftsForUser(
        userId,
        snapshot.map((shift) => toCachedShiftEvent(shift, userId)),
      ).catch((error) => {
        console.error("No se pudo guardar la copia local de los turnos", error)
      })
    },
    [],
  )

  const refreshPendingMutations = useCallback(async (userId: string) => {
    try {
      const count = await countPendingShiftRequests(userId)
      setPendingShiftMutations(count)
    } catch (error) {
      console.error(
        "No se pudo comprobar el número de cambios pendientes",
        error,
      )
    }
  }, [])

  const requestBackgroundSync = useCallback(async () => {
    if (typeof window === "undefined") {
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }

    if (!("SyncManager" in window)) {
      return
    }

    try {
      const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> }
      }

      if (!registration.sync) {
        return
      }

      await registration.sync.register(BACKGROUND_SYNC_TAG)
    } catch (error) {
      console.warn("No se pudo registrar la sincronización en segundo plano", error)
    }
  }, [])

  const synchronizePendingShiftRequests = useCallback(async () => {
    if (!currentUser) {
      return
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
      return
    }

    if (isSyncingRef.current) {
      return
    }

    const userId = currentUser.id

    isSyncingRef.current = true
    setIsSyncingPendingShifts(true)
    setLastSyncError(null)

    let encounteredError = false

    try {
      const pending = await listPendingShiftRequests(userId)
      if (!pending.length) {
        setPendingShiftMutations(0)
        return
      }

      for (const entry of pending) {
        try {
          if (entry.method === "DELETE") {
            const response = await fetch(entry.url, { method: "DELETE" })
            if (!response.ok && response.status !== 404 && response.status !== 204) {
              const payload = (await response.json().catch(() => null)) as
                | { error?: string }
                | null
              const message =
                payload?.error ??
                `Error al sincronizar la eliminación (${response.status})`
              throw new Error(message)
            }

            setShifts((current) => {
              const target = entry.shiftId ?? entry.optimisticId
              const filtered =
                target == null ? current : current.filter((shift) => shift.id !== target)
              const next = sortByDate(filtered)
              persistShiftsSnapshot(userId, next)
              return next
            })
          } else if (entry.method === "POST" && entry.body) {
            const response = await fetch(entry.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entry.body),
            })

            const data = await parseJsonResponse<{ shift: ApiShift }>(response)
            const syncedShift = mapApiShift(data.shift)

            setShifts((current) => {
              const filtered = entry.optimisticId
                ? current.filter((shift) => shift.id !== entry.optimisticId)
                : current
              const next = sortByDate([...filtered, syncedShift])
              persistShiftsSnapshot(userId, next)
              return next
            })

            if (entry.optimisticId != null) {
              const updatedEntries = await updatePendingRequestsForOptimisticId(
                userId,
                entry.optimisticId,
                syncedShift.id,
              )

              if (updatedEntries.length > 0) {
                for (const updatedEntry of updatedEntries) {
                  const index = pending.findIndex(
                    (item) => item.id === updatedEntry.id,
                  )
                  if (index >= 0) {
                    pending[index] = updatedEntry
                  }
                }
              }
            }
          } else if (entry.method === "PATCH" && entry.body && entry.shiftId) {
            const response = await fetch(entry.url, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entry.body),
            })

            const data = await parseJsonResponse<{ shift: ApiShift }>(response)
            const syncedShift = mapApiShift(data.shift)

            setShifts((current) => {
              const updated = current.map((shift) =>
                shift.id === syncedShift.id ? syncedShift : shift,
              )
              const next = sortByDate(updated)
              persistShiftsSnapshot(userId, next)
              return next
            })
          }

          await removePendingShiftRequest(entry.id)
        } catch (error) {
          encounteredError = true
          console.error("No se pudo sincronizar una operación pendiente", error)
          setLastSyncError(
            error instanceof Error
              ? error.message
              : "No se pudieron sincronizar algunos cambios pendientes.",
          )
          break
        }
      }

      if (!encounteredError) {
        setLastSyncError(null)
        if (typeof navigator === "undefined" || navigator.onLine) {
          setIsOffline(false)
        }
      }
    } finally {
      await refreshPendingMutations(userId)
      setIsSyncingPendingShifts(false)
      isSyncingRef.current = false
    }
  }, [
    currentUser,
    mapApiShift,
    parseJsonResponse,
    persistShiftsSnapshot,
    refreshPendingMutations,
    sortByDate,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleOnline = () => {
      setIsOffline(false)
      void synchronizePendingShiftRequests()
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined
      if (data?.type === "SYNC_PENDING_REQUESTS") {
        void synchronizePendingShiftRequests()
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage,
      )
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage,
        )
      }
    }
  }, [synchronizePendingShiftRequests])

  const clearSession = useCallback(
    (message?: string, options?: { skipSupabaseSignOut?: boolean }) => {
      setCurrentUser(null)
      setSelectedShift(null)
      setShifts([])
      setSelectedDateFromCalendar(null)
      setUserError(message ?? null)

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }

      if (!options?.skipSupabaseSignOut && supabase) {
        void supabase.auth.signOut().catch((signOutError) => {
          console.error("No se pudo cerrar la sesión de Supabase", signOutError)
        })
      }
    },
    [supabase],
  )

  const handleAddShift = useCallback(
    async ({
      date,
      type,
      note,
      label,
      color,
      pluses,
      startTime,
      endTime,
    }: {
      date: string
      type: ShiftType
      note?: string
      label?: string
      color?: string
      pluses?: ShiftPluses
      startTime?: string | null
      endTime?: string | null
    }) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de crear turnos")
      }

      const userId = currentUser.id
      const payload = buildShiftRequestPayload(userId, {
        date,
        type,
        note,
        label,
        color,
        pluses,
        startTime,
        endTime,
      })

      try {
        const response = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await parseJsonResponse<{ shift: ApiShift }>(response)
        const newShift = mapApiShift(data.shift)
        setShifts((current) => {
          const next = sortByDate([...current, newShift])
          persistShiftsSnapshot(userId, next)
          recordHistoryEntry({
            shiftId: newShift.id,
            action: "create",
            after: createSnapshot(newShift),
          })
          return next
        })
        setIsOffline(false)
        setLastSyncError(null)
      } catch (error) {
        if (isLikelyOfflineError(error)) {
          const optimisticId = generateTemporaryShiftId()
          const optimisticShift = mapApiShift({
            id: optimisticId,
            date,
            type,
            note: payload.note,
            label: payload.label,
            color: payload.color,
            plusNight: payload.plusNight,
            plusHoliday: payload.plusHoliday,
            plusAvailability: payload.plusAvailability,
            plusOther: payload.plusOther,
            startTime: payload.startTime ?? undefined,
            endTime: payload.endTime ?? undefined,
          })

          setShifts((current) => {
            const next = sortByDate([...current, optimisticShift])
            persistShiftsSnapshot(userId, next)
            recordHistoryEntry({
              shiftId: optimisticShift.id,
              action: "create",
              after: createSnapshot(optimisticShift),
            })
            return next
          })

          await addPendingShiftRequest({
            id: createPendingRequestId(),
            userId,
            method: "POST",
            url: "/api/shifts",
            body: payload,
            optimisticId,
            createdAt: Date.now(),
          })

          await refreshPendingMutations(userId)
          void requestBackgroundSync()
          setIsOffline(true)
          return
        }

        console.error("No se pudo crear el turno", error)
        throw error
      }
    },
    [
      currentUser,
      createSnapshot,
      mapApiShift,
      parseJsonResponse,
      persistShiftsSnapshot,
      recordHistoryEntry,
      refreshPendingMutations,
      requestBackgroundSync,
      sortByDate,
    ],
  )

  const handleUpdateShift = useCallback(
    async ({
      id,
      date,
      type,
      note,
      label,
      color,
      pluses,
      startTime,
      endTime,
    }: {
      id: number
      date: string
      type: ShiftType
      note?: string
      label?: string
      color?: string
      pluses?: ShiftPluses
      startTime?: string | null
      endTime?: string | null
    }) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de actualizar turnos")
      }

      const userId = currentUser.id
      const payload = buildShiftRequestPayload(userId, {
        date,
        type,
        note,
        label,
        color,
        pluses,
        startTime,
        endTime,
      })

      try {
        const response = await fetch(`/api/shifts/${id}?userId=${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await parseJsonResponse<{ shift: ApiShift }>(response)
        const updatedShift = mapApiShift(data.shift)
        setShifts((current) => {
          let previousSnapshot: ShiftSnapshot | null = null
          const reordered = current.map((shift) => {
            if (shift.id === id) {
              previousSnapshot = createSnapshot(shift)
              return updatedShift
            }
            return shift
          })
          const next = sortByDate(reordered)
          persistShiftsSnapshot(userId, next)
          recordHistoryEntry({
            shiftId: updatedShift.id,
            action: previousSnapshot ? "update" : "create",
            before: previousSnapshot,
            after: createSnapshot(updatedShift),
          })
          return next
        })
        setIsOffline(false)
        setLastSyncError(null)
      } catch (error) {
        if (isLikelyOfflineError(error)) {
          const optimisticShift = mapApiShift({
            id,
            date,
            type,
            note: payload.note,
            label: payload.label,
            color: payload.color,
            plusNight: payload.plusNight,
            plusHoliday: payload.plusHoliday,
            plusAvailability: payload.plusAvailability,
            plusOther: payload.plusOther,
            startTime: payload.startTime ?? undefined,
            endTime: payload.endTime ?? undefined,
          })

          setShifts((current) => {
            let previousSnapshot: ShiftSnapshot | null = null
            const updatedList = current.map((shift) => {
              if (shift.id === id) {
                previousSnapshot = createSnapshot(shift)
                return optimisticShift
              }
              return shift
            })
            const next = sortByDate(updatedList)
            persistShiftsSnapshot(userId, next)
            recordHistoryEntry({
              shiftId: id,
              action: previousSnapshot ? "update" : "create",
              before: previousSnapshot,
              after: createSnapshot(optimisticShift),
            })
            return next
          })

          const isOptimisticShift = id < 0
          await addPendingShiftRequest({
            id: createPendingRequestId(),
            userId,
            method: "PATCH",
            url: `/api/shifts/${id}?userId=${userId}`,
            body: payload,
            shiftId: id,
            ...(isOptimisticShift ? { optimisticId: id } : {}),
            createdAt: Date.now(),
          })

          await refreshPendingMutations(userId)
          void requestBackgroundSync()
          setIsOffline(true)
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setShifts((current) => {
            const filtered = current.filter((shift) => shift.id !== id)
            const ordered = sortByDate(filtered)
            persistShiftsSnapshot(userId, ordered)
            return ordered
          })
          setSelectedShift((current) =>
            current && current.id === id ? null : current,
          )

          console.error(`No se pudo actualizar el turno ${id}`, error)
          throw new ApiError(
            404,
            "El turno que intentabas editar ya no existe. Se ha eliminado de la vista.",
          )
        }

        console.error(`No se pudo actualizar el turno ${id}`, error)
        throw error
      }
    },
    [
      currentUser,
      createSnapshot,
      mapApiShift,
      parseJsonResponse,
      persistShiftsSnapshot,
      recordHistoryEntry,
      refreshPendingMutations,
      requestBackgroundSync,
      sortByDate,
    ],
  )
  const handleDeleteShift = useCallback(
    async (id: number) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de eliminar turnos")
      }

      const userId = currentUser.id

      try {
        const response = await fetch(`/api/shifts/${id}?userId=${userId}`, {
          method: "DELETE",
        })

        if (!response.ok && response.status !== 204) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null
          const message =
            payload && payload.error
              ? payload.error
              : `Error al eliminar el turno (${response.status})`
          throw new Error(message)
        }

        setShifts((current) => {
          const target = current.find((shift) => shift.id === id) ?? null
          const next = sortByDate(current.filter((shift) => shift.id !== id))
          persistShiftsSnapshot(userId, next)
          if (target) {
            recordHistoryEntry({
              shiftId: id,
              action: "delete",
              before: createSnapshot(target),
            })
          }
          return next
        })
        setIsOffline(false)
        setLastSyncError(null)
      } catch (error) {
        if (isLikelyOfflineError(error)) {
          setShifts((current) => {
            const target = current.find((shift) => shift.id === id) ?? null
            const next = sortByDate(current.filter((shift) => shift.id !== id))
            persistShiftsSnapshot(userId, next)
            if (target) {
              recordHistoryEntry({
                shiftId: id,
                action: "delete",
                before: createSnapshot(target),
              })
            }
            return next
          })

          const isOptimisticShift = id < 0
          await addPendingShiftRequest({
            id: createPendingRequestId(),
            userId,
            method: "DELETE",
            url: `/api/shifts/${id}?userId=${userId}`,
            shiftId: id,
            ...(isOptimisticShift ? { optimisticId: id } : {}),
            createdAt: Date.now(),
          })

          await refreshPendingMutations(userId)
          void requestBackgroundSync()
          setIsOffline(true)
          return
        }

        console.error(`No se pudo eliminar el turno ${id}`, error)
        throw error
      }
    },
    [
      currentUser,
      createSnapshot,
      persistShiftsSnapshot,
      recordHistoryEntry,
      refreshPendingMutations,
      requestBackgroundSync,
      sortByDate,
    ],
  )

  const handleManualRotationConfirm = useCallback(
    async (days: ManualRotationDay[]) => {
      if (!currentUser) {
        setRotationError(
          "Selecciona un usuario antes de crear una rotación manual.",
        )
        return
      }

      const normalizeText = (value?: string | null) => (value ?? "").trim()
      const normalizeColor = (value?: string | null) =>
        normalizeText(value).toLowerCase()
      const ensurePluses = (pluses?: ShiftPluses) => ({
        night: pluses?.night ?? 0,
        holiday: pluses?.holiday ?? 0,
        availability: pluses?.availability ?? 0,
        other: pluses?.other ?? 0,
      })

      const desiredByDate = new Map(days.map((day) => [day.date, day]))
      const existingByDate = new Map(shifts.map((shift) => [shift.date, shift]))

      const additions: ManualRotationDay[] = []
      const updates: { day: ManualRotationDay; shift: ShiftEvent }[] = []
      const deletions: ShiftEvent[] = []

      for (const shift of shifts) {
        if (!desiredByDate.has(shift.date)) {
          deletions.push(shift)
        }
      }

      for (const day of days) {
        const existing = existingByDate.get(day.date)
        if (!existing) {
          additions.push(day)
          continue
        }

        const existingPluses = ensurePluses(existing.pluses)
        const dayPluses = ensurePluses(day.pluses)

        const requiresUpdate =
          existing.type !== day.type ||
          normalizeText(existing.note) !== normalizeText(day.note) ||
          normalizeText(existing.label) !== normalizeText(day.label) ||
          normalizeColor(existing.color) !== normalizeColor(day.color) ||
          existingPluses.night !== dayPluses.night ||
          existingPluses.holiday !== dayPluses.holiday ||
          existingPluses.availability !== dayPluses.availability ||
          existingPluses.other !== dayPluses.other

        if (requiresUpdate) {
          updates.push({ day, shift: existing })
        }
      }

      if (!additions.length && !updates.length && !deletions.length) {
        return
      }

      try {
        setIsCommittingRotation(true)
        setRotationError(null)

        for (const shift of deletions) {
          await handleDeleteShift(shift.id)
        }

        for (const { day, shift } of updates) {
          try {
            await handleUpdateShift({
              id: shift.id,
              date: day.date,
              type: day.type,
              note: day.note,
              label: day.label,
              color: day.color,
              pluses: day.pluses,
              startTime: shift.startTime ?? DEFAULT_SHIFT_START_TIME,
              endTime: shift.endTime ?? DEFAULT_SHIFT_END_TIME,
            })
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
              console.warn(
                `El turno ${shift.id} no existía en el servidor. Se intentará crear uno nuevo en su lugar.`,
                error,
              )
              await handleAddShift({
                date: day.date,
                type: day.type,
                ...(day.note ? { note: day.note } : {}),
                ...(day.label ? { label: day.label } : {}),
                ...(day.color ? { color: day.color } : {}),
                pluses: day.pluses,
                startTime: DEFAULT_SHIFT_START_TIME,
                endTime: DEFAULT_SHIFT_END_TIME,
              })
              continue
            }

            throw error
          }
        }

        for (const entry of additions) {
          await handleAddShift({
            date: entry.date,
            type: entry.type,
            ...(entry.note ? { note: entry.note } : {}),
            ...(entry.label ? { label: entry.label } : {}),
            ...(entry.color ? { color: entry.color } : {}),
            pluses: entry.pluses,
            startTime: DEFAULT_SHIFT_START_TIME,
            endTime: DEFAULT_SHIFT_END_TIME,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios. Inténtalo más tarde."
        setRotationError(message)
      } finally {
        setIsCommittingRotation(false)
      }
    },
    [currentUser, handleAddShift, handleDeleteShift, handleUpdateShift, shifts],
  )

  const handleSavePreferences = useCallback(async (preferences: UserPreferences) => {
    setIsSavingPreferences(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setUserPreferences(preferences)
      setPreferencesSavedAt(new Date())
    } finally {
      setIsSavingPreferences(false)
    }
  }, [])

  const handleUpdateProfile = useCallback(
    async ({
      name,
      timezone,
      avatarUrl,
    }: {
      name: string
      timezone: string
      avatarUrl: string | null
    }) => {
      if (!currentUser) {
        throw new Error("No hay una sesión activa para actualizar el perfil")
      }

      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: currentUser.email,
          timezone,
          avatarUrl,
          updatedBy: currentUser.id,
        }),
      })

      const data = await parseJsonResponse<{ user: UserSummary }>(response)
      const sanitized = sanitizeUserSummary(data.user)

      if (!sanitized) {
        throw new Error(
          "El servidor devolvió un perfil incompleto tras guardar los cambios",
        )
      }

      setCurrentUser(sanitized)
      persistSession(sanitized)

      let updatedUsers: UserSummary[] | null = null
      setUsers((previous) => {
        const exists = previous.some((user) => user.id === sanitized.id)
        const next = exists
          ? previous.map((user) =>
              user.id === sanitized.id ? sanitized : user,
            )
          : [...previous, sanitized]
        updatedUsers = next
        return next
      })

      const usersForCache = (updatedUsers ?? [sanitized]).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        calendarId: user.calendarId ?? null,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      }))

      try {
        await cacheUsers(usersForCache)
      } catch (error) {
        console.error("No se pudo actualizar la caché local de usuarios", error)
      }

      return sanitized
    },
    [currentUser, parseJsonResponse, persistSession],
  )

  const orderedShifts = useMemo(
    () => sortByDate(shifts),
    [shifts, sortByDate]
  )

  const plannerDays = useMemo(
    () =>
      orderedShifts.map((shift) => ({
        date: shift.date,
        type: shift.type,
        pluses: {
          night: shift.pluses?.night ?? 0,
          holiday: shift.pluses?.holiday ?? 0,
          availability: shift.pluses?.availability ?? 0,
          other: shift.pluses?.other ?? 0,
        },
        ...(shift.note ? { note: shift.note } : {}),
        ...(shift.label ? { label: shift.label } : {}),
        ...(shift.color ? { color: shift.color } : {}),
      })),
    [orderedShifts],
  )

  const upcomingShifts = useMemo(() => {
    return orderedShifts
      .filter(
        (shift) => differenceInCalendarDays(new Date(shift.date), new Date()) >= 0
      )
      .slice(0, 5)
  }, [orderedShifts])

  const nextShift = upcomingShifts[0]

  const daysUntilNextShift = useMemo(() => {
    if (!nextShift) return null
    return differenceInCalendarDays(new Date(nextShift.date), new Date())
  }, [nextShift])

  const typeCounts = useMemo(() => {
    return orderedShifts.reduce(
      (acc, shift) => {
        acc[shift.type] = (acc[shift.type] ?? 0) + 1
        return acc
      },
      {} as Record<ShiftType, number>
    )
  }, [orderedShifts])

  const currentMonthShifts = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return orderedShifts.filter((shift) => {
      const date = new Date(shift.date)
      return date.getMonth() === month && date.getFullYear() === year
    })
  }, [orderedShifts])

  const activeShiftTypes = Object.keys(typeCounts).length

  const dailyHoursSummary = useMemo(() => {
    const totals = new Map<string, { totalMinutes: number; shifts: ShiftEvent[] }>()
    for (const shift of orderedShifts) {
      const minutes = shift.durationMinutes
      const existing = totals.get(shift.date)
      if (existing) {
        existing.totalMinutes += minutes
        existing.shifts = [...existing.shifts, shift]
      } else {
        totals.set(shift.date, { totalMinutes: minutes, shifts: [shift] })
      }
    }

    return Array.from(totals.entries())
      .map(([date, data]) => ({
        date,
        totalMinutes: data.totalMinutes,
        shifts: data.shifts.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [orderedShifts])

  const nextShiftCountdownLabel = useMemo(() => {
    if (daysUntilNextShift === null) {
      return "Sin turno programado"
    }

    if (daysUntilNextShift === 0) {
      return "Hoy"
    }

    return `En ${daysUntilNextShift} día${daysUntilNextShift === 1 ? "" : "s"}`
  }, [daysUntilNextShift])

  const mobileGreeting = useMemo(() => {
    if (!currentUser?.name) {
      return "Planloop"
    }

    const [firstName] = currentUser.name.split(" ")
    return firstName && firstName.trim().length > 0
      ? firstName
      : currentUser.name
  }, [currentUser])

  const summaryCards = useMemo(
    () => [
      {
        title: "Turnos este mes",
        value: currentMonthShifts.length.toString(),
        description: "Programados",
      },
      {
        title: "Próximo turno",
        value: nextShift
          ? format(new Date(nextShift.date), "d MMM", { locale: es })
          : "Pendiente",
        description: nextShift ? nextShiftCountdownLabel : "Añade un turno",
      },
      {
        title: "Tipos activos",
        value: activeShiftTypes.toString(),
        description: "Variaciones en uso",
      },
      {
        title: "Equipo",
        value: users.length > 0 ? `${users.length} miembros` : "Sin datos",
        description: "En Planloop",
      },
    ],
    [
      activeShiftTypes,
      currentMonthShifts.length,
      nextShift,
      nextShiftCountdownLabel,
      users.length,
    ]
  )

  const upcomingCalendarShifts = useMemo(() => {
    return orderedShifts
      .filter((shift) => differenceInCalendarDays(new Date(shift.date), new Date()) >= -3)
      .slice(0, 10)
  }, [orderedShifts])

  useEffect(() => {
    if (!selectedDateFromCalendar) return
    if (typeof window === "undefined") return
    if (window.innerWidth < 1024) {
      setActiveMobileTab("calendar")
      setIsMobileAddOpen(true)
    }
  }, [selectedDateFromCalendar])

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      let usedCachedUsers = false

      if (typeof window !== "undefined") {
        try {
          const cached = await readCachedUsers()
          if (isMounted && cached.length > 0) {
            setUsers(cached)
            setUserError(null)
            setIsLoadingUsers(false)
            usedCachedUsers = true
          }
        } catch (error) {
          console.error("No se pudieron recuperar los usuarios en caché", error)
        }
      }

      try {
        if (!usedCachedUsers) {
          setIsLoadingUsers(true)
        }

        const response = await fetch("/api/users", { cache: "no-store" })
        const data = await parseJsonResponse<{
          users: Array<
            Omit<UserSummary, "calendarId"> & { calendarId?: number | null }
          >
        }>(response)

        if (!isMounted) {
          return
        }

        const sanitizedUsers = data.users
          .map((user) => sanitizeUserSummary(user))
          .filter((user): user is UserSummary => Boolean(user))

        setUsers(sanitizedUsers)
        setUserError(null)
        setIsLoadingUsers(false)

        try {
          await cacheUsers(
            sanitizedUsers.map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              calendarId: user.calendarId ?? null,
              avatarUrl: user.avatarUrl,
              timezone: user.timezone,
            })),
          )
        } catch (error) {
          console.error("No se pudieron guardar los usuarios en caché", error)
        }
      } catch (error) {
        console.error("No se pudieron cargar los usuarios", error)
        if (isMounted) {
          if (!usedCachedUsers) {
            setUserError(
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los usuarios",
            )
          }
          setIsLoadingUsers(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isMounted = false
    }
  }, [parseJsonResponse])

  useEffect(() => {
    if (!currentUser) {
      setShifts([])
      setPendingShiftMutations(0)
      return
    }

    let isMounted = true

    const loadShifts = async () => {
      const userId = currentUser.id

      if (typeof window !== "undefined") {
        try {
          const cached = await readCachedShiftsForUser(userId)
          if (isMounted && cached.length > 0) {
            const restored = sortByDate(cached.map((item) => fromCachedShiftEvent(item)))
            setShifts(restored)
          }
        } catch (error) {
          console.error("No se pudieron recuperar los turnos en caché", error)
        }
      }

      try {
        const data = await fetchShiftsFromApi(userId)
        if (!isMounted) {
          return
        }
        const ordered = sortByDate(data)
        setShifts(ordered)
        persistShiftsSnapshot(userId, ordered)
        setIsOffline(false)
        setLastSyncError(null)
      } catch (error) {
        console.error("No se pudieron cargar los turnos desde la API", error)
        if (error instanceof ApiError && error.status === 404 && isMounted) {
          clearSession(
            "El usuario seleccionado ya no existe. Inicia sesión nuevamente.",
          )
        }

        if (isMounted && isLikelyOfflineError(error)) {
          setIsOffline(true)
        }
      }
    }

    void loadShifts()
    void refreshPendingMutations(currentUser.id)

    return () => {
      isMounted = false
    }
  }, [
    clearSession,
    currentUser,
    fetchShiftsFromApi,
    persistShiftsSnapshot,
    refreshPendingMutations,
    sortByDate,
  ])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return
    }

    void synchronizePendingShiftRequests()
  }, [currentUser, synchronizePendingShiftRequests])

  const handleLoginSuccess = useCallback(
    (user: UserSummary) => {
      const sanitized = sanitizeUserSummary(user)
      if (!sanitized) {
        clearSession(
          "No se pudo validar la sesión del usuario. Vuelve a iniciar sesión.",
        )
        return
      }

      setCurrentUser(sanitized)
      persistSession(sanitized)
    },
    [clearSession, persistSession],
  )

  const synchronizeSupabaseSession = useCallback(
    async (session: Session | null) => {
      const isBrowserOffline =
        typeof navigator !== "undefined" && navigator && "onLine" in navigator
          ? !navigator.onLine
          : false

      if (!session?.access_token) {
        if (isBrowserOffline) {
          return
        }

        if (currentUser) {
          clearSession(undefined, { skipSupabaseSignOut: true })
        }
        return
      }

      if (isBrowserOffline) {
        if (!currentUser) {
          restoreSession()
        }
        return
      }

      try {
        const user = await exchangeAccessToken(session.access_token)
        if (!currentUser || currentUser.id !== user.id) {
          handleLoginSuccess(user)
        }
      } catch (error) {
        console.error("No se pudo validar la sesión de Supabase", error)
        clearSession(
          "No se pudo validar tu sesión actual. Vuelve a iniciar sesión.",
          { skipSupabaseSignOut: true },
        )
      }
    },
    [clearSession, currentUser, handleLoginSuccess, restoreSession],
  )

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isSubscribed = true

    const loadCurrentSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("No se pudo recuperar la sesión actual de Supabase", error)
          return
        }
        if (!isSubscribed) {
          return
        }
        await synchronizeSupabaseSession(data.session ?? null)
      } catch (error) {
        console.error("Error comprobando la sesión de Supabase", error)
      }
    }

    void loadCurrentSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isSubscribed) {
        return
      }
      void synchronizeSupabaseSession(session)
    })

    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [supabase, synchronizeSupabaseSession])

  const handleLogout = useCallback(() => {
    if (supabase) {
      void supabase.auth.signOut().catch((error) => {
        console.error("No se pudo cerrar la sesión de Supabase", error)
      })
    }
    clearSession(undefined, { skipSupabaseSignOut: true })
  }, [clearSession, supabase])

  const handleUserCreated = useCallback(
    (user: UserSummary) => {
      const sanitized = sanitizeUserSummary(user)
      if (!sanitized) {
        return
      }

      setUsers((current) => {
        const filtered = current.filter((item) => item.id !== sanitized.id)
        const next = [...filtered, sanitized].sort((a, b) =>
          a.id.localeCompare(b.id),
        )
        void cacheUsers(
          next.map((item) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            calendarId: item.calendarId ?? null,
            avatarUrl: item.avatarUrl,
            timezone: item.timezone,
          })),
        ).catch((error) => {
          console.error("No se pudieron actualizar los usuarios en caché", error)
        })
        return next
      })
    },
    [],
  )

  const handleOpenMobileAdd = useCallback(() => {
    setActiveMobileTab("calendar")
    setIsMobileAddOpen(true)
    setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))
  }, [])

  const handleCloseMobileAdd = useCallback(() => {
    setIsMobileAddOpen(false)
    setSelectedDateFromCalendar(null)
  }, [])

  const handleSelectShift = useCallback((shift: ShiftEvent) => {
    setSelectedShift(shift)
    setIsMobileAddOpen(false)
  }, [])

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
          <div className="w-full space-y-6">
            <OfflineStatusBanner
              isOffline={isOffline}
              pendingCount={pendingShiftMutations}
              isSyncing={isSyncingPendingShifts}
              lastError={lastSyncError}
              onRetry={synchronizePendingShiftRequests}
            />
            {userError && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {userError}
              </div>
            )}
            {isLoadingUsers ? (
              <FloatingParticlesLoader />
            ) : (
              <UserAuthPanel
                users={users}
                onLogin={handleLoginSuccess}
                onUserCreated={handleUserCreated}
              />
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="mx-auto flex min-h-screen w-full max-w-[120rem] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
      <DashboardSidebar />

      <div className="flex w-full flex-col">
        <OfflineStatusBanner
          isOffline={isOffline}
          pendingCount={pendingShiftMutations}
          isSyncing={isSyncingPendingShifts}
          lastError={lastSyncError}
          onRetry={synchronizePendingShiftRequests}
        />
        <ResponsiveNav
          items={navItems}
          activeId={activeSection}
          onNavigate={handleNavigateSection}
        />
        <div className="hidden lg:block">
          <section
            id="overview"
            className="rounded-3xl border border-white/10 bg-slate-950/70 px-6 py-6 shadow-[0_45px_120px_-55px_rgba(37,99,235,0.65)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-white/60">Hola, {mobileGreeting}</p>
                <h1 className="text-3xl font-semibold">Panel principal</h1>
                <p className="mt-1 text-sm text-white/50">
                  Supervisa tus turnos y el pulso de tu equipo desde un único lugar.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-white/50">
                  <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                  <p>{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-red-400/40 hover:text-red-200"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              {["Resumen", "Estadísticas", "Agenda", "Equipo"].map((tab) => (
                <span
                  key={tab}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1"
                >
                  {tab}
                </span>
              ))}
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-blue-500/10"
                >
                  <dt className="text-[11px] uppercase tracking-wide text-white/60">
                    {card.title}
                  </dt>
                  <dd className="mt-2 text-3xl font-semibold text-white">
                    {card.value}
                  </dd>
                  <p className="mt-1 text-xs text-white/50">{card.description}</p>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="mx-auto w-full max-w-7xl space-y-10 px-0 py-6 sm:px-2 lg:px-0">
            <div className="hidden lg:flex lg:flex-col lg:gap-8">
              <section
                id="calendar"
                className="rounded-3xl border border-white/10 bg-slate-950/70 p-6"
              >
              <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Calendario</h2>
                    <p className="text-sm text-white/60">
                      Visualiza y organiza tus turnos directamente en el calendario.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenMobileAdd}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-blue-400/40 hover:text-white"
                  >
                    <span aria-hidden className="text-base">＋</span>
                    Añadir turno
                  </button>
                </header>

                <div className="mt-6">
                  <ShiftPlannerLab
                    initialEntries={plannerDays}
                    onCommit={handleManualRotationConfirm}
                    isCommitting={isCommittingRotation}
                    errorMessage={rotationError}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Próximos turnos</h2>
                    <p className="text-sm text-white/60">
                      Consulta el listado de turnos programados a corto plazo.
                    </p>
                  </div>
                </header>

                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                  {upcomingCalendarShifts.length > 0 ? (
                    <ul className="divide-y divide-white/10">
                      {upcomingCalendarShifts.map((shift) => {
                        const daysFromToday = differenceInCalendarDays(
                          new Date(shift.date),
                          new Date()
                        )
                        const relativeLabel =
                          daysFromToday === 0
                            ? "Hoy"
                            : daysFromToday > 0
                              ? `En ${daysFromToday} día${daysFromToday === 1 ? "" : "s"}`
                              : `Hace ${Math.abs(daysFromToday)} día${Math.abs(daysFromToday) === 1 ? "" : "s"}`

                        return (
                          <li key={shift.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectShift(shift)}
                              className="flex w-full flex-col gap-3 bg-slate-950/40 px-5 py-4 text-left transition hover:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-xs uppercase tracking-wide text-white/50">
                                  {format(new Date(shift.date), "EEEE d 'de' MMMM", { locale: es })}
                                </p>
                                <p className="text-sm font-semibold text-white">
                                  {shift.label ?? SHIFT_TYPE_LABELS[shift.type] ?? shift.type}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                                  <span>
                                    {shift.startTime && shift.endTime
                                      ? `${shift.startTime} - ${shift.endTime}`
                                      : "Todo el día"}
                                  </span>
                                  {shift.durationMinutes > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/60">
                                      ⏱️ {`${Math.floor(shift.durationMinutes / 60)}h ${String(shift.durationMinutes % 60).padStart(2, "0")}m`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 sm:items-end">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: shift.color ?? "#64748b" }}
                                    aria-hidden
                                  />
                                  {SHIFT_TYPE_LABELS[shift.type] ?? shift.type}
                                </span>
                                <span className="text-xs text-white/40">{relativeLabel}</span>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 bg-slate-950/40 px-6 py-16 text-center text-sm text-white/60">
                      <p>No hay turnos próximos registrados.</p>
                      <button
                        type="button"
                        onClick={handleOpenMobileAdd}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-blue-400/40 hover:text-white"
                      >
                        Crear primer turno
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <div id="hours" className="mt-8">
                <DailyHoursSummary
                  entries={dailyHoursSummary}
                  shiftTypeLabels={SHIFT_TYPE_LABELS}
                />
              </div>

              <div id="history" className="mt-8">
                <ChangeHistoryPanel
                  entries={shiftHistory}
                  shiftTypeLabels={SHIFT_TYPE_LABELS}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                <NextShiftCard
                  nextShift={nextShift}
                  daysUntilNextShift={daysUntilNextShift}
                  shiftTypeLabels={SHIFT_TYPE_LABELS}
                />

                <PlanningHealthCard
                  currentMonthShiftCount={currentMonthShifts.length}
                  totalShiftCount={orderedShifts.length}
                  activeShiftTypes={activeShiftTypes}
                />

                <ShiftDistribution
                  typeCounts={typeCounts}
                  totalShifts={orderedShifts.length}
                  shiftTypeLabels={SHIFT_TYPE_LABELS}
                />

                <div id="team">
                  <TeamSpotlight
                    upcomingShifts={upcomingShifts}
                    shiftTypeLabels={SHIFT_TYPE_LABELS}
                  />
                </div>
              </div>

              <div id="settings">
                <ConfigurationPanel
                  user={currentUser}
                  defaultPreferences={userPreferences}
                  onSave={handleSavePreferences}
                  onUpdateProfile={handleUpdateProfile}
                  isSaving={isSavingPreferences}
                  lastSavedAt={preferencesSavedAt}
                  onLogout={handleLogout}
                />
              </div>
            </div>

              <div className="lg:hidden">
                <section className="relative -mx-4 mt-2">
                  <div
                    className="pointer-events-none absolute inset-x-4 top-0 h-full rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_65%)] blur-3xl"
                    aria-hidden
                  />
                  <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-6 shadow-2xl shadow-blue-500/20 backdrop-blur">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                          Tu panel hoy
                        </p>
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">
                          Hola, {mobileGreeting}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenMobileAdd}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/40 to-indigo-500/40 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400/50 hover:to-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                      >
                        <span aria-hidden className="text-lg font-bold leading-none">
                          +
                        </span>
                        Añadir turno
                      </button>
                    </div>
                    <p className="mt-4 text-sm text-white/70">
                      Mantén el control de tus turnos con la misma experiencia premium que en escritorio.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-blue-500/10">
                        <p className="text-[11px] uppercase tracking-wide text-white/60">
                          Este mes
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {currentMonthShifts.length}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Turnos programados
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-blue-500/10">
                        <p className="text-[11px] uppercase tracking-wide text-white/60">
                          Próximo turno
                        </p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {nextShift
                            ? format(new Date(nextShift.date), "d MMM", { locale: es })
                            : "Pendiente"}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          {nextShiftCountdownLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-blue-500/10">
                        <p className="text-[11px] uppercase tracking-wide text-white/60">
                          Tipos activos
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {activeShiftTypes}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Variaciones en uso
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-blue-500/10">
                        <p className="text-[11px] uppercase tracking-wide text-white/60">
                          Equipo
                        </p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {users.length > 0 ? `${users.length} miembros` : "Sin datos"}
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Activos en Planloop
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-6 pb-32">
                  {activeMobileTab === "calendar" && (
                    <CalendarTab
                      nextShift={nextShift ?? null}
                      daysUntilNextShift={daysUntilNextShift}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                      orderedShifts={orderedShifts}
                      plannerDays={plannerDays}
                      onCommitPlanner={handleManualRotationConfirm}
                      isCommittingPlanner={isCommittingRotation}
                      plannerError={rotationError}
                      onSelectEvent={handleSelectShift}
                    />
                  )}

                  {activeMobileTab === "stats" && (
                    <StatsTab
                      currentMonthShiftCount={currentMonthShifts.length}
                      totalShiftCount={orderedShifts.length}
                      activeShiftTypes={activeShiftTypes}
                      typeCounts={typeCounts}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  )}

                  {activeMobileTab === "hours" && (
                    <HoursTab
                      entries={dailyHoursSummary}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  )}

                  {activeMobileTab === "team" && (
                    <TeamTab
                      upcomingShifts={upcomingShifts}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  )}

                  {activeMobileTab === "history" && (
                    <HistoryTab
                      entries={shiftHistory}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  )}

                  {activeMobileTab === "settings" && (
                    <SettingsTab
                      user={currentUser}
                      preferences={userPreferences}
                      onSave={handleSavePreferences}
                      onUpdateProfile={handleUpdateProfile}
                      isSaving={isSavingPreferences}
                      lastSavedAt={preferencesSavedAt}
                      onLogout={handleLogout}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <MobileNavigation active={activeMobileTab} onChange={setActiveMobileTab} />

      <MobileAddShiftSheet
        open={isMobileAddOpen}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddShift}
        selectedDate={selectedDateFromCalendar}
        onDateConsumed={() => setSelectedDateFromCalendar(null)}
      />

      {selectedShift && (
        <EditShiftModal
          shift={selectedShift}
          onSave={async (shift) => {
            await handleUpdateShift(shift)
            setSelectedShift(null)
          }}
          onDelete={async (id) => {
            await handleDeleteShift(id)
            setSelectedShift(null)
          }}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  )
}
