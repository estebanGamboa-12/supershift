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

// Loader mínimo inline: sin componente pesado para que la ruta cargue rápido
function ExtrasPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
        <p className="text-sm text-white/60">Cargando...</p>
      </div>
    </div>
  )
}

export default function ExtrasPage() {
  const router = useRouter()
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  // Cargar tipos de turnos personalizados desde Supabase
  const handleAddExtra = () => {
    if (!newExtra.name || newExtra.value === undefined) return

    const extra: ShiftExtra = {
      id: `extra-${Date.now()}`,
      name: newExtra.name,
      value: newExtra.value,
      color: newExtra.color ?? "#3b82f6",
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
      onConfirm: () => {
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

  const handleUpdateExtra = (id: string, updates: Partial<ShiftExtra>) => {
    const updated = {
      ...preferences,
      shiftExtras: (preferences.shiftExtras ?? []).map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    }
    setPreferences(updated)
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

  const handleSetHourlyRate = (rate: number) => {
    setPreferences({ ...preferences, hourlyRate: rate })
  }

  if (isLoading) {
    return <ExtrasPageLoader />
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
