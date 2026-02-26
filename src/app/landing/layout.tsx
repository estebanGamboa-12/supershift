import type { ReactNode } from "react"
import Link from "next/link"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.planloop.app"

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <span className="text-xl tracking-tight">Planloop</span>
          </Link>
          <nav className="flex items-center gap-4">
            <a
              href={`${APP_URL}/pricing`}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Precios
            </a>
            <a
              href={`${APP_URL}/auth`}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Entrar
            </a>
            <a
              href={`${APP_URL}/`}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
            >
              Crear cuenta
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Planloop.{" "}
              <a
                href="https://www.esteban-dev.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-300 transition"
              >
                Diseñado por Esteban Gamboa
              </a>
            </p>
            <div className="flex gap-6">
              <a href={`${APP_URL}/pricing`} className="text-sm text-slate-500 hover:text-slate-300">
                Precios
              </a>
              <a href={`${APP_URL}/auth`} className="text-sm text-slate-500 hover:text-slate-300">
                Entrar
              </a>
              <a href={`${APP_URL}/`} className="text-sm text-slate-500 hover:text-slate-300">
                Crear cuenta
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
