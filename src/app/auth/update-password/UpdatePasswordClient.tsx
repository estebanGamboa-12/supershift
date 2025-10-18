"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

function collectAuthParams(searchParams: ReturnType<typeof useSearchParams>): Map<string, string> {
  const entries = new Map<string, string>()

  if (searchParams) {
    searchParams.forEach((value, key) => {
      entries.set(key, value)
    })
  }

  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href)
    const hashParams = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : currentUrl.hash)
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

function applyRedirectToUrl(redirect: string) {
  if (typeof window === "undefined") {
    return
  }

  const currentUrl = new URL(window.location.href)
  const params = new URLSearchParams(currentUrl.search)
  params.delete("redirect")
  params.delete("redirectTo")
  params.delete("next")

  if (redirect && redirect !== "/") {
    params.set("redirect", redirect)
  }

  const query = params.toString()
  const newUrl = `${currentUrl.pathname}${query ? `?${query}` : ""}`
  window.history.replaceState({}, "", newUrl)
}

function Spinner() {
  return (
    <div className="mx-auto mt-6 flex w-12 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  )
}

type ViewState =
  | {
      status: "loading"
      title: string
      message: string
    }
  | {
      status: "ready"
      title: string
      message: string
    }
  | {
      status: "processing"
      title: string
      message: string
    }
  | {
      status: "error"
      title: string
      message: string
      details?: string
    }

export default function UpdatePasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [formError, setFormError] = useState("")
  const [redirectTarget, setRedirectTarget] = useState("/")
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null)
  const [state, setState] = useState<ViewState>({
    status: "loading",
    title: "Preparando actualización",
    message: "Validando tu enlace seguro para restablecer la contraseña...",
  })

  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("No se pudo inicializar el cliente de Supabase en update-password", error)
      return null
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!supabase) {
      setState({
        status: "error",
        title: "Supabase no está configurado",
        message:
          "No se pudo inicializar el cliente de Supabase en el navegador. Revisa las variables de entorno y vuelve a abrir el enlace.",
      })
      return
    }

    let isActive = true

    const execute = async () => {
      const params = collectAuthParams(searchParams)
      const accessToken = readParam(params, ["access_token", "accessToken"])
      const refreshToken = readParam(params, ["refresh_token", "refreshToken"])
      const type = readParam(params, ["type"])
      const redirect = sanitizeRedirectTarget(
        readParam(params, ["redirect", "redirectTo", "next"]),
      )

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
        "provider_token",
        "provider_refresh_token",
        "scope",
      ])
      applyRedirectToUrl(redirect)

      if (!accessToken || !refreshToken) {
        setState({
          status: "error",
          title: "Faltan datos en el enlace",
          message:
            "No encontramos los tokens necesarios para restablecer tu contraseña. Solicita un nuevo correo de recuperación.",
        })
        return
      }

      if (type !== "recovery") {
        setState({
          status: "error",
          title: "Enlace inválido",
          message:
            "El enlace recibido no corresponde a un flujo de recuperación de contraseña. Solicita un nuevo correo desde la aplicación.",
        })
        return
      }

      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          throw error
        }

        if (!isActive) {
          return
        }

        setTokens({ accessToken, refreshToken })
        setRedirectTarget(redirect)
        setState({
          status: "ready",
          title: "Restablece tu contraseña",
          message: "Introduce una nueva contraseña para tu cuenta de Planloop.",
        })
      } catch (error) {
        console.error("Error preparando la sesión de recuperación", error)
        if (!isActive) {
          return
        }
        setState({
          status: "error",
          title: "No se pudo validar el enlace",
          message:
            "Ocurrió un problema al activar tu sesión temporal. Solicita un nuevo correo de recuperación.",
          details: error instanceof Error ? error.message : undefined,
        })
      }
    }

    void execute()

    return () => {
      isActive = false
    }
  }, [searchParams, supabase])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError("")

    if (!supabase) {
      setFormError(
        "Supabase no está configurado correctamente. Revisa las variables de entorno.",
      )
      return
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden")
      return
    }

    if (!tokens) {
      setFormError(
        "No se encontró una sesión activa para completar el cambio. Solicita un nuevo correo de recuperación.",
      )
      return
    }

    try {
      setState({
        status: "processing",
        title: "Actualizando contraseña",
        message: "Guardando tu nueva contraseña de forma segura...",
      })

      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        throw error
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw sessionError
      }

      const session = sessionData?.session
      const accessToken = session?.access_token ?? tokens.accessToken
      const refreshToken = session?.refresh_token ?? tokens.refreshToken

      if (!accessToken || !refreshToken) {
        throw new Error(
          "Supabase no devolvió una sesión válida tras actualizar la contraseña.",
        )
      }

      const redirectParams = new URLSearchParams({ type: "recovery" })
      if (redirectTarget && redirectTarget !== "/") {
        redirectParams.set("redirect", redirectTarget)
      }
      redirectParams.set("access_token", accessToken)
      redirectParams.set("refresh_token", refreshToken)

      router.replace(`/auth/callback?${redirectParams.toString()}`)
    } catch (error) {
      console.error("Error actualizando la contraseña", error)
      setState({
        status: "ready",
        title: "Restablece tu contraseña",
        message: "Introduce una nueva contraseña para tu cuenta de Planloop.",
      })
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contraseña. Vuelve a intentarlo.",
      )
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{state.title}</h1>
          <p className="text-sm text-white/70">{state.message}</p>
          {state.status === "error" && state.details && (
            <p className="text-xs text-red-300/80">{state.details}</p>
          )}
        </div>

        {(state.status === "loading" || state.status === "processing") && <Spinner />}

        {state.status === "ready" && (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3 text-left">
              <label className="block text-sm font-medium text-white/80" htmlFor="password">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-slate-900/80"
                placeholder="Introduce una contraseña segura"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-3 text-left">
              <label className="block text-sm font-medium text-white/80" htmlFor="confirmPassword">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-slate-900/80"
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                required
              />
            </div>

            {formError && (
              <p className="text-sm text-red-300/90">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Guardar nueva contraseña
            </button>
          </form>
        )}

        {state.status === "error" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{state.message}</p>
              {state.details && (
                <p className="mt-2 text-xs text-red-200/70">Detalles: {state.details}</p>
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
