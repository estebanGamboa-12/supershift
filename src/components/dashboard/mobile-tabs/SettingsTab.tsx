import { type FC, useMemo, useState } from "react"
import type { UserSummary } from "@/types/users"

type SettingsTabProps = {
  currentUser: UserSummary
  onLogout: () => void
  workspaceMemberCount: number
}

type NotificationToggleProps = {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

const NotificationToggle: FC<NotificationToggleProps> = ({
  label,
  description,
  enabled,
  onToggle,
}) => {
  const knobPosition = enabled ? "translate-x-5" : "translate-x-1"
  const trackColor = enabled
    ? "bg-blue-500/80 border-blue-300/40"
    : "bg-white/10 border-white/10"

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 shadow-inner shadow-blue-500/5">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/60">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${trackColor}`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${knobPosition}`}
        />
      </button>
    </div>
  )
}

type ThemeOption = "system" | "light" | "dark"

const THEMES: { value: ThemeOption; title: string; description: string }[] = [
  {
    value: "system",
    title: "Automático",
    description: "Adapta la interfaz al modo claro u oscuro del dispositivo.",
  },
  {
    value: "dark",
    title: "Oscuro",
    description: "Prioriza el contraste y el ahorro de batería.",
  },
  {
    value: "light",
    title: "Claro",
    description: "Ideal para entornos muy iluminados durante el día.",
  },
]

const SettingsTab: FC<SettingsTabProps> = ({
  currentUser,
  onLogout,
  workspaceMemberCount,
}) => {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>("dark")

  const calendarLabel = useMemo(() => {
    if (!currentUser.calendarId) {
      return "Sin calendario vinculado"
    }

    return `ID ${currentUser.calendarId}`
  }, [currentUser.calendarId])

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-blue-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
              Cuenta
            </p>
            <h2 className="text-2xl font-bold text-white">Tu perfil</h2>
            <p className="mt-1 text-sm text-white/70">
              Gestiona los datos de acceso y la vinculación con tu calendario
              principal.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-red-400/40 hover:text-red-200"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Nombre
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {currentUser.name || "Sin nombre"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Correo
            </p>
            <p className="mt-1 text-base text-white/80">{currentUser.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Calendario conectado
            </p>
            <p className="mt-1 text-base text-white/80">{calendarLabel}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-blue-500/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
            Notificaciones
          </p>
          <h2 className="text-2xl font-bold text-white">Alertas personalizadas</h2>
          <p className="mt-1 text-sm text-white/70">
            Activa los avisos que necesites para no perder ninguna rotación o
            actualización del equipo.
          </p>
        </div>

        <div className="space-y-3">
          <NotificationToggle
            label="Avisos por correo"
            description="Resumen diario con los turnos y pluses asignados."
            enabled={emailAlerts}
            onToggle={() => setEmailAlerts((value) => !value)}
          />
          <NotificationToggle
            label="Notificaciones push"
            description="Recibe alertas instantáneas en tus dispositivos."
            enabled={pushAlerts}
            onToggle={() => setPushAlerts((value) => !value)}
          />
          <NotificationToggle
            label="Informe semanal"
            description="Un correo cada lunes con métricas y sugerencias."
            enabled={weeklyDigest}
            onToggle={() => setWeeklyDigest((value) => !value)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-blue-500/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
            Apariencia
          </p>
          <h2 className="text-2xl font-bold text-white">Modo de visualización</h2>
          <p className="mt-1 text-sm text-white/70">
            Ajusta cómo se muestra Supershift según tu entorno de trabajo.
          </p>
        </div>

        <div className="space-y-3">
          {THEMES.map((theme) => {
            const isActive = theme.value === selectedTheme
            const borderColor = isActive
              ? "border-blue-400/60"
              : "border-white/10"
            const background = isActive
              ? "bg-blue-500/20"
              : "bg-white/5"

            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => setSelectedTheme(theme.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${borderColor} ${background}`}
                aria-pressed={isActive}
              >
                <p className="text-sm font-semibold text-white">{theme.title}</p>
                <p className="text-xs text-white/65">{theme.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-blue-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
              Espacio de trabajo
            </p>
            <h2 className="text-2xl font-bold text-white">Equipo activo</h2>
            <p className="mt-1 text-sm text-white/70">
              {workspaceMemberCount} miembros con acceso a Supershift en este
              calendario.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-blue-400/40 px-3 py-1 text-xs font-semibold text-blue-100 transition hover:from-blue-500/40 hover:to-indigo-500/40 hover:bg-gradient-to-r"
          >
            Invitar
          </button>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          <p>
            Comparte tu calendario con tus compañeros para coordinar turnos y
            vacaciones. Puedes revocar el acceso desde el panel de usuarios en
            cualquier momento.
          </p>
          <p className="text-[11px] uppercase tracking-wide text-white/40">
            Próximamente: invitaciones por enlace y roles personalizados.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 shadow-xl shadow-red-500/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
            Zona de peligro
          </p>
          <h2 className="text-2xl font-bold text-white">Acciones avanzadas</h2>
          <p className="mt-1 text-sm text-red-100/80">
            Estas acciones no se pueden deshacer. Procede con precaución.
          </p>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/30"
          >
            Revocar accesos del equipo
          </button>
          <button
            type="button"
            className="w-full rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/30"
          >
            Resetear cuadrante y pluses
          </button>
        </div>
      </section>
    </div>
  )
}

export default SettingsTab
