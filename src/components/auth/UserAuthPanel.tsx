"use client"

import { useMemo, useState } from "react"
import type { UserSummary } from "@/types/users"

type UserAuthPanelProps = {
  users: UserSummary[]
  onLogin: (user: UserSummary) => void
  onUserCreated: (user: UserSummary) => void
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
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeForm, setActiveForm] = useState<"login" | "register">("login")

  const handleFormChange = (form: "login" | "register") => {
    setActiveForm(form)

    if (form === "login") {
      setRegisterError("")
    } else {
      setLoginError("")
    }
  }

  const availableUserEmails = useMemo(() => {
    if (!users.length) {
      return ""
    }

    return users.map((user) => user.email).join(", ")
  }, [users])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")

    if (!loginEmail || !loginPassword) {
      setLoginError("Introduce tu correo y contraseña")
      return
    }

    try {
      setIsLoggingIn(true)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = (await response.json().catch(() => null)) as
        | { user?: UserSummary; error?: string }
        | null

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "No se pudo iniciar sesión")
      }

      onLogin(data.user)
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión"
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterError("")

    if (!registerName || !registerEmail || !registerPassword) {
      setRegisterError("Completa todos los campos para crear tu cuenta")
      return
    }

    try {
      setIsRegistering(true)
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { user?: UserSummary; error?: string }
        | null

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? "No se pudo crear el usuario")
      }

      onUserCreated(data.user)
      onLogin(data.user)
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el usuario"
      )
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[40px] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_40px_120px_-45px_rgba(14,116,244,0.75)] backdrop-blur-xl sm:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)] opacity-80" />

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        <section className="flex flex-col justify-between gap-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Organización inteligente
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Planifica turnos como si fuera una app nativa
            </h1>
            <p className="text-sm text-white/70">
              Centraliza tu equipo, mantén el control de los turnos y accede desde cualquier dispositivo. Inicia sesión o crea tu cuenta para comenzar.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Sesiones prolongadas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                Experiencia móvil
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-fuchsia-400" aria-hidden />
                Animaciones fluidas
              </span>
            </div>

            {availableUserEmails && (
              <p className="text-xs text-white/60">
                Usuarios de prueba: {availableUserEmails}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col justify-between gap-6 rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-inner shadow-blue-900/40 backdrop-blur-xl sm:p-8">
          <div className="mx-auto w-full max-w-xs rounded-full border border-white/10 bg-slate-900/70 p-1 text-xs font-semibold text-white/70 shadow-lg">
            <div className="grid grid-cols-2 gap-1">
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
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
            <div
              className="flex w-[200%] transition-transform duration-500 ease-in-out"
              style={{ transform: activeForm === "login" ? "translateX(0%)" : "translateX(-50%)" }}
            >
              <form
                onSubmit={handleLogin}
                className="w-1/2 space-y-6 px-6 py-8 sm:px-10"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Bienvenido de vuelta</h2>
                  <p className="text-sm text-white/60">
                    Accede con las credenciales que usaste al registrarte.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                      placeholder="tu@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                      placeholder="••••••••"
                    />
                  </div>
                  {loginError && <p className="text-sm text-red-400">{loginError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingIn ? "Accediendo..." : "Iniciar sesión"}
                </button>
              </form>

              <form
                onSubmit={handleRegister}
                className="w-1/2 space-y-6 px-6 py-8 sm:px-10"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Estrena tu espacio</h2>
                  <p className="text-sm text-white/60">
                    Regístrate para obtener tu propio calendario y comenzar a planificar.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(event) => setRegisterName(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      placeholder="Ana Ruiz"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(event) => setRegisterEmail(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      placeholder="ana@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  {registerError && (
                    <p className="text-sm text-red-400">{registerError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegistering ? "Creando cuenta..." : "Registrarme"}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
            Diseñado para turnos exigentes
          </p>
        </section>
      </div>
    </div>
  )
}
