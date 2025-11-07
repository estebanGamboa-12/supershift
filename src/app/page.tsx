"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { AnimatePresence, motion } from "framer-motion"
import type { ShiftEvent, ShiftPluses, ShiftType } from "@/types/shifts"
import EditShiftModal from "@/components/EditShiftModal"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import MobileAddShiftSheet from "@/components/dashboard/MobileAddShiftSheet"
import ResponsiveNav from "@/components/dashboard/ResponsiveNav"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import ActionFeedback, {
  type ActionFeedbackState,
} from "@/components/dashboard/ActionFeedback"
import type { UserSummary } from "@/types/users"
import type { Session } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import {
  loadUserPreferences as loadProfilePreferences,
  onUserPreferencesStorageChange,
  saveUserPreferences as persistUserPreferences,
} from "@/lib/user-preferences"
import { calculateWeeklyShiftSummaries } from "@/lib/shiftStatistics"
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
const HISTORY_STORAGE_VERSION = 2
const MAX_HISTORY_ENTRIES = 100

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

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

type StoredHistoryPayload = {
  version: number
  byUser: Record<string, ShiftHistoryEntry[]>
}

const DEFAULT_STORED_HISTORY: StoredHistoryPayload = {
  version: HISTORY_STORAGE_VERSION,
  byUser: {},
}

function loadHistoryFromStorage(): StoredHistoryPayload {
  if (typeof window === "undefined") {
    return DEFAULT_STORED_HISTORY
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_STORED_HISTORY
    }

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || Array.isArray(parsed) || !isRecord(parsed)) {
      return DEFAULT_STORED_HISTORY
    }

    const byUserRaw = (parsed as { byUser?: unknown }).byUser
    const byUser: Record<string, ShiftHistoryEntry[]> = {}

    if (isRecord(byUserRaw)) {
      for (const [userId, entries] of Object.entries(byUserRaw)) {
        if (Array.isArray(entries)) {
          byUser[userId] = (entries as ShiftHistoryEntry[]).slice(
            0,
            MAX_HISTORY_ENTRIES,
          )
        }
      }
    }

    return { version: HISTORY_STORAGE_VERSION, byUser }
  } catch (error) {
    console.error("No se pudo recuperar el historial guardado", error)
    return DEFAULT_STORED_HISTORY
  }
}

function persistHistoryToStorage(payload: StoredHistoryPayload): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({
        version: HISTORY_STORAGE_VERSION,
        byUser: payload.byUser,
      }),
    )
  } catch (error) {
    console.error("No se pudo guardar el historial de cambios", error)
  }
}

function updateHistoryInStorage(
  userId: string,
  entries: ShiftHistoryEntry[],
): void {
  if (typeof window === "undefined") {
    return
  }

  const payload = loadHistoryFromStorage()
  if (entries.length > 0) {
    payload.byUser[userId] = entries.slice(0, MAX_HISTORY_ENTRIES)
  } else {
    delete payload.byUser[userId]
  }

  persistHistoryToStorage(payload)
}

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
  const router = useRouter()
  const [shifts, setShifts] = useState<ShiftEvent[]>([])
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null)
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] =
    useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MobileTab>("calendar")
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
  const [actionFeedback, setActionFeedback] =
    useState<ActionFeedbackState | null>(null)
  const actionFeedbackTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryEntry[]>([])

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

  const {
    email: notificationEmailEnabled,
    push: notificationPushEnabled,
    reminders: notificationRemindersEnabled,
  } = userPreferences.notifications

  useEffect(() => {
    const record = loadProfilePreferences()
    if (record) {
      setUserPreferences(record.preferences)
      setPreferencesSavedAt(record.savedAt)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onUserPreferencesStorageChange((payload) => {
      if (!payload) {
        setUserPreferences(DEFAULT_USER_PREFERENCES)
        setPreferencesSavedAt(null)
        return
      }

      setUserPreferences(payload.preferences)
      setPreferencesSavedAt(payload.savedAt)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!notificationPushEnabled) {
      return
    }

    if (!("Notification" in window)) {
      return
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch((error) => {
        console.warn("No se pudo solicitar permiso de notificaciones push", error)
      })
    }
  }, [notificationPushEnabled])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    window.dispatchEvent(
      new CustomEvent("supershift:notification-preferences-changed", {
        detail: {
          email: notificationEmailEnabled,
          push: notificationPushEnabled,
          reminders: notificationRemindersEnabled,
        },
      }),
    )
  }, [
    notificationEmailEnabled,
    notificationPushEnabled,
    notificationRemindersEnabled,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const { search, hash } = window.location

    if (!hash) {
      return
    }

    const normalizedSource = `${search}${hash}`.toLowerCase()
    const patterns = [
      "access_token=",
      "refresh_token=",
      "type=recovery",
      "type=signup",
      "type=email_change",
      "code=",
    ]

    const shouldRedirect = patterns.some((pattern) =>
      normalizedSource.includes(pattern),
    )

    if (!shouldRedirect) {
      return
    }

    router.replace(`/auth/callback${search}${hash}`)
  }, [router])

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
    if (!currentUser) {
      return
    }

    updateHistoryInStorage(currentUser.id, shiftHistory)
  }, [currentUser, shiftHistory])

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
      { id: "calendar", label: "Calendario", description: "Planificación" },
      { id: "insights", label: "Resumen", description: "Indicadores y registros" },
      { id: "team", label: "Equipo", description: "Disponibilidad" },
      { id: "settings", label: "Preferencias", description: "Perfil y cuenta" },
    ],
    [],
  )

  const handleNavigateTab = useCallback((sectionId: string) => {
    setActiveTab(sectionId as MobileTab)
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!currentUser) {
      setShiftHistory([])
      return
    }

    const stored = loadHistoryFromStorage()
    const entries = stored.byUser[currentUser.id] ?? []
    setShiftHistory(entries.slice(0, MAX_HISTORY_ENTRIES))
  }, [currentUser])

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

  const dismissActionFeedback = useCallback(() => {
    if (actionFeedbackTimeoutRef.current) {
      clearTimeout(actionFeedbackTimeoutRef.current)
      actionFeedbackTimeoutRef.current = null
    }
    setActionFeedback(null)
  }, [])

  const showActionFeedback = useCallback(
    (type: ActionFeedbackState["type"], options?: { offline?: boolean }) => {
      const offline = options?.offline ?? false
      const baseMessages: Record<ActionFeedbackState["type"], string> = {
        create: "Turno guardado correctamente",
        update: "Cambios guardados",
        delete: "Turno eliminado",
      }
      const offlineMessages: Record<ActionFeedbackState["type"], string> = {
        create: "Turno guardado sin conexión",
        update: "Cambios listos para sincronizar",
        delete: "Turno eliminado (pendiente de sincronizar)",
      }

      if (actionFeedbackTimeoutRef.current) {
        clearTimeout(actionFeedbackTimeoutRef.current)
      }

      setActionFeedback({
        type,
        offline,
        message: offline ? offlineMessages[type] : baseMessages[type],
      })

      actionFeedbackTimeoutRef.current = setTimeout(() => {
        setActionFeedback(null)
        actionFeedbackTimeoutRef.current = null
      }, offline ? 5000 : 3400)
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (actionFeedbackTimeoutRef.current) {
        clearTimeout(actionFeedbackTimeoutRef.current)
        actionFeedbackTimeoutRef.current = null
      }
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
        showActionFeedback("create")
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
          showActionFeedback("create", { offline: true })
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
      showActionFeedback,
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
        showActionFeedback("update")
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
          showActionFeedback("update", { offline: true })
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
      showActionFeedback,
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
        showActionFeedback("delete")
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
          showActionFeedback("delete", { offline: true })
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
      showActionFeedback,
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
      const normalizeTimeValue = (
        value: string | null | undefined,
        fallback: string,
      ) => {
        if (typeof value === "string" && value.trim().length >= 4) {
          return value.trim().slice(0, 5)
        }
        return fallback
      }

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
        const desiredStartTime = normalizeTimeValue(
          day.startTime,
          DEFAULT_SHIFT_START_TIME,
        )
        const desiredEndTime = normalizeTimeValue(
          day.endTime,
          DEFAULT_SHIFT_END_TIME,
        )
        if (!existing) {
          additions.push({
            ...day,
            startTime: desiredStartTime,
            endTime: desiredEndTime,
          })
          continue
        }

        const existingPluses = ensurePluses(existing.pluses)
        const dayPluses = ensurePluses(day.pluses)
        const existingStartTime = normalizeTimeValue(
          existing.startTime,
          DEFAULT_SHIFT_START_TIME,
        )
        const existingEndTime = normalizeTimeValue(
          existing.endTime,
          DEFAULT_SHIFT_END_TIME,
        )

        const requiresUpdate =
          existing.type !== day.type ||
          normalizeText(existing.note) !== normalizeText(day.note) ||
          normalizeText(existing.label) !== normalizeText(day.label) ||
          normalizeColor(existing.color) !== normalizeColor(day.color) ||
          existingPluses.night !== dayPluses.night ||
          existingPluses.holiday !== dayPluses.holiday ||
          existingPluses.availability !== dayPluses.availability ||
          existingPluses.other !== dayPluses.other ||
          existingStartTime !== desiredStartTime ||
          existingEndTime !== desiredEndTime

        if (requiresUpdate) {
          updates.push({
            day: {
              ...day,
              startTime: desiredStartTime,
              endTime: desiredEndTime,
            },
            shift: existing,
          })
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
              startTime: day.startTime ?? DEFAULT_SHIFT_START_TIME,
              endTime: day.endTime ?? DEFAULT_SHIFT_END_TIME,
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
                startTime: day.startTime ?? DEFAULT_SHIFT_START_TIME,
                endTime: day.endTime ?? DEFAULT_SHIFT_END_TIME,
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
            startTime: entry.startTime ?? DEFAULT_SHIFT_START_TIME,
            endTime: entry.endTime ?? DEFAULT_SHIFT_END_TIME,
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

  const handleSavePreferences = useCallback(
    async (preferences: UserPreferences) => {
      setIsSavingPreferences(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 600))
        const { savedAt } = persistUserPreferences(preferences)
        setUserPreferences(preferences)
        setPreferencesSavedAt(savedAt)
      } finally {
        setIsSavingPreferences(false)
      }
    },
    [],
  )

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

  const weekStartsOn: 0 | 1 =
    userPreferences.startOfWeek === "monday" ? 1 : 0

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
        startTime:
          typeof shift.startTime === "string" && shift.startTime.trim().length >= 4
            ? shift.startTime.slice(0, 5)
            : null,
        endTime:
          typeof shift.endTime === "string" && shift.endTime.trim().length >= 4
            ? shift.endTime.slice(0, 5)
            : null,
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

  const weeklyShiftSummaries = useMemo(
    () =>
      calculateWeeklyShiftSummaries(
        orderedShifts.map((shift) => ({
          date: shift.date,
          durationMinutes: shift.durationMinutes,
          type: shift.type,
        })),
        { weekStartsOn },
      ),
    [orderedShifts, weekStartsOn],
  )

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
        icon: "🗓️",
      },
      {
        title: "Próximo turno",
        value: nextShift
          ? format(new Date(nextShift.date), "d MMM", { locale: es })
          : "Pendiente",
        description: nextShift ? nextShiftCountdownLabel : "Añade un turno",
        icon: "⏰",
      },
      {
        title: "Tipos activos",
        value: activeShiftTypes.toString(),
        description: "Variaciones en uso",
        icon: "📊",
      },
      {
        title: "Equipo",
        value: "Equipo activo",
        description: "En Planloop",
        icon: "👥",
      },
    ],
    [
      activeShiftTypes,
      currentMonthShifts.length,
      nextShift,
      nextShiftCountdownLabel,
    ]
  )

  useEffect(() => {
    if (!selectedDateFromCalendar) return
    if (typeof window === "undefined") return
    if (window.innerWidth < 1024) {
      setActiveTab("calendar")
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
        if (ordered.length === 0) {
          setShiftHistory([])
        }
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
    setActiveTab("calendar")
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
      <div className="no-card-borders min-h-screen bg-slate-950 text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-16">
          <div className="flex w-full flex-col gap-6">
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

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_80px_-48px_rgba(59,130,246,0.6)]">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <FloatingParticlesLoader />
                </div>
              ) : (
                <UserAuthPanel
                  users={users}
                  onLogin={handleLoginSuccess}
                  onUserCreated={handleUserCreated}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="no-card-borders relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.18),transparent_55%),_radial-gradient(circle_at_80%_105%,rgba(139,92,246,0.2),transparent_60%),_radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_65%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[120rem] px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex min-h-full w-full flex-col gap-7 lg:gap-8">
          <OfflineStatusBanner
            isOffline={isOffline}
            pendingCount={pendingShiftMutations}
            isSyncing={isSyncingPendingShifts}
            lastError={lastSyncError}
            onRetry={synchronizePendingShiftRequests}
          />
          <ResponsiveNav
            items={navItems}
            activeId={activeTab}
            onNavigate={handleNavigateTab}
          />
          <div className="hidden lg:block">
            <section className="dashboard-section px-6 py-6">
              <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(59,130,246,0.18),transparent_62%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_60%)]" />
              </div>
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                  <Link
                    href="/templates"
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-sky-400/40 hover:text-white"
                  >
                    Plantillas
                  </Link>
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
              {[
                "Calendario",
                "Estadísticas",
                "Horas",
                "Equipo",
                "Historial",
                "Configuración",
              ].map((tab) => (
                <span
                  key={tab}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1"
                >
                  {tab}
                </span>
              ))}
            </div>
          </section>
        </div>

        <main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="mx-auto w-full max-w-[110rem] space-y-12 px-0 py-6 sm:px-2 lg:px-0">
            <div className="hidden lg:flex lg:flex-col lg:gap-10">
              <AnimatePresence mode="wait">
                {activeTab === "calendar" && (
                  <motion.section
                    key="desktop-calendar"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="dashboard-section"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_60%)]" />
                    </div>
                    <div className="relative">
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
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:border-blue-400/40 hover:text-white"
                        >
                          <span aria-hidden className="text-base">＋</span>
                          Añadir turno
                        </button>
                      </header>

                      <div className="mt-6">
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
                      </div>
                    </div>
                  </motion.section>
                )}

                {activeTab === "insights" && (
                  <motion.div
                    key="desktop-insights"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex flex-col gap-10"
                  >
                    <section className="dashboard-section">
                      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.14),transparent_55%)]" />
                      </div>
                      <div className="relative">
                        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold">Indicadores clave</h2>
                            <p className="text-sm text-white/60">
                              Analiza la salud de tu planificación y los turnos programados.
                            </p>
                          </div>
                        </header>

                        <div className="mt-6">
                          <StatsTab
                            summaryCards={summaryCards}
                            currentMonthShiftCount={currentMonthShifts.length}
                            totalShiftCount={orderedShifts.length}
                            activeShiftTypes={activeShiftTypes}
                            typeCounts={typeCounts}
                            shiftTypeLabels={SHIFT_TYPE_LABELS}
                            weeklyShiftSummaries={weeklyShiftSummaries}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="dashboard-section">
                      <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_55%)]" />
                      </div>
                      <div className="relative">
                        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold">Horas registradas</h2>
                            <p className="text-sm text-white/60">
                              Consulta el total de horas agrupadas por día y tipo de turno.
                            </p>
                          </div>
                        </header>

                        <div className="mt-6">
                          <HoursTab
                            entries={dailyHoursSummary}
                            shiftTypeLabels={SHIFT_TYPE_LABELS}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="dashboard-section">
                      <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_62%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_58%)]" />
                      </div>
                      <div className="relative">
                        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="text-2xl font-semibold">Historial de cambios</h2>
                            <p className="text-sm text-white/60">
                              Revisa las modificaciones recientes y mantén el control del registro.
                            </p>
                          </div>
                        </header>

                        <div className="mt-6">
                          <HistoryTab
                            entries={shiftHistory}
                            shiftTypeLabels={SHIFT_TYPE_LABELS}
                          />
                        </div>
                      </div>
                    </section>
                  </motion.div>
                )}

                {activeTab === "team" && (
                  <motion.section
                    key="desktop-team"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="dashboard-section"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_58%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_55%)]" />
                    </div>
                    <div className="relative">
                      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold">Equipo conectado</h2>
                          <p className="text-sm text-white/60">
                            Anticípate a la disponibilidad del equipo y sus próximos turnos.
                          </p>
                        </div>
                      </header>

                      <div className="mt-6">
                        <TeamTab
                          upcomingShifts={upcomingShifts}
                          shiftTypeLabels={SHIFT_TYPE_LABELS}
                          currentUser={currentUser}
                        />
                      </div>
                    </div>
                  </motion.section>
                )}

                {activeTab === "settings" && (
                  <motion.section
                    key="desktop-settings"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="dashboard-section"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_58%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.14),transparent_55%)]" />
                    </div>
                    <div className="relative">
                      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold">Configuración</h2>
                          <p className="text-sm text-white/60">
                            Ajusta tus preferencias personales y la información de tu cuenta.
                          </p>
                        </div>
                      </header>

                      <div className="mt-6">
                        <SettingsTab
                          user={currentUser}
                          preferences={userPreferences}
                          onSave={handleSavePreferences}
                          onUpdateProfile={handleUpdateProfile}
                          isSaving={isSavingPreferences}
                          lastSavedAt={preferencesSavedAt}
                          onLogout={handleLogout}
                        />
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

              <div className="lg:hidden">
                <section className="relative -mx-4 mt-2">
                  <div
                    className="pointer-events-none absolute inset-x-4 top-0 h-full rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_65%)] blur-3xl"
                    aria-hidden
                  />
                  <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[rgba(13,18,32,0.82)] px-5 py-5 shadow-[0_35px_90px_-48px_rgba(59,130,246,0.75)] backdrop-blur-xl">
                    <div className="pointer-events-none absolute inset-0 opacity-85" aria-hidden>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_58%)]" />
                    </div>
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                          Tu panel hoy
                        </p>
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">
                          Hola, {mobileGreeting}
                        </h2>
                      </div>
                      <div className="flex flex-col items-end gap-2.5 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={handleOpenMobileAdd}
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/40 to-indigo-500/40 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400/50 hover:to-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                        >
                          <span aria-hidden className="text-lg font-bold leading-none">
                            +
                          </span>
                          Añadir turno
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-red-400/40 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                    <p className="relative mt-4 text-sm text-white/70">
                      Mantén el control de tus turnos con la misma experiencia premium que en escritorio.
                    </p>
                    <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141b2b]/90 px-3 py-3 shadow-[0_18px_40px_-22px_rgba(59,130,246,0.55)]">
                        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_65%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_60%)]" />
                        </div>
                        <span aria-hidden className="relative float-right text-lg">🗓️</span>
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
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141b2b]/90 px-3 py-3 shadow-[0_18px_40px_-22px_rgba(59,130,246,0.55)]">
                        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.15),transparent_58%)]" />
                        </div>
                        <span aria-hidden className="relative float-right text-lg">⏰</span>
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
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141b2b]/90 px-3 py-3 shadow-[0_18px_40px_-22px_rgba(59,130,246,0.55)]">
                        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_58%)]" />
                        </div>
                        <span aria-hidden className="relative float-right text-lg">📊</span>
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
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141b2b]/90 px-3 py-3 shadow-[0_18px_40px_-22px_rgba(59,130,246,0.55)]">
                        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_60%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_60%)]" />
                        </div>
                        <span aria-hidden className="relative float-right text-lg">👥</span>
                        <p className="text-[11px] uppercase tracking-wide text-white/60">
                          Equipo
                        </p>
                        <p className="mt-1 text-base font-semibold text-white">
                          Equipo activo
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Activos en Planloop
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:mt-6 sm:gap-6 sm:pb-32">
                  <AnimatePresence mode="wait">
                    {activeTab === "calendar" && (
                      <motion.div
                        key="mobile-calendar"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="w-full"
                      >
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
                      </motion.div>
                    )}

                    {activeTab === "insights" && (
                      <motion.div
                        key="mobile-insights"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="space-y-6"
                      >
                        <StatsTab
                          summaryCards={summaryCards}
                          currentMonthShiftCount={currentMonthShifts.length}
                          totalShiftCount={orderedShifts.length}
                          activeShiftTypes={activeShiftTypes}
                          typeCounts={typeCounts}
                          shiftTypeLabels={SHIFT_TYPE_LABELS}
                          weeklyShiftSummaries={weeklyShiftSummaries}
                        />

                        <HoursTab
                          entries={dailyHoursSummary}
                          shiftTypeLabels={SHIFT_TYPE_LABELS}
                        />

                        <HistoryTab
                          entries={shiftHistory}
                          shiftTypeLabels={SHIFT_TYPE_LABELS}
                        />
                      </motion.div>
                    )}

                    {activeTab === "team" && (
                      <motion.div
                        key="mobile-team"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        <TeamTab
                          upcomingShifts={upcomingShifts}
                          shiftTypeLabels={SHIFT_TYPE_LABELS}
                          currentUser={currentUser}
                        />
                      </motion.div>
                    )}

                    {activeTab === "settings" && (
                      <motion.div
                        key="mobile-settings"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        <SettingsTab
                          user={currentUser}
                          preferences={userPreferences}
                          onSave={handleSavePreferences}
                          onUpdateProfile={handleUpdateProfile}
                          isSaving={isSavingPreferences}
                          lastSavedAt={preferencesSavedAt}
                          onLogout={handleLogout}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <MobileNavigation active={activeTab} onChange={setActiveTab} />

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

      <ActionFeedback
        feedback={actionFeedback}
        onDismiss={dismissActionFeedback}
      />
    </div>
  )
}
