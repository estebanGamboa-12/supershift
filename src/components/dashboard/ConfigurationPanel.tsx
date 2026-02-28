"use client"

import {
  type ChangeEvent,
  type FC,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChevronRight } from "lucide-react"
import { POPULAR_TIMEZONES } from "@/data/timezones"
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "@/types/preferences"
import type { UserProfileHistoryEntry, UserSummary } from "@/types/users"
export { DEFAULT_USER_PREFERENCES }
export type { UserPreferences }

type ConfigurationPanelProps = {
  user: UserSummary | null
  defaultPreferences: UserPreferences
  onSave?: (preferences: UserPreferences) => Promise<void> | void
  onUpdateProfile?: (payload: {
    name: string
    timezone: string
    avatarUrl: string | null
  }) => Promise<unknown> | unknown
  isSaving?: boolean
  lastSavedAt?: Date | null
  onLogout?: () => void
  onLaunchTour?: () => void
  className?: string
}

type SaveStatus = "idle" | "saved" | "error"

const DEFAULT_TIMEZONE = "Europe/Madrid"

const formatSavedAt = (date: Date | null | undefined) => {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
})

const formatHistoryTimestamp = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return HISTORY_DATE_FORMATTER.format(parsed)
}

const buildInitials = (name: string) => {
  const normalized = name.trim()
  if (!normalized) {
    return "?"
  }
  const parts = normalized.split(" ").filter(Boolean)
  if (parts.length === 0) {
    return "?"
  }
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
  return initials || "?"
}

const ConfigurationPanel: FC<ConfigurationPanelProps> = ({
  user,
  defaultPreferences,
  onSave,
  onUpdateProfile,
  isSaving = false,
  lastSavedAt,
  onLogout,
  onLaunchTour,
  className,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showFestiveDaysModal, setShowFestiveDaysModal] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    timezone: user?.timezone ?? DEFAULT_TIMEZONE,
    avatarUrl: user?.avatarUrl ?? "",
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl ?? null,
  )
  const [profileStatus, setProfileStatus] = useState<SaveStatus>("idle")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [historyEntries, setHistoryEntries] = useState<UserProfileHistoryEntry[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [integrationStatus, setIntegrationStatus] = useState<
    | { tone: "success" | "error"; message: string }
    | null
  >(null)
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false)
  const [isExportingMonthlyReport, setIsExportingMonthlyReport] = useState(false)
  const [syncMonth, setSyncMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [reportFormat, setReportFormat] = useState<"html" | "pdf">("html")

  useEffect(() => {
    setPreferences(defaultPreferences)
  }, [defaultPreferences])

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      timezone: user?.timezone ?? DEFAULT_TIMEZONE,
      avatarUrl: user?.avatarUrl ?? "",
    })
    setAvatarPreview(user?.avatarUrl ?? null)
    setProfileStatus("idle")
    setProfileError(null)
  }, [user])

  const savedAtLabel = useMemo(() => formatSavedAt(lastSavedAt), [lastSavedAt])
  const canEditProfile = Boolean(user && onUpdateProfile)

  function decodeBase64ToUint8Array(base64: string): Uint8Array {
    if (typeof window === "undefined" || typeof window.atob !== "function") {
      throw new Error("La decodificación base64 solo está disponible en el navegador")
    }

    const binary = window.atob(base64)
    const length = binary.length
    const bytes = new Uint8Array(length)
    for (let index = 0; index < length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  function copyToArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
    const safeBuffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(safeBuffer).set(bytes)
    return safeBuffer
  }

  function decodeBase64ToString(base64: string): string {
    if (typeof window === "undefined" || typeof window.atob !== "function") {
      throw new Error("La decodificación base64 solo está disponible en el navegador")
    }
    return window.atob(base64)
  }

  function triggerDownload(fileName: string, blob: Blob) {
    if (typeof window === "undefined") {
      return
    }

    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  function openHtmlPreview(htmlContent: string) {
    if (typeof window === "undefined") {
      return
    }

    const previewWindow = window.open("", "_blank")
    if (!previewWindow) {
      return
    }

    previewWindow.document.write(htmlContent)
    previewWindow.document.close()
  }

  function resetPreferenceFeedback() {
    if (status !== "idle") {
      setStatus("idle")
    }
    if (errorMessage) {
      setErrorMessage(null)
    }
  }

  function handleStartOfWeekChange(startOfWeek: UserPreferences["startOfWeek"]) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      startOfWeek,
    }))
  }

  function handleFestiveDaysChange(showFestiveDays: boolean) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      showFestiveDays,
    }))
  }

  function handleFestiveDayColorChange(festiveDayColor: string) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      festiveDayColor,
    }))
  }

  function handleShowInfoIconChange(showInfoIcon: boolean) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      showInfoIcon,
    }))
  }

  async function handlePreferencesSubmit(event: FormEvent<HTMLFormElement>) {
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

  async function handleSyncGoogleCalendar() {
    if (isSyncingCalendar) {
      return
    }

    setIntegrationStatus(null)
    setIsSyncingCalendar(true)

    try {
      const response = await fetch("/api/integrations/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? null,
          timezone: profileForm.timezone ?? user?.timezone ?? DEFAULT_TIMEZONE,
          calendarName: user?.name ? `Turnos de ${user.name}` : undefined,
          month: syncMonth,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "No se pudo generar el archivo de sincronización con Google Calendar.",
        )
      }

      if (!payload.ics) {
        setIntegrationStatus({
          tone: "error",
          message:
            typeof payload.message === "string"
              ? payload.message
              : "No se encontraron turnos para exportar al calendario.",
        })
        return
      }

      const fileName =
        typeof payload.fileName === "string" && payload.fileName.trim().length > 0
          ? payload.fileName.trim()
          : "supershift-turnos.ics"

      const bytes = decodeBase64ToUint8Array(payload.ics)
      const safeBuffer = copyToArrayBuffer(bytes)
      const blob = new Blob([safeBuffer], { type: "text/calendar;charset=utf-8" })
      triggerDownload(fileName, blob)

      setIntegrationStatus({
        tone: "success",
        message:
          typeof payload.message === "string"
            ? payload.message
            : "Descarga completada. Importa el archivo .ics en Google Calendar para finalizar la sincronización.",
      })
    } catch (error) {
      setIntegrationStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo exportar el calendario a Google Calendar.",
      })
    } finally {
      setIsSyncingCalendar(false)
    }
  }

  async function handleExportMonthlyReport() {
    if (isExportingMonthlyReport) {
      return
    }

    setIntegrationStatus(null)
    setIsExportingMonthlyReport(true)

    try {
      const response = await fetch("/api/reports/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? null,
          userName: user?.name ?? null,
          userEmail: user?.email ?? null,
          month: reportMonth,
          format: reportFormat,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "No se pudo generar el informe mensual.",
        )
      }

      const htmlB64 = typeof payload.html === "string" ? payload.html : null
      const pdfB64 = typeof payload.pdf === "string" ? payload.pdf : null
      const hasHtml = htmlB64 && htmlB64.length > 0
      const hasPdf = pdfB64 && pdfB64.length > 0

      if (!hasHtml && !hasPdf) {
        setIntegrationStatus({
          tone: "error",
          message: "El informe mensual no devolvió datos para descargar.",
        })
        return
      }

      const baseName = typeof payload.fileName === "string" && payload.fileName.trim().length > 0
        ? payload.fileName.replace(/\.(html|pdf)$/i, "").trim()
        : `informe-supershift-${reportMonth}`

      if (reportFormat === "pdf" && hasPdf) {
        const fileName = `${baseName}.pdf`
        const bytes = decodeBase64ToUint8Array(pdfB64)
        const safeBuffer = copyToArrayBuffer(bytes)
        const blob = new Blob([safeBuffer], { type: "application/pdf" })
        triggerDownload(fileName, blob)
      } else if (hasHtml) {
        const fileName = `${baseName}.html`
        const bytes = decodeBase64ToUint8Array(htmlB64)
        const safeBuffer = copyToArrayBuffer(bytes)
        const blob = new Blob([safeBuffer], { type: "text/html;charset=utf-8" })
        triggerDownload(fileName, blob)
        try {
          openHtmlPreview(decodeBase64ToString(htmlB64))
        } catch (previewError) {
          console.warn("No se pudo abrir la vista previa del informe", previewError)
        }
      }

      setIntegrationStatus({
        tone: "success",
        message: "Informe mensual descargado correctamente.",
      })
    } catch (error) {
      setIntegrationStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo generar el informe mensual.",
      })
    } finally {
      setIsExportingMonthlyReport(false)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEditProfile || !onUpdateProfile || !user) {
      return
    }

    const trimmedName = profileForm.name.trim()
    if (!trimmedName) {
      setProfileError("El nombre no puede estar vacío")
      setProfileStatus("error")
      return
    }

    const timezoneValue =
      profileForm.timezone.trim().length > 0
        ? profileForm.timezone.trim()
        : DEFAULT_TIMEZONE
    const avatarValue =
      profileForm.avatarUrl.trim().length > 0
        ? profileForm.avatarUrl.trim()
        : null

    setProfileError(null)
    setProfileStatus("idle")
    setIsSavingProfile(true)

    try {
      await onUpdateProfile({
        name: trimmedName,
        timezone: timezoneValue,
        avatarUrl: avatarValue,
      })
      setProfileForm((current) => ({
        ...current,
        name: trimmedName,
        timezone: timezoneValue,
        avatarUrl: avatarValue ?? "",
      }))
      setAvatarPreview(avatarValue)
      setProfileStatus("saved")
      setHistoryEntries([])
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios del perfil. Inténtalo más tarde."
      setProfileError(message)
      setProfileStatus("error")
    } finally {
      setIsSavingProfile(false)
    }
  }

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (!file.type.startsWith("image/")) {
      setProfileError("Selecciona un archivo de imagen válido")
      event.target.value = ""
      setProfileStatus("error")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      setProfileForm((current) => ({
        ...current,
        avatarUrl: result,
      }))
      setAvatarPreview(result || null)
      setProfileStatus("idle")
      setProfileError(null)
    }
    reader.onerror = () => {
      setProfileError("No se pudo leer la imagen seleccionada")
      setProfileStatus("error")
    }
    reader.readAsDataURL(file)
  }

  function handleAvatarUrlChange(value: string) {
    setProfileForm((current) => ({
      ...current,
      avatarUrl: value,
    }))
    setAvatarPreview(value.trim().length > 0 ? value.trim() : null)
    setProfileStatus("idle")
    setProfileError(null)
  }

  function handleNameChange(value: string) {
    setProfileForm((current) => ({
      ...current,
      name: value,
    }))
    setProfileStatus("idle")
    setProfileError(null)
  }

  function handleTimezoneChange(value: string) {
    setProfileForm((current) => ({
      ...current,
      timezone: value,
    }))
    setProfileStatus("idle")
    setProfileError(null)
  }

  function handleClearAvatar() {
    setProfileForm((current) => ({
      ...current,
      avatarUrl: "",
    }))
    setAvatarPreview(null)
    setProfileStatus("idle")
    setProfileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleOpenHistory() {
    if (!user) {
      return
    }
    setIsHistoryOpen(true)
    setIsHistoryLoading(true)
    setHistoryError(null)

    try {
      const response = await fetch(`/api/users/${user.id}/profile-history`, {
        cache: "no-store",
      })
      const data = (await response.json().catch(() => null)) as
        | { history?: UserProfileHistoryEntry[]; error?: string }
        | null

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No se pudo cargar el historial de cambios",
        )
      }

      setHistoryEntries(data?.history ?? [])
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de cambios",
      )
      setHistoryEntries([])
    } finally {
      setIsHistoryLoading(false)
    }
  }

  function handleCloseHistory() {
    setIsHistoryOpen(false)
  }

  const renderAvatar = (
    url: string | null,
    name: string,
    sizeClass = "h-12 w-12",
  ) => (
    <div
      className={`relative grid ${sizeClass} place-items-center overflow-hidden rounded-xl bg-white/5 shadow-inner shadow-blue-500/10`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Avatar de ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-white/70">
          {buildInitials(name)}
        </span>
      )}
    </div>
  )

  const calendarLabel = user?.calendarId ? `#${user.calendarId}` : "No asignado"

  return (
    <div
      className={`configuration-panel relative overflow-hidden rounded-3xl bg-slate-950/70 text-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.95)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_55%)]" />
      <div className="relative space-y-8 p-4 sm:p-6">
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-7 rounded-3xl bg-slate-950/60 p-4 sm:p-6"
        >
          <header className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">
                Perfil
              </p>
              <h2 className="text-xl font-semibold text-white">
                Identidad y presencia
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            {savedAtLabel ? (
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Preferencias guardadas {savedAtLabel}
              </span>
            ) : null}
            </div>
          </header>

          {user ? (
            <>
              <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5" data-tour="config-profile">
                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      Nombre completo
                    </span>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      placeholder="Tu nombre para el equipo"
                      disabled={!canEditProfile || isSavingProfile}
                      className="mt-2 w-full rounded-2xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      Zona horaria
                    </span>
                    <input
                      list="timezone-options"
                      value={profileForm.timezone}
                      onChange={(event) => handleTimezoneChange(event.target.value)}
                      placeholder="Europe/Madrid"
                      disabled={!canEditProfile || isSavingProfile}
                      className="mt-2 w-full rounded-2xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <datalist id="timezone-options">
                      {POPULAR_TIMEZONES.map((timezone) => (
                        <option key={timezone} value={timezone} />
                      ))}
                    </datalist>
                    <p className="mt-2 text-xs text-white/50">
                      Ajusta cómo calculamos tus turnos y notificaciones automáticas.
                    </p>
                  </label>

                  <p className="text-xs text-white/50">
                    ID de calendario personal: {calendarLabel}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-5 rounded-2xl bg-slate-950/50 p-4 sm:p-5" data-tour="config-avatar">
                  {renderAvatar(
                    avatarPreview,
                    profileForm.name || user.name || user.email,
                    "h-24 w-24",
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="flex w-full flex-col gap-2 text-xs text-white/60">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canEditProfile || isSavingProfile}
                      className="inline-flex w-full items-center justify-center rounded-full bg-white/5 px-4 py-2 font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Subir nueva foto
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAvatar}
                      disabled={!canEditProfile || isSavingProfile}
                      className="inline-flex w-full items-center justify-center rounded-full bg-white/5 px-4 py-2 font-semibold uppercase tracking-wide text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Quitar foto
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenHistory}
                      className="inline-flex w-full items-center justify-center rounded-full bg-white/5 px-4 py-2 font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-amber-200"
                    >
                      Ver historial de cambios
                    </button>
                    {onLogout ? (
                      <button
                        type="button"
                        onClick={onLogout}
                        data-tour="config-logout"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500/50 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-200 transition hover:border-red-400 hover:bg-red-500/30 hover:text-red-100 active:scale-95 shadow-lg shadow-red-500/20"
                      >
                        <span className="text-lg">🚪</span>
                        <span>Cerrar sesión</span>
                      </button>
                    ) : null}
                  </div>
                  <label className="w-full">
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      URL personalizada
                    </span>
                    <input
                      type="url"
                      value={profileForm.avatarUrl}
                      onChange={(event) => handleAvatarUrlChange(event.target.value)}
                      placeholder="https://tu-imagen..."
                      disabled={!canEditProfile || isSavingProfile}
                      className="mt-2 w-full rounded-2xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <p className="text-[11px] text-center text-white/40">
                    Aceptamos enlaces remotos o imágenes locales (se guardarán en tu perfil).
                  </p>
                </div>
              </div>

              <footer className="flex flex-col gap-4 border-t border-white/10 pt-4 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {profileError ? (
                    <p className="text-sm text-rose-300">{profileError}</p>
                  ) : profileStatus === "saved" ? (
                    <p className="text-sm text-emerald-300">
                      Perfil actualizado correctamente.
                    </p>
                  ) : (
                    <p className="text-xs text-white/50">
                      Los cambios se aplican a todas tus sesiones y avisos.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!canEditProfile || isSavingProfile}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow shadow-sky-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? "Guardando..." : "Guardar perfil"}
                </button>
              </footer>
            </>
          ) : (
            <p className="rounded-2xl bg-slate-950/50 p-4 text-sm text-white/60">
              Inicia sesión para personalizar tu perfil, foto y preferencias avanzadas.
            </p>
          )}
        </form>

        <form
          onSubmit={handlePreferencesSubmit}
          className="grid gap-7 rounded-3xl bg-slate-950/60 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <section className="space-y-5">
            <header className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">
                  Configuración
                </p>
                <h2 className="text-xl font-semibold text-white">
                  Preferencias personales
                </h2>
              </div>
              {savedAtLabel ? (
                <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  Guardado {savedAtLabel}
                </span>
              ) : null}
            </header>

            <div className="space-y-1 rounded-2xl bg-slate-950/50 p-2" data-tour="config-preferences">
              <p className="px-2 py-2 text-xs uppercase tracking-wide text-white/40">
                Calendario
              </p>
              <button
                type="button"
                onClick={() => setShowFestiveDaysModal(true)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <span className="font-semibold text-white">Días festivos</span>
                <div className="flex items-center gap-2">
                  {preferences.showFestiveDays ?? true ? (
                    <>
                      <span className="text-xs text-white/50">Activado</span>
                      <span
                        className="h-4 w-4 rounded-full border border-white/20"
                        style={{ backgroundColor: preferences.festiveDayColor ?? "#dc2626" }}
                        title={preferences.festiveDayColor ?? "#dc2626"}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-white/50">Desactivado</span>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/40" />
                </div>
              </button>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/40">Inicio de semana</p>
                <div className="mt-2 inline-flex gap-2 rounded-full bg-white/5 p-1 text-xs font-semibold uppercase tracking-wide text-white/60">
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
                      {option === "monday" ? "Lunes" : "Domingo"}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-white/50">
                  Afecta al orden en el calendario.
                </p>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                <span className="font-semibold text-white">Mostrar icono de información</span>
                <input
                  type="checkbox"
                  checked={preferences.showInfoIcon ?? true}
                  onChange={() => handleShowInfoIconChange(!(preferences.showInfoIcon ?? true))}
                  className="h-6 w-11 cursor-pointer rounded-full bg-slate-900/60 transition-all checked:bg-sky-500"
                />
              </label>
              <p className="text-xs text-white/50">
                Si está activado, verás el icono ℹ️ en calendario, plantillas, extras y configuración para abrir la ayuda y «Ver tutorial».
              </p>
            </div>

            {showFestiveDaysModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={() => setShowFestiveDaysModal(false)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="festive-days-modal-title"
              >
                <div
                  className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 id="festive-days-modal-title" className="text-lg font-semibold text-white">
                    Días festivos
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    Festivos nacionales (España) en el calendario.
                  </p>
                  <label className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                    <span className="font-semibold text-white">Mostrar días festivos</span>
                    <input
                      type="checkbox"
                      checked={preferences.showFestiveDays ?? true}
                      onChange={() => handleFestiveDaysChange(!(preferences.showFestiveDays ?? true))}
                      className="h-6 w-11 cursor-pointer rounded-full bg-slate-900/60 transition-all checked:bg-sky-500"
                    />
                  </label>
                  {(preferences.showFestiveDays ?? true) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                      <span className="text-xs text-white/70">Color</span>
                      <input
                        type="color"
                        value={preferences.festiveDayColor ?? "#dc2626"}
                        onChange={(e) => handleFestiveDayColorChange(e.target.value)}
                        className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        title="Color días festivos"
                      />
                      <span className="text-xs text-white/50">
                        {preferences.festiveDayColor ?? "#dc2626"}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFestiveDaysModal(false)}
                    className="mt-4 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5 rounded-2xl bg-slate-950/50 p-4 sm:p-5" data-tour="config-integrations">
            <section className="space-y-4">
              <header>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Integraciones
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Conecta tus herramientas
                </h3>
              </header>
              <div className="space-y-4 text-sm text-white/70">
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
                    Sincronizar con Google Calendar
                  </p>
                  <p className="mb-2 text-xs text-white/50">
                    Elige el mes a exportar (solo ese mes).
                  </p>
                  <select
                    value={syncMonth}
                    onChange={(e) => setSyncMonth(e.target.value)}
                    className="mb-3 w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                    aria-label="Mes a sincronizar"
                  >
                    {(() => {
                      const options: { value: string; label: string }[] = []
                      const now = new Date()
                      for (let i = -1; i <= 11; i++) {
                        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
                        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                        const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
                        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
                      }
                      return options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))
                    })()}
                  </select>
                  <button
                    type="button"
                    onClick={handleSyncGoogleCalendar}
                    disabled={isSyncingCalendar}
                    aria-busy={isSyncingCalendar}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2.5 font-semibold text-sky-200 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60 ${isSyncingCalendar ? "pointer-events-none" : ""}`}
                  >
                    {isSyncingCalendar ? "Generando archivo..." : "Descargar .ics del mes"}
                    <span aria-hidden>→</span>
                  </button>
                </div>

                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
                    Exportar informe mensual
                  </p>
                  <p className="mb-2 text-xs text-white/50">
                    Mes y formato (HTML o PDF).
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                      className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                      aria-label="Mes del informe"
                    >
                      {(() => {
                        const options: { value: string; label: string }[] = []
                        const now = new Date()
                        for (let i = -1; i <= 11; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
                          const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                          const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
                          options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
                        }
                        return options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))
                      })()}
                    </select>
                    <select
                      value={reportFormat}
                      onChange={(e) => setReportFormat(e.target.value as "html" | "pdf")}
                      className="rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                      aria-label="Formato del informe"
                    >
                      <option value="html">HTML</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportMonthlyReport}
                    disabled={isExportingMonthlyReport}
                    aria-busy={isExportingMonthlyReport}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2.5 font-semibold text-sky-200 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60 ${isExportingMonthlyReport ? "pointer-events-none" : ""}`}
                  >
                    {isExportingMonthlyReport ? "Preparando informe..." : `Descargar informe (${reportFormat.toUpperCase()})`}
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>

              {integrationStatus ? (
                <p
                  className={`text-xs ${integrationStatus.tone === "success" ? "text-emerald-300" : "text-rose-300"}`}
                >
                  {integrationStatus.message}
                </p>
              ) : null}
            </section>

            <footer className="space-y-3 border-t border-white/10 pt-4 text-sm text-white/70">
              {errorMessage ? (
                <p className="text-sm text-rose-300">{errorMessage}</p>
              ) : status === "saved" ? (
                <p className="text-sm text-emerald-300">
                  Tus preferencias se guardaron correctamente.
                </p>
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

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-950/95 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Historial de cambios
                </h3>
                <p className="text-sm text-white/60">
                  Revisa cómo evolucionó tu perfil y recupera tu configuración favorita.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseHistory}
                className="inline-flex items-center justify-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-4 pr-2">
              {isHistoryLoading ? (
                <p className="text-sm text-white/60">
                  Cargando historial de cambios...
                </p>
              ) : historyError ? (
                <p className="text-sm text-rose-300">{historyError}</p>
              ) : historyEntries.length === 0 ? (
                <p className="text-sm text-white/60">
                  Aún no registramos cambios en tu perfil. Actualiza tu nombre, foto o zona horaria para generar el primer registro.
                </p>
              ) : (
                historyEntries.map((entry) => {
                  const previousName = entry.previousName ?? user?.name ?? "Perfil anterior"
                  const newName = entry.newName ?? user?.name ?? "Perfil actualizado"
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-white/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-white/40">
                        Guardado {formatHistoryTimestamp(entry.changedAt)}
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-2xl bg-slate-950/50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                            Antes
                          </p>
                          <div className="flex items-center gap-3">
                            {renderAvatar(entry.previousAvatarUrl, previousName)}
                            <div className="text-sm text-white/70">
                              <p className="font-semibold text-white">{previousName}</p>
                              <p className="text-xs text-white/50">
                                {entry.previousTimezone ?? DEFAULT_TIMEZONE}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 rounded-2xl bg-slate-950/50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                            Ahora
                          </p>
                          <div className="flex items-center gap-3">
                            {renderAvatar(entry.newAvatarUrl, newName)}
                            <div className="text-sm text-white/70">
                              <p className="font-semibold text-white">{newName}</p>
                              <p className="text-xs text-white/50">
                                {entry.newTimezone ?? DEFAULT_TIMEZONE}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ConfigurationPanel
