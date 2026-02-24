"use client"

import { useEffect, useState, useCallback, useMemo as useMemoHook } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"
import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type ShiftExtra } from "@/types/preferences"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import NumberInput from "@/components/NumberInput"
import ExtraCard from "@/components/dashboard/ExtraCard"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import type { Session } from "@supabase/supabase-js"
import type { UserSummary } from "@/types/users"
import { useConfirmDelete } from "@/lib/ConfirmDeleteContext"
import { useToast } from "@/lib/ToastContext"

export default function ExtrasPage() {
  const router = useRouter()
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newExtra, setNewExtra] = useState<Partial<ShiftExtra>>({
    name: "",
    value: 0,
    color: "#3b82f6",
  })

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

  const handleAddExtra = async () => {
    if (!newExtra.name || newExtra.value === undefined) return

    const name = newExtra.name.trim()
    const value = newExtra.value
    const color = newExtra.color ?? "#3b82f6"

    if (currentUser?.id && supabase) {
      const { data, error } = await supabase
        .from("user_shift_extras")
        .insert({ user_id: currentUser.id, name, value, color })
        .select("id")
        .single()

      if (error) {
        console.error("Error al guardar extra en la base de datos", error)
        showToast({ type: "error", message: "No se pudo guardar el extra. Inténtalo de nuevo." })
        return
      }

      const extra: ShiftExtra = {
        id: data.id,
        name,
        value,
        color,
      }
      const updated = {
        ...preferences,
        shiftExtras: [...(preferences.shiftExtras ?? []), extra],
      }
      setPreferences(updated)
      saveUserPreferences(updated)
      setNewExtra({ name: "", value: 0, color: "#3b82f6" })
      showToast({ type: "create", message: "Extra creado" })
      return
    }

    const extra: ShiftExtra = {
      id: `extra-${Date.now()}`,
      name,
      value,
      color,
    }
    const updated = {
      ...preferences,
      shiftExtras: [...(preferences.shiftExtras ?? []), extra],
    }
    setPreferences(updated)
    saveUserPreferences(updated)
    setNewExtra({ name: "", value: 0, color: "#3b82f6" })
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
        setEditingId(null)
        showToast({ type: "delete", message: "Extra eliminado" })
      },
    })
  }

  // Guardar el estado original cuando se inicia la edición
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null)

  const handleUpdateExtra = async (id: string, updates: Partial<ShiftExtra>) => {
    const updated = {
      ...preferences,
      shiftExtras: (preferences.shiftExtras ?? []).map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    }
    setPreferences(updated)
    if (currentUser?.id && supabase && /^[0-9a-f-]{36}$/i.test(id)) {
      const payload: { name?: string; value?: number; color?: string } = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.value !== undefined) payload.value = updates.value
      if (updates.color !== undefined) payload.color = updates.color
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from("user_shift_extras").update(payload).eq("id", id).eq("user_id", currentUser.id)
        if (error) console.error("Error al actualizar extra en la base de datos", error)
      }
    }
    saveUserPreferences(updated)
  }
  
  const handleStartEdit = (id: string) => {
    // Guardar el estado original cuando se inicia la edición
    setOriginalPreferences({ ...preferences })
    setEditingId(id)
  }
  
  const handleCancelEdit = () => {
    // Restaurar las preferencias originales al cancelar
    if (originalPreferences) {
      setPreferences(originalPreferences)
    }
    setOriginalPreferences(null)
    setEditingId(null)
  }
  
  const handleFinishEdit = () => {
    setOriginalPreferences(null)
    setEditingId(null)
    showToast({ type: "update", message: "Guardado" })
  }

  const handleSetHourlyRate = async (rate: number) => {
    const updated = { ...preferences, hourlyRate: rate }
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

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 sm:pb-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-8"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <PlanLoopLogo size="sm" showText={true} />
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-sky-400" />
                Cargando sesión…
              </div>
            ) : null}
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              ← Panel
            </button>
          </div>

          {/* Tarifa por hora: números bien visibles, sin colapsar */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Tarifa por hora</p>
            <div className="flex flex-wrap items-center gap-4">
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
          </div>

          {/* Extras: mismo layout que Plantillas */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Extras</h2>
              <button
                type="button"
                onClick={() => document.getElementById("extras-new-form")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400"
              >
                + Nuevo
              </button>
            </div>

            {/* Formulario nuevo extra: grid estable en móvil y desktop */}
            <div id="extras-new-form" className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 scroll-mt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Nuevo extra</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
                <input
                  type="color"
                  value={newExtra.color ?? "#3b82f6"}
                  onChange={(e) => setNewExtra({ ...newExtra, color: e.target.value })}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-white/20 bg-white/5 self-center sm:self-end"
                  title="Color"
                />
                <input
                  type="text"
                  value={newExtra.name ?? ""}
                  onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                  placeholder="Nombre (ej. Nocturno, Festivo)"
                  className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
                <NumberInput
                  value={newExtra.value ?? 0}
                  onChange={(v) => setNewExtra({ ...newExtra, value: v })}
                  min={0}
                  step={0.01}
                  suffix="€"
                  allowEmpty={false}
                  className="min-w-[7rem]"
                />
                <button
                  type="button"
                  onClick={handleAddExtra}
                  disabled={!newExtra.name || newExtra.value === undefined}
                  className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                >
                  <Plus size={20} />
                  Crear
                </button>
              </div>
            </div>

            {(!preferences.shiftExtras || preferences.shiftExtras.length === 0) ? (
              <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/50">
                Aún no tienes extras. Crea uno arriba (nombre + valor €) y aparecerá aquí. Podrás asignarlos a cada turno.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(preferences.shiftExtras ?? []).map((extra) => (
                  <ExtraCard
                    key={extra.id}
                    extra={extra}
                    isEditing={editingId === extra.id}
                    onStartEdit={() => handleStartEdit(extra.id)}
                    onCancelEdit={handleCancelEdit}
                    onUpdate={(updates) => handleUpdateExtra(extra.id, updates)}
                    onFinishEdit={handleFinishEdit}
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
      />
    </div>
  )
}
