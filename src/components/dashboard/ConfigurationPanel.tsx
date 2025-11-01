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
import { POPULAR_TIMEZONES } from "@/data/timezones"
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/types/preferences"
import type { UserProfileHistoryEntry, UserSummary } from "@/types/users"
import {
  enablePushNotifications,
  disablePushNotifications,
} from "@/lib/push-client"
import {
  enableShiftReminders,
  disableShiftReminders,
} from "@/lib/reminders-client"
import { applyThemePreference } from "@/lib/user-preferences"

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
  className,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    | {
        tone: "success" | "error"
        message: string
      }
    | null
  >(null)
  const [latestApiKey, setLatestApiKey] = useState<string | null>(null)
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false)
  const [isActivatingApiKey, setIsActivatingApiKey] = useState(false)
  const [isExportingMonthlyReport, setIsExportingMonthlyReport] = useState(false)
  const [apiClipboardStatus, setApiClipboardStatus] = useState<
    "idle" | "copied" | "error"
  >("idle")

  useEffect(() => {
    setPreferences(defaultPreferences)
  }, [defaultPreferences])

  useEffect(() => {
    return applyThemePreference(preferences.theme)
  }, [preferences.theme])

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

  useEffect(() => {
    let cancelled = false

    async function loadActiveApiKey() {
      if (!user?.id) {
        setLatestApiKey(null)
        setApiClipboardStatus("idle")
        return
      }

      try {
        const response = await fetch(
          `/api/integrations/team-api?userId=${encodeURIComponent(user.id)}`,
          { cache: "no-store" },
        )

        if (!response.ok) {
          return
        }

        const payload = (await response.json().catch(() => null)) as
          | { keys?: Array<{ token?: string | null; is_active?: boolean | null }> }
          | null

        const activeKey = (payload?.keys ?? []).find((candidate) => candidate?.is_active)

        if (!cancelled) {
          if (activeKey?.token && typeof activeKey.token === "string") {
            setLatestApiKey(activeKey.token)
          } else {
            setLatestApiKey(null)
          }
          setApiClipboardStatus("idle")
        }
      } catch (error) {
        console.warn("No se pudo cargar la clave API activa", error)
      }
    }

    loadActiveApiKey()

    return () => {
      cancelled = true
    }
  }, [user?.id])

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

  async function handleNotificationIntegration(
    field: keyof UserPreferences["notifications"],
    enabled: boolean,
  ) {
    if (field === "push") {
      const result = enabled
        ? await enablePushNotifications({ userId: user?.id ?? null })
        : await disablePushNotifications()
      setIntegrationStatus({
        tone: result.ok ? "success" : "error",
        message: result.message,
      })
      return
    }

    if (field === "reminders") {
      const result = enabled
        ? await enableShiftReminders({ userId: user?.id ?? null })
        : disableShiftReminders()
      setIntegrationStatus({
        tone: result.ok ? "success" : "error",
        message: result.message,
      })
    }
  }

  function resetPreferenceFeedback() {
    if (status !== "idle") {
      setStatus("idle")
    }
    if (errorMessage) {
      setErrorMessage(null)
    }
  }

  function handleToggle(field: keyof UserPreferences["notifications"]) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [field]: !current.notifications[field],
      },
    }))

    if (field === "push" || field === "reminders") {
      const nextValue = !preferences.notifications[field]
      queueMicrotask(() => {
        void handleNotificationIntegration(field, nextValue)
      })
    }
  }

  function handleThemeChange(theme: UserPreferences["theme"]) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      theme,
    }))
  }

  function handleStartOfWeekChange(startOfWeek: UserPreferences["startOfWeek"]) {
    resetPreferenceFeedback()
    setPreferences((current) => ({
      ...current,
      startOfWeek,
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

  async function handleActivateApiAccess() {
    if (isActivatingApiKey) {
      return
    }

    setIntegrationStatus(null)
    setApiClipboardStatus("idle")
    setIsActivatingApiKey(true)

    try {
      const response = await fetch("/api/integrations/team-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? null,
          label: `Token generado ${new Date().toISOString()}`,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "No se pudo activar la API para tu equipo.",
        )
      }

      const keyToken =
        payload?.key?.token && typeof payload.key.token === "string"
          ? payload.key.token.trim()
          : ""

      if (keyToken.length > 0) {
        setLatestApiKey(keyToken)

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(keyToken)
            setApiClipboardStatus("copied")
          } catch (clipboardError) {
            console.warn("No se pudo copiar la clave API al portapapeles", clipboardError)
            setApiClipboardStatus("error")
          }
        } else {
          setApiClipboardStatus("error")
        }
      }

      setIntegrationStatus({
        tone: "success",
        message:
          typeof payload.message === "string"
            ? payload.message
            : "Generamos una nueva clave API. Copia y guarda el token en un lugar seguro.",
      })
    } catch (error) {
      setIntegrationStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo activar la API para tu equipo.",
      })
    } finally {
      setIsActivatingApiKey(false)
    }
  }

  async function handleExportMonthlyReport() {
    if (isExportingMonthlyReport) {
      return
    }

    setIntegrationStatus(null)
    setIsExportingMonthlyReport(true)

    try {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

      const response = await fetch("/api/reports/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? null,
          email:
            preferences.notifications.email && user?.email
              ? user.email
              : null,
          userName: user?.name ?? null,
          month,
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

      if (typeof payload.html !== "string" || payload.html.length === 0) {
        setIntegrationStatus({
          tone: "error",
          message: "El informe mensual no devolvió datos para descargar.",
        })
        return
      }

      const fileName =
        typeof payload.fileName === "string" && payload.fileName.trim().length > 0
          ? payload.fileName.trim()
          : `informe-supershift-${month}.html`

      const bytes = decodeBase64ToUint8Array(payload.html)
      const safeBuffer = copyToArrayBuffer(bytes)
      const blob = new Blob([safeBuffer], { type: "text/html;charset=utf-8" })
      triggerDownload(fileName, blob)

      try {
        const htmlPreview = decodeBase64ToString(payload.html)
        openHtmlPreview(htmlPreview)
      } catch (previewError) {
        console.warn("No se pudo abrir la vista previa del informe", previewError)
      }

      const emailError = typeof payload.emailError === "string" ? payload.emailError : null
      const emailSent = Boolean(payload.emailSent)

      let message = emailSent
        ? "Te enviamos el informe por correo y lo descargamos en este dispositivo."
        : "Descargamos el informe mensual en este dispositivo."

      if (emailError) {
        message = `${message} No se pudo enviar el correo automático: ${emailError}`
      }

      setIntegrationStatus({
        tone: emailError ? "error" : "success",
        message,
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

  async function handleCopyApiKey() {
    if (!latestApiKey) {
      return
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setApiClipboardStatus("error")
      setIntegrationStatus({
        tone: "error",
        message:
          "Tu navegador no permite copiar automáticamente la clave API. Selecciónala manualmente y cópiala.",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(latestApiKey)
      setApiClipboardStatus("copied")
      setIntegrationStatus({
        tone: "success",
        message: "La clave API se copió al portapapeles.",
      })
    } catch (error) {
      console.error("No se pudo copiar la clave API", error)
      setApiClipboardStatus("error")
      setIntegrationStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo copiar la clave API. Selecciónala manualmente.",
      })
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
      className={`relative grid ${sizeClass} place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-blue-500/10`}
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
      className={`configuration-panel relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 text-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.95)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_60%),_radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_55%)]" />
      <div className="relative space-y-8 p-4 sm:p-6">
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-7 rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-6"
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
            {savedAtLabel ? (
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Preferencias guardadas {savedAtLabel}
              </span>
            ) : null}
          </header>

          {user ? (
            <>
              <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
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
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      Correo electrónico
                    </span>
                    <input
                      type="email"
                      value={profileForm.email}
                      readOnly
                      className="mt-2 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
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
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
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

                <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
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
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/15 px-4 py-2 font-semibold uppercase tracking-wide text-white/70 transition hover:border-sky-400/40 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Subir nueva foto
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAvatar}
                      disabled={!canEditProfile || isSavingProfile}
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-wide text-white/60 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Quitar foto
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenHistory}
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-wide text-white/70 transition hover:border-amber-300/40 hover:text-amber-200"
                    >
                      Ver historial de cambios
                    </button>
                    {onLogout ? (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex w-full items-center justify-center rounded-full border border-white/15 px-4 py-2 font-semibold uppercase tracking-wide text-white/70 transition hover:border-rose-400/60 hover:text-rose-200"
                      >
                        Cerrar sesión
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
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-white/60">
              Inicia sesión para personalizar tu perfil, foto y preferencias avanzadas.
            </p>
          )}
        </form>

        <form
          onSubmit={handlePreferencesSubmit}
          className="grid gap-7 rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]"
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
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  Guardado {savedAtLabel}
                </span>
              ) : null}
            </header>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">
                Inicio de semana
              </p>
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

            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
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
          </section>

          <aside className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
            <section className="space-y-4">
              <header>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Notificaciones
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Mantente informado
                </h3>
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
                    <p className="text-xs text-white/50">Entérate de cambios críticos en tiempo real.</p>
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

            <section className="space-y-4">
              <header>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Integraciones
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Conecta tus herramientas
                </h3>
              </header>
              <div className="space-y-3 text-sm text-white/70">
                <button
                  type="button"
                  onClick={handleSyncGoogleCalendar}
                  disabled={isSyncingCalendar}
                  aria-busy={isSyncingCalendar}
                  className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60 ${isSyncingCalendar ? "pointer-events-none" : ""}`}
                >
                  {isSyncingCalendar ? "Generando archivo..." : "Sincronizar con Google Calendar"}
                  <span aria-hidden>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleActivateApiAccess}
                  disabled={isActivatingApiKey}
                  aria-busy={isActivatingApiKey}
                  className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60 ${isActivatingApiKey ? "pointer-events-none" : ""}`}
                >
                  {isActivatingApiKey ? "Activando API..." : "Activar API para tu equipo"}
                  <span aria-hidden>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportMonthlyReport}
                  disabled={isExportingMonthlyReport}
                  aria-busy={isExportingMonthlyReport}
                  className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold uppercase tracking-wide transition hover:border-sky-400/40 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60 ${isExportingMonthlyReport ? "pointer-events-none" : ""}`}
                >
                  {isExportingMonthlyReport ? "Preparando informe..." : "Exportar informe mensual (HTML/PDF)"}
                  <span aria-hidden>→</span>
                </button>
              </div>

              {latestApiKey ? (
                <div className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-xs text-white/80">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Clave API activa
                  </p>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <code className="break-all font-mono text-[11px] text-sky-200">
                      {latestApiKey}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyApiKey}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-sky-400/50 hover:text-sky-200"
                    >
                      {apiClipboardStatus === "copied" ? "Copiada" : "Copiar"}
                    </button>
                  </div>
                  {apiClipboardStatus === "error" ? (
                    <p className="text-[11px] text-rose-300">
                      No se pudo copiar automáticamente. Selecciona la clave y cópiala manualmente.
                    </p>
                  ) : apiClipboardStatus === "copied" ? (
                    <p className="text-[11px] text-emerald-300">La clave se copió al portapapeles.</p>
                  ) : null}
                </div>
              ) : null}

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
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl">
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
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
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
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-white/40">
                        Guardado {formatHistoryTimestamp(entry.changedAt)}
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
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
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
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
