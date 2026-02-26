"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { UserSummary } from "@/types/users"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken } from "@/lib/auth-client"

type UserAuthPanelProps = {
  users: UserSummary[]
  onLogin: (user: UserSummary) => void
  onUserCreated: (user: UserSummary) => void
}

function Spinner() {
  return (
    <motion.div
      className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  )
}

export default function UserAuthPanel({
  users,
  onLogin,
  onUserCreated: _onUserCreated,
}: UserAuthPanelProps) {
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const hasActiveUsers = users.length > 0

  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("Supabase client could not be initialised", error)
      return null
    }
  }, [])

  const handleGoogleLogin = async () => {
    setLoginError("")
    if (!supabase) {
      setLoginError(
        "Supabase no está configurado correctamente. Revisa las variables de entorno.",
      )
      return
    }

    try {
      setIsLoggingIn(true)
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const redirectTo = origin ? `${origin}/auth/callback` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        const normalisedMessage = error.message.toLowerCase()
        if (
          normalisedMessage.includes("provider is not enabled") ||
          normalisedMessage.includes("unsupported provider")
        ) {
          setLoginError(
            "El inicio de sesión con Google no está habilitado. Activa el proveedor de Google en el panel de Supabase (Authentication → Providers) y configura las credenciales correspondientes.",
          )
          return
        }

        setLoginError(error.message)
        return
      }

      setLoginError("No se pudo iniciar sesión con Google")
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-white shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent opacity-80" />

      <div className="relative z-10 mb-10 flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <span
            className="pointer-events-none absolute inset-0 -translate-y-1 scale-125 rounded-full bg-cyan-400/25 blur-xl"
            aria-hidden
          />
          <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl shadow-blue-500/20">
            <Image
              src="/planloop-logo.svg"
              alt="Logotipo de Planloop"
              width={56}
              height={56}
              priority
              className="h-14 w-14"
            />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Planloop</h1>
          <p className="text-sm text-white/70">
            Accede con tu cuenta de Google para gestionar tus turnos.
          </p>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-center">Entra o crea tu cuenta</h2>
          <p className="text-center text-sm text-white/60">
            Solo con Google. Sin contraseñas ni formularios.
          </p>
        </div>

        {loginError && (
          <p className="text-sm text-center text-red-400">
            {loginError}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
        >
          {isLoggingIn ? <Spinner /> : null}
          <span>{isLoggingIn ? "Redirigiendo a Google..." : "Continuar con Google"}</span>
        </button>

        <p className="text-center text-xs text-white/40">
          Si ya tienes cuenta, entras. Si no, la creamos al momento. No guardamos contraseñas.
        </p>
      </div>

      {hasActiveUsers && (
        <div className="relative z-10 mt-10 space-y-1 text-center text-xs text-white/50">
          <p className="font-medium text-white/60">Personas ya organizando sus turnos</p>
          <p>Planloop ayuda a equipos a mantener sus turnos sincronizados.</p>
        </div>
      )}

      <p className="mt-10 text-center text-[11px] tracking-[0.3em] text-white/40">
        <a
          href="https://www.esteban-dev.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/70 transition"
        >
          Diseñado por Esteban Gamboa
        </a>
      </p>
    </div>
  )
}
