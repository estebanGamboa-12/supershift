"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { UserSummary } from "@/types/users"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { exchangeAccessToken, requestPasswordRecovery } from "@/lib/auth-client"

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
  onUserCreated,
}: UserAuthPanelProps) {
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [registerNotice, setRegisterNotice] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeForm, setActiveForm] = useState<"login" | "register" | "recover">(
    "login",
  )

  const [resetEmail, setResetEmail] = useState("")
  const [resetError, setResetError] = useState("")
  const [resetNotice, setResetNotice] = useState("")
  const [isResetting, setIsResetting] = useState(false)

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

  const exchangeSession = async (accessToken: string) => {
    const user = await exchangeAccessToken(accessToken)
    onLogin(user)
    return user
  }

  const handleFormChange = (form: "login" | "register" | "recover") => {
    setActiveForm(form)
    if (form === "login") setRegisterError("")
    else setLoginError("")
    setRegisterNotice("")
    setResetError("")
    setResetNotice("")
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")
    if (!loginEmail || !loginPassword) {
      setLoginError("Introduce tu correo y contraseña")
      return
    }
    if (!supabase) {
      setLoginError(
        "Supabase no está configurado correctamente. Revisa las variables de entorno.",
      )
      return
    }
    try {
      setIsLoggingIn(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) {
        throw error
      }

      const accessToken = data.session?.access_token
      if (!accessToken) {
        throw new Error(
          "Supabase no devolvió una sesión activa. Vuelve a intentarlo.",
        )
      }

      await exchangeSession(accessToken)
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión",
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterError("")
    setRegisterNotice("")
    if (!registerName || !registerEmail || !registerPassword) {
      setRegisterError("Completa todos los campos para crear tu cuenta")
      return
    }
    if (registerPassword.length < 6) {
      setRegisterError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    try {
      setIsRegistering(true)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { user?: UserSummary; error?: string; notice?: string }
        | null

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "No se pudo crear el usuario")
      }

      onUserCreated(data.user)
      const notice =
        typeof data.notice === "string" && data.notice.trim().length > 0
          ? data.notice
          : null

      setRegisterNotice(
        notice ??
          "Hemos enviado un correo de verificación. Revisa tu bandeja de entrada para activar tu cuenta.",
      )
      setRegisterPassword("")
    } catch (error) {
      setRegisterError(
        error instanceof Error ? error.message : "No se pudo crear el usuario",
      )
    } finally {
      setIsRegistering(false)
    }
  }

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
      const redirectTo = origin ? `${origin}/` : undefined
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

  const handleRecover = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetError("")
    setResetNotice("")

    const email = resetEmail.trim()
    if (!email) {
      setResetError("Introduce el correo asociado a tu cuenta")
      return
    }

    try {
      setIsResetting(true)
      await requestPasswordRecovery({ email })

      setResetNotice(
        "Si la dirección existe en nuestra base de datos, te enviaremos un correo con instrucciones para restablecer tu contraseña.",
      )
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el proceso de recuperación",
      )
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-white shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent opacity-80" />

      <div className="relative z-10 mb-10 flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <span className="pointer-events-none absolute inset-0 -translate-y-1 scale-125 rounded-full bg-cyan-400/25 blur-xl" aria-hidden />
          <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl shadow-blue-500/20">
            <Image src="/planloop-logo.svg" alt="Logotipo de Planloop" width={56} height={56} priority className="h-14 w-14" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Planloop</h1>
          <p className="text-sm text-white/70">Planifica turnos con estilo profesional.</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="relative z-10 mx-auto mb-8 w-full max-w-xs rounded-full border border-white/10 bg-slate-800/50 p-1 text-xs font-semibold text-white/70 shadow-lg">
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleFormChange("login")}
            className={`rounded-full px-4 py-2 transition-all ${
              activeForm === "login"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                : "hover:bg-white/5"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => handleFormChange("register")}
            className={`rounded-full px-4 py-2 transition-all ${
              activeForm === "register"
                ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md"
                : "hover:bg-white/5"
            }`}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => handleFormChange("recover")}
            className={`rounded-full px-4 py-2 transition-all ${
              activeForm === "recover"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                : "hover:bg-white/5"
            }`}
          >
            Recuperar
          </button>
        </div>
      </div>

      {/* Formularios animados */}
      <div className="relative min-h-[420px]">
        <AnimatePresence mode="wait">
          {activeForm === "login" ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onSubmit={handleLogin}
              className="absolute inset-0 w-full space-y-5"
            >
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Bienvenido de vuelta
              </h2>
              <p className="mb-6 text-center text-sm text-white/70">
                Accede con las credenciales que usaste al registrarte.
              </p>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
              />
              {loginError && <p className="text-sm text-red-400">{loginError}</p>}
              <button
                type="button"
                onClick={() => handleFormChange("recover")}
                className="w-full text-left text-xs font-semibold text-blue-300 underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.02]"
                >
                  {isLoggingIn ? (
                    <>
                      <Spinner /> Accediendo...
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </button>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="h-px flex-1 bg-white/10" />
                  o continúa con
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10"
                >
                  {isLoggingIn ? <Spinner /> : null}
                  <span>{isLoggingIn ? "Redirigiendo..." : "Google"}</span>
                </button>
              </div>
            </motion.form>
          ) : activeForm === "register" ? (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onSubmit={handleRegister}
              className="absolute inset-0 w-full space-y-5"
            >
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                Estrena tu espacio
              </h2>
              <p className="mb-6 text-center text-sm text-white/70">
                Regístrate para obtener tu propio calendario y comenzar a planificar.
              </p>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Ana Ruiz"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/40"
              />
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="ana@empresa.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              />
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
              />
              {registerError && <p className="text-sm text-red-400">{registerError}</p>}
              {registerNotice && (
                <p className="text-sm text-emerald-400">{registerNotice}</p>
              )}
              <button
                type="submit"
                disabled={isRegistering}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.02]"
              >
                {isRegistering ? (
                  <>
                    <Spinner /> Creando cuenta...
                  </>
                ) : (
                  "Registrarme"
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="recover"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onSubmit={handleRecover}
              className="absolute inset-0 flex h-full w-full flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Recupera tu acceso
                </h2>
                <p className="text-center text-sm text-white/70">
                  Introduce tu correo y te enviaremos un enlace seguro para restablecer la contraseña.
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                />
                {resetError && <p className="text-sm text-red-400">{resetError}</p>}
                {resetNotice && <p className="text-sm text-emerald-400">{resetNotice}</p>}
              </div>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.02]"
                >
                  {isResetting ? (
                    <>
                      <Spinner /> Enviando instrucciones...
                    </>
                  ) : (
                    "Enviar enlace de recuperación"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleFormChange("login")}
                  className="w-full text-center text-xs font-semibold text-white/60 underline-offset-4 hover:underline"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {hasActiveUsers && (
        <div className="relative z-10 mt-10 space-y-1 text-center text-xs text-white/50">
          <p className="font-medium text-white/60">Personas ya organizando sus turnos</p>
          <p>Planloop ayuda a equipos a mantener sus turnos sincronizados.</p>
        </div>
      )}

      <p className="mt-10 text-center text-[11px] tracking-[0.3em] text-white/40">
        Diseñado por Esteban Gamboa 
      </p>
    </div>
  )
}
