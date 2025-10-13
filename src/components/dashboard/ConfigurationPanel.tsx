"use client"

import { type FC, type FormEvent, useEffect, useMemo, useState } from "react"
import type { UserSummary } from "@/types/users"

export type UserPreferences = {
  startOfWeek: "monday" | "sunday"
  theme: "system" | "light" | "dark"
  notifications: {
    email: boolean
    push: boolean
    reminders: boolean
  }
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  startOfWeek: "monday",
  theme: "system",
  notifications: {
    email: true,
    push: true,
    reminders: false,
  },
}

type ConfigurationPanelProps = {
  user: UserSummary | null
  defaultPreferences: UserPreferences
  onSave?: (preferences: UserPreferences) => Promise<void> | void
  isSaving?: boolean
  lastSavedAt?: Date | null
  onLogout?: () => void
  className?: string
}

type SaveStatus = "idle" | "saved" | "error"

const formatSavedAt = (date: Date | null | undefined) => {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const ConfigurationPanel: FC<ConfigurationPanelProps> = ({
  user,
  defaultPreferences,
  onSave,
  isSaving = false,
  lastSavedAt,
  onLogout,
  className,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setPreferences(defaultPreferences)
  }, [defaultPreferences])

  const savedAtLabel = useMemo(() => formatSavedAt(lastSavedAt), [lastSavedAt])

  function handleToggle(field: keyof UserPreferences["notifications"]) {
    setPreferences((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [field]: !current.notifications[field],
      },
    }))
  }

  function handleThemeChange(theme: UserPreferences["theme"]) {
    setPreferences((current) => ({
      ...current,
      theme,
    }))
  }

  function handleStartOfWeekChange(startOfWeek: UserPreferences["startOfWeek"]) {
    setPreferences((current) => ({
      ...current,
      startOfWeek,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSave) {
      return
    }

    setErrorMessage(null)
    setStatus("idle")

    try {
      await onSave(preferences)
      setStatus("saved")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las preferencias. Inténtalo más tarde."
      setErrorMessage(message)
      setStatus("error")
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 text-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.95)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_55%)]" />
      <form
        className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]"
        onSubmit={handleSubmit}
      >
        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <header className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Configuración</p>
              <h2 className="text-xl font-semibold text-white">Preferencias personales</h2>
            </div>
            {savedAtLabel ? (
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Guardado {savedAtLabel}
              </span>
            ) : null}
          </header>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Perfil</p>
              {user ? (
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <p className="text-base font-semibold text-white">{user.name}</p>
                  <p>{user.email}</p>
                  <p className="text-xs text-white/50">
                    ID de calendario: {user.calendarId ? `#{user.calendarId}` : "No asignado"}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-rose-400/60 hover:text-rose-200"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/60">
                  Inicia sesión para personalizar tus preferencias y sincronizarlas con tu equipo.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Inicio de semana</p>
              <div className="inline-flex gap-2 rounded-full bg-white/5 p-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {(["monday", "sunday"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleStartOfWeekChange(option)}
                    className={`rounded-full px-4 py-1 transition ${
                      preferences.startOfWeek === option
                        ? "bg-sky-500 text-white shadow shadow-sky-500/40"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {option === "monday" ? "Comenzar lunes" : "Comenzar domingo"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50">
                Afecta al orden en el calendario y resúmenes semanales compartidos con tu equipo.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">Tema</p>
              <div className="grid gap-2 text-sm text-white/70 sm:grid-cols-3">
                {(["system", "light", "dark"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleThemeChange(option)}
                    className={`rounded-2xl border px-3 py-2 font-semibold uppercase tracking-wide transition ${
                      preferences.theme === option
                        ? "border-sky-400/70 bg-sky-500/20 text-white"
                        : "border-white/10 bg-white/5 hover:border-sky-400/40 hover:text-sky-200"
                    }`}
                  >
                    {option === "system"
                      ? "Sistema"
                      : option === "light"
                        ? "Claro"
                        : "Oscuro"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50">
                Cambia la apariencia de la aplicación. El modo sistema seguirá la configuración de tu dispositivo.
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <section className="space-y-3">
            <header>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Notificaciones</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Mantente informado</h3>
            </header>

            <div className="space-y-3 text-sm text-white/70">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">Correo electrónico</p>
                  <p className="text-xs text-white/50">Recibe un resumen semanal con los turnos asignados.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={() => handleToggle("email")}
                  className="h-6 w-11 cursor-pointer rounded-full border border-white/20 bg-slate-900/60 transition-all checked:bg-sky-500"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">Avisos push</p>
                  <p className="text-xs text-white/50">Enterate de cambios críticos en tiempo real.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={() => handleToggle("push")}
                  className="h-6 w-11 cursor-pointer rounded-full border border-white/20 bg-slate-900/60 transition-all checked:bg-sky-500"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">Recordatorios</p>
                  <p className="text-xs text-white/50">Recibe alertas antes de iniciar tu siguiente turno.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications.reminders}
                  onChange={() => handleToggle("reminders")}
                  className="h-6 w-11 cursor-pointer rounded-full border border-white/20 bg-slate-900/60 transition-all checked:bg-sky-500"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <header>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Integraciones</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Conecta tus herramientas</h3>
            </header>
            <div className="space-y-3 text-sm text-white/70">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200"
              >
                Sincronizar con Google Calendar
                <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200"
              >
                Activar API para tu equipo
                <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200"
              >
                Exportar informe mensual (PDF)
                <span aria-hidden>→</span>
              </button>
            </div>
          </section>

          <footer className="space-y-3 border-t border-white/10 pt-4 text-sm text-white/70">
            {errorMessage ? (
              <p className="text-sm text-rose-300">{errorMessage}</p>
            ) : status === "saved" ? (
              <p className="text-sm text-emerald-300">Tus preferencias se guardaron correctamente.</p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/50">
                Estas configuraciones afectan las recomendaciones y la experiencia en todos tus dispositivos.
              </p>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar preferencias"}
              </button>
            </div>
          </footer>
        </aside>
      </form>
    </div>
  )
}

export default ConfigurationPanel
