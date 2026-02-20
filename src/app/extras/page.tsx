"use client"

import { useEffect, useState, useMemo, useCallback, useMemo as useMemoHook } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Trash2, Save, X, Check } from "lucide-react"
import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences"
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type ShiftExtra } from "@/types/preferences"
import type { ShiftType } from "@/types/shifts"
import MobileNavigation, { type MobileTab } from "@/components/dashboard/MobileNavigation"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import NumberInput from "@/components/NumberInput"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"
import type { Session } from "@supabase/supabase-js"
import type { UserSummary } from "@/types/users"
import { useConfirmDelete } from "@/contexts/ConfirmDeleteContext"
import { useToast } from "@/contexts/ToastContext"

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

const shiftTypeLabels: Record<ShiftType, string> = {
  WORK: "Trabajo",
  REST: "Descanso",
  NIGHT: "Nocturno",
  VACATION: "Vacaciones",
  CUSTOM: "Personalizado",
}

const shiftTypeColors: Record<ShiftType, string> = {
  WORK: "#3b82f6",
  REST: "#94a3b8",
  NIGHT: "#a855f7",
  VACATION: "#10b981",
  CUSTOM: "#f59e0b",
}

export default function ExtrasPage() {
  const router = useRouter()
  const { confirmDelete } = useConfirmDelete()
  const { showToast } = useToast()

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
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

  // Estado para el formulario de ejemplo
  const [exampleType, setExampleType] = useState<ShiftType>("WORK")
  const [exampleLabel, setExampleLabel] = useState("Trabajo")
  const [exampleColor, setExampleColor] = useState("#3b82f6")
  const [exampleStartTime, setExampleStartTime] = useState("09:00")
  const [exampleEndTime, setExampleEndTime] = useState("17:00")
  const [examplePluses, setExamplePluses] = useState({ night: 0, holiday: 0, availability: 0, other: 0 })

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
    // NO cerrar la edición automáticamente - solo se cierra cuando el usuario presiona X o guarda
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
    // Cerrar la edición sin restaurar (los cambios ya están en el estado)
    setOriginalPreferences(null)
    setEditingId(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      saveUserPreferences(preferences)
      showToast({ type: "update", message: "Cambios guardados" })
      setTimeout(() => setIsSaving(false), 500)
    } catch (error) {
      console.error("Error guardando preferencias:", error)
      setIsSaving(false)
    }
  }

  const handleSetHourlyRate = (rate: number) => {
    setPreferences({ ...preferences, hourlyRate: rate })
  }

  // Calcular horas del turno de ejemplo
  const exampleShiftHours = useMemo(() => {
    const start = exampleStartTime ? new Date(`1970-01-01T${exampleStartTime}:00`) : null
    const end = exampleEndTime ? new Date(`1970-01-01T${exampleEndTime}:00`) : null
    if (!start || !end) return 0
    const endDate = new Date(end)
    if (endDate <= start) {
      endDate.setDate(endDate.getDate() + 1)
    }
    const diffMinutes = Math.round((endDate.getTime() - start.getTime()) / 60000)
    return diffMinutes / 60
  }, [exampleStartTime, exampleEndTime])

  const formattedExampleShiftHours = `${Math.floor(exampleShiftHours)}h ${String(Math.round((exampleShiftHours % 1) * 60)).padStart(2, "0")}m`

  // Calcular extras seleccionados y total ganado del ejemplo
  const selectedExtras = useMemo(() => {
    const extras: string[] = []
    if (examplePluses.night > 0) extras.push("night")
    if (examplePluses.holiday > 0) extras.push("holiday")
    if (examplePluses.availability > 0) extras.push("availability")
    if (examplePluses.other > 0) extras.push("other")
    return extras
  }, [examplePluses])

  const totalEarned = useMemo(() => {
    const hourlyRate = preferences.hourlyRate ?? 0
    const hoursEarned = exampleShiftHours * hourlyRate
    
    const extrasEarned = selectedExtras.reduce((total, extraId) => {
      const extra = preferences.shiftExtras?.find(e => e.id === extraId)
      return total + (extra?.value ?? 0)
    }, 0)

    return hoursEarned + extrasEarned
  }, [exampleShiftHours, selectedExtras, preferences])

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

          {/* Formulario de ejemplo */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/85 p-4 sm:p-6 text-white shadow-[0_30px_80px_-48px_rgba(59,130,246,0.6)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">Ejemplo</p>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Vista previa del formulario</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-white/60">
                  Así se verá el formulario al editar turnos
                </p>
              </div>
            </div>

            <form className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm text-white/80">
                  Tipo de turno
                  <select
                    value={exampleType}
                    onChange={(e) => {
                      const newType = e.target.value as ShiftType
                      setExampleType(newType)
                      setExampleLabel(shiftTypeLabels[newType])
                      setExampleColor(shiftTypeColors[newType])
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  >
                    {Object.entries(shiftTypeLabels).map(([value, labelText]) => (
                      <option key={value} value={value}>
                        {labelText}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-white/80">
                  Texto del turno
                  <input
                    type="text"
                    value={exampleLabel}
                    onChange={(e) => setExampleLabel(e.target.value)}
                    placeholder={shiftTypeLabels[exampleType]}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 shadow-inner shadow-black/20 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-black/30"
                    style={{ backgroundColor: exampleColor + "20", borderColor: exampleColor + "40" }}
                  >
                    <div className="h-full w-full rounded-xl" style={{ backgroundColor: exampleColor }} />
                  </div>
                  <label className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-white/60">Color</span>
                    <input
                      type="color"
                      value={exampleColor}
                      onChange={(e) => setExampleColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                    />
                  </label>
                </div>
                <div className="space-y-2.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm text-white/80">
                      Hora de entrada
                      <input
                        type="time"
                        value={exampleStartTime}
                        onChange={(e) => setExampleStartTime(e.target.value)}
                        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm text-white/80">
                      Hora de salida
                      <input
                        type="time"
                        value={exampleEndTime}
                        onChange={(e) => setExampleEndTime(e.target.value)}
                        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Horas turno</p>
                  <p className="text-sm font-semibold text-white">{formattedExampleShiftHours}</p>
                </div>
                {totalEarned > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/40">Total</p>
                    <p className="text-sm font-semibold text-emerald-400">{totalEarned.toFixed(2)}€</p>
                  </div>
                )}
              </div>

              {/* Extras personalizados en el ejemplo */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Extras</p>
                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(preferences.shiftExtras ?? []).slice(0, 4).map((extra, index) => {
                      const plusKeys: (keyof typeof examplePluses)[] = ["night", "holiday", "availability", "other"]
                      const key = plusKeys[index]
                      const isSelected = examplePluses[key] > 0
                      
                      return (
                        <label
                          key={extra.id}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition cursor-pointer ${
                            isSelected
                              ? "border-white/30 bg-white/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                          style={isSelected ? { borderColor: extra.color + "60", backgroundColor: extra.color + "15" } : {}}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setExamplePluses((prev) => ({
                                ...prev,
                                [key]: e.target.checked ? 1 : 0,
                              }))
                            }
                            className="h-3 w-3 rounded border-white/20 bg-white/5 accent-sky-500 flex-shrink-0"
                          />
                          <span className="flex-1 font-medium text-white/90 truncate text-[9px]">{extra.name}</span>
                          <span className="text-[9px] font-semibold text-white/60 whitespace-nowrap">{extra.value}€</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                {selectedExtras.length > 0 && (
                  <p className="mt-2 text-[9px] text-white/50">
                    Extras: {selectedExtras.map(id => {
                      const extra = preferences.shiftExtras?.find(e => e.id === id)
                      return extra ? `${extra.name} (+${extra.value}€)` : null
                    }).filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Tarifa por hora */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <h2 className="mb-4 text-xl font-semibold">Tarifa por hora</h2>
            <div className="flex items-center gap-4">
              <label className="flex flex-col gap-2 flex-1">
                <span className="text-sm text-white/70">Euros por hora</span>
                <NumberInput
                  value={preferences.hourlyRate ?? 0}
                  onChange={handleSetHourlyRate}
                  min={0}
                  step={0.01}
                  suffix="€/h"
                  allowEmpty={true}
                  className=""
                />
              </label>
              <div className="pt-6">
                <span className="text-2xl font-bold text-emerald-400">
                  {preferences.hourlyRate?.toFixed(2) ?? "0.00"}€/h
                </span>
              </div>
            </div>
          </div>

          {/* Lista de extras */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Extras personalizados</h2>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            <div className="space-y-3">
              {(preferences.shiftExtras ?? []).map((extra) => (
                <motion.div
                  key={extra.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  {editingId === extra.id ? (
                    <>
                      <div
                        className="h-10 w-10 rounded-lg border border-white/20"
                        style={{ backgroundColor: extra.color }}
                      />
                      <input
                        type="color"
                        value={extra.color}
                        onChange={(e) =>
                          handleUpdateExtra(extra.id, { color: e.target.value })
                        }
                        className="h-10 w-10 cursor-pointer rounded-lg border border-white/20"
                      />
                      <input
                        type="text"
                        value={extra.name}
                        onChange={(e) =>
                          handleUpdateExtra(extra.id, { name: e.target.value })
                        }
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                        placeholder="Nombre del extra"
                      />
                      <NumberInput
                        value={extra.value}
                        onChange={(value) => handleUpdateExtra(extra.id, { value })}
                        min={0}
                        step={0.01}
                        suffix="€"
                        allowEmpty={true}
                        className="w-32"
                      />
                      <button
                        onClick={handleFinishEdit}
                        className="rounded-lg border border-green-500/50 bg-green-500/20 p-2 text-green-200 transition hover:bg-green-500/30 hover:text-green-100"
                        aria-label="Confirmar cambios"
                        title="Confirmar cambios"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white"
                        aria-label="Cancelar edición"
                        title="Cancelar edición"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="h-10 w-10 rounded-lg border border-white/20"
                        style={{ backgroundColor: extra.color }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{extra.name}</p>
                        <p className="text-xs text-white/60">Valor: {extra.value.toFixed(2)}€</p>
                      </div>
                      <button
                        onClick={() => handleStartEdit(extra.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExtra(extra.id)}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Formulario para agregar nuevo extra */}
            <div className="mt-6 mb-8 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white/80">Agregar nuevo extra</h3>
              <div className="flex flex-wrap items-end gap-3">
                <input
                  type="color"
                  value={newExtra.color ?? "#3b82f6"}
                  onChange={(e) => setNewExtra({ ...newExtra, color: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-white/20"
                />
                <input
                  type="text"
                  value={newExtra.name ?? ""}
                  onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                  placeholder="Nombre del extra"
                  className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
                <NumberInput
                  value={newExtra.value ?? 0}
                  onChange={(value) => setNewExtra({ ...newExtra, value })}
                  min={0}
                  step={0.01}
                  suffix="€"
                  allowEmpty={true}
                  className="w-32"
                />
                <button
                  onClick={handleAddExtra}
                  disabled={!newExtra.name || newExtra.value === undefined}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <MobileNavigation
        active="calendar"
        onChange={handleNavigateTab}
        onNavigateLink={handleNavigateLink}
      />
    </div>
  )
}
