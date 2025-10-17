"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import type { UserSummary } from "@/types/users"
import type { Session } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import {
  CalendarTab,
  SettingsTab,
  StatsTab,
  TeamTab,
} from "@/components/dashboard/mobile-tabs"

type ApiShift = {
  id: number
  date: string
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

  return {
    id,
    name,
    email,
    calendarId,
  }
}

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
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
    return {
      id: shift.id,
      date: shift.date,
      type: shift.type,
      start: new Date(shift.date),
      end: new Date(shift.date),
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
    }: {
      date: string
      type: ShiftType
      note?: string
      label?: string
      color?: string
      pluses?: ShiftPluses
    }) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de crear turnos")
      }

      try {
        const response = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            type,
            ...(note ? { note } : {}),
            ...(label ? { label } : {}),
            ...(color ? { color } : {}),
            ...(pluses
              ? {
                  plusNight: pluses.night,
                  plusHoliday: pluses.holiday,
                  plusAvailability: pluses.availability,
                  plusOther: pluses.other,
                }
              : {}),
            userId: currentUser.id,
          }),
        })

        const data = await parseJsonResponse<{ shift: ApiShift }>(response)
        const newShift = mapApiShift(data.shift)
        setShifts((current) => sortByDate([...current, newShift]))
      } catch (error) {
        console.error("No se pudo crear el turno", error)
        throw error
      }
    },
    [currentUser, mapApiShift, parseJsonResponse, sortByDate]
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
    }: {
      id: number
      date: string
      type: ShiftType
      note?: string
      label?: string
      color?: string
      pluses?: ShiftPluses
    }) => {
      try {
        if (!currentUser) {
          throw new Error("Selecciona un usuario antes de actualizar turnos")
        }

        const response = await fetch(`/api/shifts/${id}?userId=${currentUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            type,
            note: note ?? null,
            label: label ?? null,
            color: color ?? null,
            plusNight: pluses?.night ?? 0,
            plusHoliday: pluses?.holiday ?? 0,
            plusAvailability: pluses?.availability ?? 0,
            plusOther: pluses?.other ?? 0,
            userId: currentUser.id,
          }),
        })

        const data = await parseJsonResponse<{ shift: ApiShift }>(response)
        const updatedShift = mapApiShift(data.shift)
        setShifts((current) =>
          sortByDate(
            current.map((shift) =>
              shift.id === id ? updatedShift : shift
            )
          )
        )
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setShifts((current) => current.filter((shift) => shift.id !== id))
          setSelectedShift((current) =>
            current && current.id === id ? null : current
          )

          console.error(`No se pudo actualizar el turno ${id}`, error)
          throw new ApiError(
            404,
            "El turno que intentabas editar ya no existe. Se ha eliminado de la vista."
          )
        }

        console.error(`No se pudo actualizar el turno ${id}`, error)
        throw error
      }
    },
    [currentUser, mapApiShift, parseJsonResponse, sortByDate]
  )

  const handleDeleteShift = useCallback(
    async (id: number) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de eliminar turnos")
      }

      try {
        const response = await fetch(
          `/api/shifts/${id}?userId=${currentUser.id}`,
          {
            method: "DELETE",
          }
        )

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

        setShifts((current) => current.filter((shift) => shift.id !== id))
      } catch (error) {
        console.error(`No se pudo eliminar el turno ${id}`, error)
        throw error
      }
    },
    [currentUser]
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
      try {
        setIsLoadingUsers(true)
        const response = await fetch("/api/users", { cache: "no-store" })
        const data = await parseJsonResponse<{
          users: Array<
            Omit<UserSummary, "calendarId"> & { calendarId?: number | null }
          >
        }>(
          response
        )

        if (!isMounted) {
          return
        }

        const sanitizedUsers = data.users
          .map((user) => sanitizeUserSummary(user))
          .filter((user): user is UserSummary => Boolean(user))

        setUsers(sanitizedUsers)
        setUserError(null)
      } catch (error) {
        console.error("No se pudieron cargar los usuarios", error)
        if (isMounted) {
          setUserError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los usuarios"
          )
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
  }, [parseJsonResponse])

  useEffect(() => {
    if (!currentUser) {
      setShifts([])
      return
    }

    let isMounted = true

    const loadShiftsFromApi = async () => {
      try {
        const data = await fetchShiftsFromApi(currentUser.id)
        if (!isMounted) {
          return
        }
        setShifts(sortByDate(data))
      } catch (error) {
        console.error("No se pudieron cargar los turnos desde la API", error)
        if (error instanceof ApiError && error.status === 404 && isMounted) {
          clearSession(
            "El usuario seleccionado ya no existe. Inicia sesión nuevamente."
          )
        }
      }
    }

    void loadShiftsFromApi()

    return () => {
      isMounted = false
    }
  }, [clearSession, currentUser, fetchShiftsFromApi, sortByDate])

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
      if (!session?.access_token) {
        if (currentUser) {
          clearSession(undefined, { skipSupabaseSignOut: true })
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
    [clearSession, currentUser, handleLoginSuccess],
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

  const handleUserCreated = useCallback((user: UserSummary) => {
    const sanitized = sanitizeUserSummary(user)
    if (!sanitized) {
      return
    }

    setUsers((current) => {
      const filtered = current.filter((item) => item.id !== sanitized.id)
      return [...filtered, sanitized].sort((a, b) => a.id.localeCompare(b.id))
    })
  }, [])

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
        <div className="hidden lg:block">
          <section className="rounded-3xl border border-white/10 bg-slate-950/70 px-6 py-6 shadow-[0_45px_120px_-55px_rgba(37,99,235,0.65)]">
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
              <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
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

                <TeamSpotlight
                  upcomingShifts={upcomingShifts}
                  shiftTypeLabels={SHIFT_TYPE_LABELS}
                />
              </div>

              <ConfigurationPanel
                user={currentUser}
                defaultPreferences={userPreferences}
                onSave={handleSavePreferences}
                isSaving={isSavingPreferences}
                lastSavedAt={preferencesSavedAt}
                onLogout={handleLogout}
              />
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

                  {activeMobileTab === "team" && (
                    <TeamTab
                      upcomingShifts={upcomingShifts}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                  )}

                  {activeMobileTab === "settings" && (
                    <SettingsTab
                      user={currentUser}
                      preferences={userPreferences}
                      onSave={handleSavePreferences}
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
