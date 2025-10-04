"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import EditShiftModal from "@/components/EditShiftModal"
import AddShiftForm from "@/components/AddShiftForm"
import RotationForm from "@/components/RotationForm"
import DashboardSidebar from "@/components/dashboard/DashboardSidebar"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import PlanningSection from "@/components/dashboard/PlanningSection"
import ShiftDistribution from "@/components/dashboard/ShiftDistribution"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import PlanningHealthCard from "@/components/dashboard/PlanningHealthCard"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import MobileAddShiftSheet from "@/components/dashboard/MobileAddShiftSheet"
import TeamSpotlight from "@/components/dashboard/TeamSpotlight"
import UserAuthPanel from "@/components/auth/UserAuthPanel"
import FloatingParticlesLoader from "@/components/FloatingParticlesLoader"
import AuroraBackground from "@/components/AuroraBackground"
import type { UserSummary } from "@/types/users"

type ApiShift = {
  id: number
  date: string
  type: ShiftType
  note?: string | null
}

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const SESSION_STORAGE_KEY = "supershift:session"
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

  const mapApiShift = useCallback((shift: ApiShift): ShiftEvent => {
    return {
      id: shift.id,
      date: shift.date,
      type: shift.type,
      start: new Date(shift.date),
      end: new Date(shift.date),
      ...(shift.note && shift.note.trim().length > 0
        ? { note: shift.note }
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
    async (userId: number) => {
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
        user?: UserSummary
        expiresAt?: number
      }

      if (!parsed?.user || typeof parsed.expiresAt !== "number") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      if (parsed.expiresAt <= Date.now()) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      setCurrentUser(parsed.user)
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

    const payload = {
      user,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  }, [])

  const handleAddShift = useCallback(
    async ({
      date,
      type,
      note,
    }: {
      date: string
      type: ShiftType
      note?: string
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

  const handleGenerateRotation = useCallback(
    async ({ startDate, cycle }: { startDate: string; cycle: number[] }) => {
      if (!currentUser) {
        throw new Error("Selecciona un usuario antes de generar rotaciones")
      }

      try {
        const response = await fetch("/api/shifts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate,
            cycle,
            userId: currentUser.id,
          }),
        })

        const data = await parseJsonResponse<{ shifts: ApiShift[] }>(response)
        const generatedShifts = data.shifts.map((shift) => mapApiShift(shift))
        setShifts(sortByDate(generatedShifts))
      } catch (error) {
        console.error("No se pudo generar la rotación", error)
        throw error
      }
    },
    [currentUser, mapApiShift, parseJsonResponse, sortByDate]
  )

  const handleSelectSlot = useCallback((slot: { start: Date }) => {
    setSelectedDateFromCalendar(format(slot.start, "yyyy-MM-dd"))
  }, [])

  const handleSelectShift = useCallback((shift: ShiftEvent) => {
    setSelectedShift(shift)
  }, [])

  const handleGoToToday = useCallback(() => {
    setSelectedDateFromCalendar(format(new Date(), "yyyy-MM-dd"))
  }, [])

  const handleUpdateShift = useCallback(
    async ({
      id,
      date,
      type,
      note,
    }: {
      id: number
      date: string
      type: ShiftType
      note?: string
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
          throw new Error(
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

  const orderedShifts = useMemo(
    () => sortByDate(shifts),
    [shifts, sortByDate]
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
        const data = await parseJsonResponse<{ users: (UserSummary & { calendarId?: number })[] }>(
          response
        )

        if (!isMounted) {
          return
        }

        const sanitizedUsers = data.users
          .filter((user) => typeof user.calendarId === "number")
          .map((user) => ({
            ...user,
            calendarId: Number(user.calendarId),
          }))

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
      }
    }

    void loadShiftsFromApi()

    return () => {
      isMounted = false
    }
  }, [currentUser, fetchShiftsFromApi, sortByDate])

  const handleLoginSuccess = useCallback(
    (user: UserSummary) => {
      setCurrentUser(user)
      persistSession(user)
    },
    [persistSession]
  )

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    setSelectedShift(null)
    setShifts([])
    setSelectedDateFromCalendar(null)

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  const handleUserCreated = useCallback((user: UserSummary) => {
    setUsers((current) => {
      const filtered = current.filter((item) => item.id !== user.id)
      return [...filtered, user].sort((a, b) => a.id - b.id)
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

  if (!currentUser) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <AuroraBackground />
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-16">
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <AuroraBackground />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <DashboardSidebar />

        <div className="flex w-full flex-col">
          <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/60 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-white">{currentUser.name}</p>
              <p className="text-xs text-white/60">{currentUser.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-red-400/40 hover:text-red-200"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/90 px-4 py-4 backdrop-blur lg:hidden">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Hoy es {format(new Date(), "EEEE d 'de' MMMM")}
                </p>
                <h1 className="text-2xl font-semibold">Supershift</h1>
              </div>
              <button
                type="button"
                onClick={handleGoToToday}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-blue-400/40 hover:text-white"
              >
                Ir a hoy
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <DashboardHeader
              onQuickAdd={handleGoToToday}
              nextShift={nextShift}
              daysUntilNextShift={daysUntilNextShift}
              shiftTypeLabels={SHIFT_TYPE_LABELS}
              currentMonthShiftCount={currentMonthShifts.length}
              totalShiftCount={orderedShifts.length}
              activeShiftTypes={activeShiftTypes}
              shifts={orderedShifts}
              onSearchSelect={handleSelectShift}
            />
          </div>

          <main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
              <div className="hidden gap-6 lg:grid lg:grid-cols-12">
                <section className="space-y-6 lg:col-span-9">
                  <PlanningSection
                    shifts={orderedShifts}
                    onSelectShift={handleSelectShift}
                    onSelectSlot={handleSelectSlot}
                    onGoToToday={handleGoToToday}
                  />

                  <ShiftDistribution
                    typeCounts={typeCounts}
                    totalShifts={orderedShifts.length}
                    shiftTypeLabels={SHIFT_TYPE_LABELS}
                  />
                </section>

                <aside className="space-y-6 lg:col-span-3">
                  <RotationForm onGenerate={handleGenerateRotation} />

                  <AddShiftForm
                    onAdd={handleAddShift}
                    selectedDate={selectedDateFromCalendar}
                    onDateConsumed={() => setSelectedDateFromCalendar(null)}
                  />
                </aside>
              </div>

              <div className="space-y-6 lg:hidden">
                {activeMobileTab === "calendar" && (
                  <div className="space-y-6">
                    <NextShiftCard
                      nextShift={nextShift}
                      daysUntilNextShift={daysUntilNextShift}
                      shiftTypeLabels={SHIFT_TYPE_LABELS}
                    />
                    <PlanningSection
                      shifts={orderedShifts}
                      onSelectShift={handleSelectShift}
                      onSelectSlot={handleSelectSlot}
                      onGoToToday={handleGoToToday}
                    />
                  </div>
                )}

                {activeMobileTab === "stats" && (
                  <div className="space-y-6">
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
                  </div>
                )}

                {activeMobileTab === "team" && (
                  <TeamSpotlight
                    upcomingShifts={upcomingShifts}
                    shiftTypeLabels={SHIFT_TYPE_LABELS}
                  />
                )}

                {activeMobileTab === "settings" && (
                  <div className="space-y-6">
                    <RotationForm onGenerate={handleGenerateRotation} />
                    <AddShiftForm
                      onAdd={handleAddShift}
                      selectedDate={selectedDateFromCalendar}
                      onDateConsumed={() => setSelectedDateFromCalendar(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenMobileAdd}
        className="fixed bottom-24 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-3xl font-bold text-white shadow-lg shadow-blue-500/40 transition hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 lg:hidden"
        aria-label="Añadir turno"
      >
        +
      </button>

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
