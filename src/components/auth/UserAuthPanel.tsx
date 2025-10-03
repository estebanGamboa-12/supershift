"use client"

import { useState } from "react"
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-white shadow-2xl">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Bienvenido a Supershift</h1>
        <p className="text-sm text-white/60">
          Crea tu cuenta para gestionar tus turnos o inicia sesión si ya formas parte del equipo.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Iniciar sesión</h2>
            <p className="text-sm text-white/60">
              Accede con las credenciales que usaste al registrarte.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-white/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                placeholder="tu@empresa.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-white/60">
                Contraseña
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                placeholder="••••••••"
              />
            </div>
            {users.length > 0 && (
              <p className="text-xs text-white/50">
                Usuarios disponibles: {users.map((user) => user.email).join(", ")}
              </p>
            )}
            {loginError && <p className="text-sm text-red-400">{loginError}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn ? "Accediendo..." : "Iniciar sesión"}
          </button>
        </form>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Crear cuenta</h2>
            <p className="text-sm text-white/60">
              Regístrate para obtener tu propio calendario y comenzar a planificar.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-white/60">
                Nombre completo
              </label>
              <input
                type="text"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                placeholder="Ana Ruiz"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-white/60">
                Correo electrónico
              </label>
              <input
                type="email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                placeholder="ana@empresa.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-white/60">
                Contraseña
              </label>
              <input
                type="password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
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
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegistering ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>
      </div>
    </div>
  )
}
