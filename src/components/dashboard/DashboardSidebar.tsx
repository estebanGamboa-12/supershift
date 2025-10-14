import Image from "next/image"
import type { FC } from "react"

const NAVIGATION_ITEMS = [
  { label: "Panel principal", description: "Resumen y métricas", icon: "📊" },
  { label: "Calendario", description: "Visión mensual", icon: "🗓️" },
  { label: "Agenda", description: "Detalle semanal", icon: "🧭" },
  { label: "Equipo", description: "Turnos compartidos", icon: "👥" },
]

interface DashboardSidebarProps {
  className?: string
}

const DashboardSidebar: FC<DashboardSidebarProps> = ({ className }) => {
  return (
    <aside
      className={`hidden w-72 flex-col justify-between border-r border-white/10 bg-slate-950/80 px-6 py-8 backdrop-blur-xl lg:flex ${className ?? ""}`}
    >
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-0 -translate-y-1 scale-125 rounded-full bg-cyan-400/20 blur-lg" aria-hidden />
            <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg shadow-blue-500/20">
              <Image src="/corp-logo.svg" alt="Logotipo de Corp" width={48} height={48} priority className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Corp Ops
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Centro de control</h1>
            <p className="text-sm leading-relaxed text-white/60">
              Coordina turnos, anticipa rotaciones y mantén la productividad de tu equipo sin perder contexto.
            </p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="space-y-3">
          {NAVIGATION_ITEMS.map((item, index) => {
            const isActive = index === 0
            return (
              <button
                type="button"
                key={item.label}
                className={`group flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-blue-500/40 bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-white shadow-md shadow-blue-500/10"
                    : "border-transparent bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${
                      isActive
                        ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 text-blue-100"
                        : "bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                <span className="text-xs text-white/50">{item.description}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer / version / ajustes rápidos */}
      <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
        v1.0.0 — Corp
      </div>
    </aside>
  )
}

export default DashboardSidebar
