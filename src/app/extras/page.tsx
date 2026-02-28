"use client"

import { useEffect, useState, useCallback, useMemo as useMemoHook } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type ShiftExtra } from "@/types/preferences"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import NumberInput from "@/components/NumberInput"
import ExtraCard from "@/components/dashboard/ExtraCard"
import ExtraModal, { type ExtraFormPayload } from "@/components/dashboard/ExtraModal"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import type { Session } from "@supabase/supabase-js"
import type { UserSummary } from "@/types/users"
import { useConfirmDelete } from "@/lib/ConfirmDeleteContext"
import { useToast } from "@/lib/ToastContext"
import ScreenInfoIcon from "@/components/ui/ScreenInfoIcon"
import CreditsBottomBar from "@/components/dashboard/CreditsBottomBar"
import { runExtrasTour } from "@/components/onboarding/ExtrasOnboarding"

export default function ExtrasPage() {
  const router = useRouter()
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [extraModalOpen, setExtraModalOpen] = useState<"create" | ShiftExtra | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  const supabase = useMemoHook(() => {
    if (typeof window === "undefined") return null
    try {
      return getSupabaseBrowserClient()
    } catch {
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

  // Cargar sesión y usuario
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const resolveSession = async (session: Session | null) => {
      if (!session?.access_token) {
        if (isMounted) {
          setCurrentUser(null)
          setIsLoading(false)
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
          setIsLoading(false)
        }
      }
    }

    const loadInitialSession = async () => {
      try {
        if (isMounted) {
          setIsLoading(true)
        }
        const { data } = await supabase.auth.getSession()
        await resolveSession(data.session ?? null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
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

  // Cargar preferencias de localStorage (para extras y tarifa)
  useEffect(() => {
    const loaded = loadUserPreferences()
    if (loaded) {
      setPreferences(loaded.preferences)
    }
  }, [])

  // Si hay sesión, cargar extras y tarifa desde Supabase (fuente de verdad) y actualizar estado
  useEffect(() => {
    if (!supabase || !currentUser?.id) return

    let isMounted = true

    const syncFromDb = async () => {
      const userId = currentUser.id
      const [extrasRes, rateRes] = await Promise.all([
        supabase.from("user_shift_extras").select("id, name, value, color").eq("user_id", userId).order("created_at", { ascending: true }),
        supabase.from("user_hourly_rates").select("hourly_rate").eq("user_id", userId).maybeSingle(),
      ])

      if (!isMounted) return

      const localLoaded = loadUserPreferences()
      const localExtras = localLoaded?.preferences.shiftExtras ?? []
      const dbExtras = extrasRes.data && Array.isArray(extrasRes.data) ? extrasRes.data : null

      // Si en BD no hay extras pero en localStorage sí, migrar una vez a la BD
      if (dbExtras && dbExtras.length === 0 && localExtras.length > 0) {
        const toInsert = localExtras
          .filter((e) => e.name?.trim())
          .map((e) => ({ user_id: userId, name: e.name.trim(), value: e.value, color: e.color ?? "#3b82f6" }))
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase.from("user_shift_extras").insert(toInsert).select("id, name, value, color")
          if (inserted?.length && isMounted) {
            const migrated = inserted.map((row: { id: string; name: string; value: number; color?: string | null }) => ({
              id: row.id,
              name: row.name,
              value: Number(row.value),
              color: row.color ?? undefined,
            }))
            setPreferences((prev) => ({ ...prev, shiftExtras: migrated }))
            saveUserPreferences({ ...localLoaded!.preferences, shiftExtras: migrated })
            return
          }
        }
      }

      const mappedExtras =
        dbExtras?.map((row: { id: string; name: string; value: number; color?: string | null }) => ({
          id: row.id,
          name: row.name,
          value: Number(row.value),
          color: row.color ?? undefined,
        })) ?? null

      setPreferences((prev) => {
        const next = { ...prev }
        if (mappedExtras !== null) next.shiftExtras = mappedExtras
        if (rateRes.data && typeof rateRes.data.hourly_rate === "number") next.hourlyRate = rateRes.data.hourly_rate
        return next
      })

      if (localLoaded) {
        const merged = {
          ...localLoaded.preferences,
          shiftExtras: mappedExtras ?? localLoaded.preferences.shiftExtras,
          hourlyRate: rateRes.data && typeof rateRes.data.hourly_rate === "number" ? rateRes.data.hourly_rate : localLoaded.preferences.hourlyRate,
        }
        saveUserPreferences(merged)
      }
    }

    void syncFromDb()
    return () => {
      isMounted = false
    }
  }, [supabase, currentUser?.id])

  const handleAddExtra = async (data: ExtraFormPayload) => {
    const { name, value, color } = data
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (currentUser?.id && supabase) {
      const { data: inserted, error } = await supabase
        .from("user_shift_extras")
        .insert({ user_id: currentUser.id, name: trimmedName, value, color })
        .select("id")
        .single()

      if (error) {
        console.error("Error al guardar extra en la base de datos", error)
        showToast({ type: "error", message: "No se pudo guardar el extra. Inténtalo de nuevo." })
        throw new Error("No se pudo guardar")
      }

      const extra: ShiftExtra = {
        id: inserted.id,
        name: trimmedName,
        value,
        color,
      }
      const updated = {
        ...preferences,
        shiftExtras: [...(preferences.shiftExtras ?? []), extra],
      }
      setPreferences(updated)
      saveUserPreferences(updated)
      showToast({ type: "create", message: "Extra creado" })
      return
    }

    const extra: ShiftExtra = {
      id: `extra-${Date.now()}`,
      name: trimmedName,
      value,
      color,
    }
    const updated = {
      ...preferences,
      shiftExtras: [...(preferences.shiftExtras ?? []), extra],
    }
    setPreferences(updated)
    saveUserPreferences(updated)
    showToast({ type: "create", message: "Extra creado" })
  }

  const handleDeleteExtra = (id: string) => {
    const extra = preferences.shiftExtras?.find((e) => e.id === id)
    const itemName = extra ? `el extra "${extra.name}"` : "este extra"
    confirmDelete({
      itemName,
      onConfirm: async () => {
        if (currentUser?.id && supabase && /^[0-9a-f-]{36}$/i.test(id)) {
          const { error } = await supabase.from("user_shift_extras").delete().eq("id", id).eq("user_id", currentUser.id)
          if (error) {
            console.error("Error al eliminar extra en la base de datos", error)
            showToast({ type: "error", message: "No se pudo eliminar el extra." })
            return
          }
        }
        const updated = {
          ...preferences,
          shiftExtras: (preferences.shiftExtras ?? []).filter((e) => e.id !== id),
        }
        setPreferences(updated)
        saveUserPreferences(updated)
        setExtraModalOpen(null)
        showToast({ type: "delete", message: "Extra eliminado" })
      },
    })
  }

  const handleSaveExtraModal = async (data: ExtraFormPayload) => {
    if (extraModalOpen === "create" || extraModalOpen === null) {
      await handleAddExtra(data)
    } else {
      await handleUpdateExtra(extraModalOpen.id, data)
      setExtraModalOpen(null)
      showToast({ type: "update", message: "Guardado" })
    }
  }

  const handleUpdateExtra = async (id: string, updates: Partial<ShiftExtra> | ExtraFormPayload) => {
    const payload = "name" in updates && "value" in updates && "color" in updates
      ? { name: updates.name, value: updates.value, color: updates.color }
      : updates
    const updated = {
      ...preferences,
      shiftExtras: (preferences.shiftExtras ?? []).map((e) =>
        e.id === id ? { ...e, ...payload } : e,
      ),
    }
    setPreferences(updated)
    if (currentUser?.id && supabase && /^[0-9a-f-]{36}$/i.test(id)) {
      const toSend: { name?: string; value?: number; color?: string } = {}
      if (payload.name !== undefined) toSend.name = payload.name
      if (payload.value !== undefined) toSend.value = payload.value
      if (payload.color !== undefined) toSend.color = payload.color
      if (Object.keys(toSend).length > 0) {
        const { error } = await supabase.from("user_shift_extras").update(toSend).eq("id", id).eq("user_id", currentUser.id)
        if (error) {
          console.error("Error al actualizar extra en la base de datos", error)
          throw new Error("No se pudo guardar")
        }
      }
    }
    saveUserPreferences(updated)
  }

  const handleSetHourlyRate = async (rate: number) => {
    const updated = { ...preferences, remunerationType: "hourly" as const, hourlyRate: rate }
    setPreferences(updated)
    saveUserPreferences(updated)

    if (currentUser?.id && supabase) {
      const { error } = await supabase.from("user_hourly_rates").upsert(
        { user_id: currentUser.id, hourly_rate: rate, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      if (error) console.error("Error al guardar tarifa en la base de datos", error)
    }
  }

  const handleSetRemunerationType = (type: "hourly" | "salary") => {
    if (type === "salary") {
      const monthly = preferences.monthlySalary ?? 0
      const hoursWeek = preferences.hoursPerWeek ?? 40
      const hoursPerMonth = hoursWeek * (52 / 12)
      const updated = {
        ...preferences,
        remunerationType: "salary" as const,
        monthlySalary: monthly,
        hoursPerWeek: hoursWeek,
        hourlyRate: hoursPerMonth > 0 ? monthly / hoursPerMonth : 0,
      }
      setPreferences(updated)
      saveUserPreferences(updated)
      if (currentUser?.id && supabase && hoursPerMonth > 0) {
        const effectiveRate = monthly / hoursPerMonth
        supabase.from("user_hourly_rates").upsert(
          { user_id: currentUser.id, hourly_rate: effectiveRate, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        ).then(({ error }) => { if (error) console.error("Error al guardar tarifa", error) })
      }
    } else {
      const updated = { ...preferences, remunerationType: "hourly" as const }
      setPreferences(updated)
      saveUserPreferences(updated)
      updateEffectiveRateAndSupabase(preferences.hourlyRate ?? 0, null)
    }
  }

  const updateEffectiveRateAndSupabase = async (monthlyOrHourly: number, hoursPerWeek: number | null) => {
    const effectiveRate = hoursPerWeek != null && hoursPerWeek > 0
      ? monthlyOrHourly / (hoursPerWeek * (52 / 12))
      : monthlyOrHourly
    const updated = {
      ...preferences,
      hourlyRate: effectiveRate,
      ...(hoursPerWeek != null
        ? { monthlySalary: monthlyOrHourly, hoursPerWeek }
        : { remunerationType: "hourly" as const }),
    }
    setPreferences(updated)
    saveUserPreferences(updated)
    if (currentUser?.id && supabase) {
      const { error } = await supabase.from("user_hourly_rates").upsert(
        { user_id: currentUser.id, hourly_rate: effectiveRate, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      if (error) console.error("Error al guardar tarifa en la base de datos", error)
    }
  }

  const handleSetMonthlySalary = async (value: number) => {
    const hoursWeek = preferences.hoursPerWeek ?? 40
    const hoursPerMonth = hoursWeek * (52 / 12)
    const updated = { ...preferences, remunerationType: "salary" as const, monthlySalary: value, hoursPerWeek: hoursWeek }
    const effectiveRate = hoursPerMonth > 0 ? value / hoursPerMonth : 0
    const final = { ...updated, hourlyRate: effectiveRate }
    setPreferences(final)
    saveUserPreferences(final)
    if (currentUser?.id && supabase) {
      const { error } = await supabase.from("user_hourly_rates").upsert(
        { user_id: currentUser.id, hourly_rate: effectiveRate, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      if (error) console.error("Error al guardar tarifa en la base de datos", error)
    }
  }

  const handleSetHoursPerWeek = async (value: number) => {
    const salary = preferences.monthlySalary ?? 0
    const hoursPerMonth = value * (52 / 12)
    const updated = { ...preferences, remunerationType: "salary" as const, hoursPerWeek: value, monthlySalary: salary }
    const effectiveRate = hoursPerMonth > 0 ? salary / hoursPerMonth : 0
    const final = { ...updated, hourlyRate: effectiveRate }
    setPreferences(final)
    saveUserPreferences(final)
    if (currentUser?.id && supabase) {
      const { error } = await supabase.from("user_hourly_rates").upsert(
        { user_id: currentUser.id, hourly_rate: effectiveRate, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      if (error) console.error("Error al guardar tarifa en la base de datos", error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 sm:pb-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-8"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <PlanLoopLogo size="sm" showText={true} />
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-sky-400" />
                  Cargando…
                </div>
              ) : null}
              <button
                onClick={() => window.history.back()}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                ← Panel
              </button>
              {(preferences.showInfoIcon ?? true) && (
                <ScreenInfoIcon title="Extras" placement="bottom" className="shrink-0" onLaunchTour={() => setTimeout(runExtrasTour, 300)}>
                  <p>Los extras son conceptos que sumas al valor de un turno (nocturnidad, festivos, disponibilidad, etc.).</p>
                  <p className="mt-2">Puedes indicar si cobras por <strong>tarifa por horas</strong> (€/h) o <strong>sueldo base</strong> (sueldo mensual). Si eliges sueldo base, indica cuántas horas trabajas a la semana y calculamos la tarifa por hora (sueldo ÷ horas semanales, pasando a mes con 52 semanas/año). Los extras se suman a ese valor.</p>
                  <p className="mt-2">Crea aquí los extras que uses y asígnelos al editar un turno en el calendario. Pulsa <strong>Ver tutorial</strong> para un recorrido paso a paso.</p>
                </ScreenInfoIcon>
              )}
            </div>
          </div>

          {/* Tipo de remuneración: sueldo base o tarifa por horas */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4" data-tour="extras-payment">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">¿Cómo te pagan?</p>
            <div className="mb-4 flex flex-wrap gap-2" data-tour="extras-payment-type">
              <button
                type="button"
                onClick={() => handleSetRemunerationType("hourly")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  (preferences.remunerationType ?? "hourly") === "hourly"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                    : "border border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                Tarifa por horas
              </button>
              <button
                type="button"
                onClick={() => handleSetRemunerationType("salary")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  preferences.remunerationType === "salary"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                    : "border border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                Sueldo base (mensual)
              </button>
            </div>

            {(preferences.remunerationType ?? "hourly") === "hourly" ? (
              <div className="flex flex-wrap items-center gap-4" data-tour="extras-payment-fields">
                <p className="text-xs font-semibold text-white/60">Tarifa por hora</p>
                <NumberInput
                  value={preferences.hourlyRate ?? 0}
                  onChange={handleSetHourlyRate}
                  min={0}
                  step={0.01}
                  suffix="€/h"
                  allowEmpty={true}
                  className="min-w-[8rem] max-w-[10rem]"
                />
                <span className="min-h-[2.75rem] flex items-center text-xl font-bold tabular-nums text-emerald-400">
                  {(preferences.hourlyRate ?? 0).toFixed(2)} €/h
                </span>
              </div>
            ) : (
              <div className="space-y-4" data-tour="extras-payment-fields">
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-xs font-semibold text-white/60">Sueldo base (mes)</p>
                  <NumberInput
                    value={preferences.monthlySalary ?? 0}
                    onChange={handleSetMonthlySalary}
                    min={0}
                    step={1}
                    suffix="€"
                    allowEmpty={true}
                    className="min-w-[8rem] max-w-[10rem]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-xs font-semibold text-white/60">Horas semanales</p>
                  <NumberInput
                    value={preferences.hoursPerWeek ?? 40}
                    onChange={handleSetHoursPerWeek}
                    min={1}
                    step={0.5}
                    suffix="h/sem"
                    allowEmpty={false}
                    className="min-w-[6rem] max-w-[8rem]"
                  />
                </div>
                <p className="text-sm text-white/80">
                  Equivalente: <span className="font-bold tabular-nums text-emerald-400">
                    {((preferences.monthlySalary ?? 0) > 0 && (preferences.hoursPerWeek ?? 0) > 0
                      ? (preferences.monthlySalary ?? 0) / ((preferences.hoursPerWeek ?? 1) * (52 / 12))
                      : 0
                    ).toFixed(2)} €/h
                  </span>
                  {" "}(sueldo ÷ horas semanales × 52 semanas ÷ 12 meses)
                </p>
              </div>
            )}
          </div>

          {/* Extras */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Extras</h2>
              <button
                type="button"
                onClick={() => setExtraModalOpen("create")}
                data-tour="extras-create-btn"
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Crear extra
              </button>
            </div>

            {(!preferences.shiftExtras || preferences.shiftExtras.length === 0) ? (
              <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/50" data-tour="extras-list">
                Aún no tienes extras. Pulsa «Crear extra» para añadir uno (nocturnidad, festivo, etc.) y asignarlos a cada turno en el calendario.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-tour="extras-list">
                {(preferences.shiftExtras ?? []).map((extra) => (
                  <ExtraCard
                    key={extra.id}
                    extra={extra}
                    onEdit={() => setExtraModalOpen(extra)}
                    onDelete={() => handleDeleteExtra(extra.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </motion.div>
      </div>

      <MobileNavigation
        active="extras"
        onChange={handleNavigateTab}
        onNavigateLink={handleNavigateLink}
        creditBalance={creditBalance}
      />

      {currentUser && (
        <CreditsBottomBar creditBalance={creditBalance} />
      )}

      <ExtraModal
        open={extraModalOpen !== null}
        onClose={() => setExtraModalOpen(null)}
        extra={extraModalOpen === "create" ? null : extraModalOpen}
        onSubmit={handleSaveExtraModal}
      />
    </div>
  )
}
