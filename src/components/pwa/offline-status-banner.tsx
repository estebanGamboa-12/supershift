"use client"

import { useMemo } from "react"

export type OfflineStatusBannerProps = {
  isOffline: boolean
  pendingCount: number
  isSyncing: boolean
  lastError?: string | null
  onRetry?: () => void
}

export function OfflineStatusBanner({
  isOffline,
  pendingCount,
  isSyncing,
  lastError,
  onRetry,
}: OfflineStatusBannerProps) {
  const shouldRender = isOffline || pendingCount > 0 || Boolean(lastError)

  const status = useMemo(() => {
    if (isOffline) {
      return {
        title: "Sin conexión",
        description:
          "Estás trabajando sin internet. Guardaremos los cambios y los sincronizaremos cuando vuelvas a estar en línea.",
        tone: "warning" as const,
      }
    }

    if (lastError) {
      return {
        title: "Error al sincronizar",
        description: lastError,
        tone: "error" as const,
      }
    }

    if (pendingCount > 0) {
      return {
        title: isSyncing ? "Sincronizando cambios" : "Cambios pendientes",
        description: isSyncing
          ? "Estamos enviando tus últimos cambios al servidor."
          : `Tienes ${pendingCount} cambio${pendingCount === 1 ? "" : "s"} pendiente${
              pendingCount === 1 ? "" : "s"
            } de sincronizar.`,
        tone: "info" as const,
      }
    }

    return null
  }, [isOffline, isSyncing, lastError, pendingCount])

  if (!shouldRender || !status) {
    return null
  }

  const toneClasses: Record<"warning" | "info" | "error", string> = {
    warning:
      "border-amber-400/40 bg-amber-500/10 text-amber-100 shadow-[0_8px_30px_rgba(251,191,36,0.25)]",
    info: "border-blue-400/30 bg-blue-500/10 text-blue-100 shadow-[0_8px_30px_rgba(59,130,246,0.25)]",
    error: "border-red-400/40 bg-red-500/10 text-red-100 shadow-[0_8px_30px_rgba(248,113,113,0.25)]",
  }

  return (
    <div className="sticky top-4 z-[60] flex justify-center px-2 sm:px-6">
      <div
        className={`w-full max-w-2xl rounded-2xl border px-5 py-4 text-sm backdrop-blur transition ${toneClasses[status.tone]}`}
        role={status.tone === "error" ? "alert" : "status"}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold tracking-tight">{status.title}</p>
            <p className="mt-1 text-sm text-white/80">{status.description}</p>
          </div>
          {onRetry && !isOffline ? (
            <button
              type="button"
              onClick={onRetry}
              className="self-start rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/60 hover:text-white"
              disabled={isSyncing}
            >
              {isSyncing ? "Sincronizando..." : "Reintentar"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
