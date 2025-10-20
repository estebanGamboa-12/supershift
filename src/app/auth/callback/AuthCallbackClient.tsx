"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { UserSummary } from "@/types/users"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"

function Spinner() {
  return (
    <div className="mx-auto mt-6 flex w-12 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  )
}

function collectAuthParams(
  searchParams: ReturnType<typeof useSearchParams>,
  hash: string,
): Map<string, string> {
  const entries = new Map<string, string>()

  if (searchParams) {
    searchParams.forEach((value, key) => {
      entries.set(key, value)
    })
  }

  if (hash) {
    const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash
    const hashParams = new URLSearchParams(normalizedHash)
    hashParams.forEach((value, key) => {
      entries.set(key, value)
    })
  }

  return entries
}

function readParam(params: Map<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key)
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }
  return null
}

function sanitizeRedirectTarget(value: string | null): string {
  if (!value) {
    return "/"
  }

  const trimmed = value.trim()

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/"
  }

  return trimmed || "/"
}

function removeAuthParamsFromUrl(keys: string[]) {
  if (typeof window === "undefined") {
    return
  }

  const currentUrl = new URL(window.location.href)
  const params = new URLSearchParams(currentUrl.search)
  keys.forEach((key) => {
    params.delete(key)
  })
  currentUrl.hash = ""
  const query = params.toString()
  const newUrl = `${currentUrl.pathname}${query ? `?${query}` : ""}`
  window.history.replaceState({}, "", newUrl)
}

type AuthState =
  | {
      status: "processing"
      title: string
      message: string
      details?: string
    }
  | {
      status: "success"
      title: string
      message: string
      details?: string
    }
  | {
    status: "error"
    title: string
    message: string
    details?: string
  }

export default function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserSummary | null>(null)
  const [state, setState] = useState<AuthState>({
    status: "processing",
    title: "Procesando acceso",
    message: "Estamos validando tu enlace de autenticación con Supabase...",
  })

  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error(
        "No se pudo inicializar el cliente de Supabase en la página de callback",
        error,
      )
      return null
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let isActive = true
    let redirectTimer: number | undefined

    const execute = async () => {
      const params = collectAuthParams(searchParams, window.location.hash)
      let accessToken = readParam(params, ["access_token", "accessToken"])
      let refreshToken = readParam(params, ["refresh_token", "refreshToken"])
      const exchangeCode = readParam(params, ["code"])
      const errorDescription = readParam(params, [
        "error_description",
        "error", // Supabase usa "error" para el código en algunas respuestas
        "message",
      ])
      const redirectTarget = sanitizeRedirectTarget(
        readParam(params, ["redirectTo", "redirect_to", "redirect", "next"]),
      )
      const authType = readParam(params, ["type"]) ?? ""

      removeAuthParamsFromUrl([
        "access_token",
        "accessToken",
        "refresh_token",
        "refreshToken",
        "expires_in",
        "expiresIn",
        "token_type",
        "tokenType",
        "type",
        "code",
        "error",
        "error_code",
        "error_description",
        "message",
        "provider_token",
        "provider_refresh_token",
        "scope",
        "redirect",
        "redirectTo",
        "redirect_to",
        "next",
      ])

      if ((!accessToken || !refreshToken) && supabase && exchangeCode) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            exchangeCode,
          )
          if (error) {
            throw error
          }
          accessToken = data.session?.access_token ?? accessToken
          refreshToken = data.session?.refresh_token ?? refreshToken
        } catch (error) {
          console.error("Error intercambiando código de autenticación", error)
        }
      }

      if (errorDescription) {
        setState({
          status: "error",
          title: "No se pudo completar la autenticación",
          message:
            "Supabase devolvió un error al procesar tu enlace. Solicita un nuevo correo de verificación o inicia sesión nuevamente.",
          details: errorDescription,
        })
        return
      }

      if (!accessToken) {
        setState({
          status: "error",
          title: "Faltan datos en el enlace",
          message:
            "No encontramos el token de acceso necesario para validar tu cuenta. Vuelve a solicitar el enlace desde la aplicación.",
        })
        return
      }

      if (!refreshToken) {
        setState({
          status: "error",
          title: "No se pudo crear la sesión",
          message:
            "El enlace recibido no incluye un refresh token válido. Vuelve a iniciar sesión para obtener un enlace actualizado.",
        })
        return
      }

      if (!supabase) {
        setState({
          status: "error",
          title: "Supabase no está configurado",
          message:
            "No se pudo inicializar el cliente de Supabase en el navegador. Revisa la configuración de las variables de entorno.",
        })
        return
      }

      try {
        setState({
          status: "processing",
          title: "Creando sesión",
          message: "Estamos validando tu cuenta y preparando tu panel...",
        })

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          throw sessionError
        }

        const loggedUser = await exchangeAccessToken(accessToken)

        if (!isActive) {
          return
        }

        setUser(loggedUser)

        const successTitle =
          authType === "signup"
            ? "¡Tu cuenta está lista!"
            : authType === "recovery"
              ? "¡Contraseña actualizada!"
              : authType === "email_change"
                ? "¡Correo actualizado!"
                : "Sesión iniciada correctamente"

        setState({
          status: "success",
          title: successTitle,
          message:
            "La sesión se ha activado y en unos segundos te llevaremos al panel principal.",
          details: `Redirigiendo a ${redirectTarget}`,
        })

        redirectTimer = window.setTimeout(() => {
          router.replace(redirectTarget)
        }, 2500)
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error("Error durante el callback de Supabase", error)

        setState({
          status: "error",
          title: "No se pudo completar la autenticación",
          message:
            "Ocurrió un problema al crear tu sesión. Vuelve a iniciar sesión o solicita un nuevo enlace.",
          details: error instanceof Error ? error.message : undefined,
        })
      }
    }

    void execute()

    return () => {
      isActive = false
      if (redirectTimer) {
        window.clearTimeout(redirectTimer)
      }
    }
  }, [router, searchParams, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{state.title}</h1>
          <p className="text-sm text-white/70">{state.message}</p>
          {state.details && (
            <p className="text-xs text-white/50">{state.details}</p>
          )}
        </div>

        {state.status === "processing" && <Spinner />}

        {state.status === "success" && user && (
          <div className="mt-8 space-y-4 text-center">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <p className="font-semibold">Bienvenido, {user.name || user.email}.</p>
              {user.email && (
                <p className="text-emerald-200/80">Correo verificado: {user.email}</p>
              )}
            </div>
            <p className="text-xs text-white/60">
              Si la redirección no ocurre automáticamente, usa el siguiente botón.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Ir al panel
            </Link>
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{state.message}</p>
              {state.details && (
                <p className="mt-2 text-xs text-red-200/80">Detalles: {state.details}</p>
              )}
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
