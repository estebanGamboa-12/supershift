"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { UserSummary } from "@/types/users"

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
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeForm, setActiveForm] = useState<"login" | "register">("login")

  const handleFormChange = (form: "login" | "register") => {
    setActiveForm(form)
    if (form === "login") setRegisterError("")
    else setLoginError("")
  }

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
      if (!response.ok || !data?.user) throw new Error(data?.error ?? "No se pudo iniciar sesión")
      onLogin(data.user)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo iniciar sesión")
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
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword }),
      })
      const data = (await response.json().catch(() => null)) as
        | { user?: UserSummary; error?: string }
        | null
      if (!response.ok || !data?.user) throw new Error(data?.error ?? "No se pudo crear el usuario")
      onUserCreated(data.user)
      onLogin(data.user)
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : "No se pudo crear el usuario")
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-white shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent opacity-80" />

      {/* Toggle */}
      <div className="relative z-10 mx-auto mb-8 w-full max-w-xs rounded-full border border-white/10 bg-slate-800/50 p-1 text-xs font-semibold text-white/70 shadow-lg">
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
            </motion.form>
          ) : (
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
          )}
        </AnimatePresence>
      </div>

      <p className="mt-10 text-center text-[11px] tracking-[0.3em] text-white/40">
        Diseñado por Esteban Gamboa 
      </p>
    </div>
  )
}
