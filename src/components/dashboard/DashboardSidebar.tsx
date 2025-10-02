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
      className={`hidden w-72 flex-col justify-between border-r border-white/5 bg-slate-950/70 px-6 py-8 backdrop-blur xl:flex ${
        className ?? ""
      }`}
    >
      <div className="space-y-10">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Supershift Ops
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de control</h1>
          <p className="text-sm text-white/60">
            Coordina turnos, anticipa rotaciones y mantén la productividad de tu equipo sin perder contexto.
          </p>
        </div>

        <nav className="space-y-3">
          {NAVIGATION_ITEMS.map((item, index) => (
            <button
              type="button"
              key={item.label}
              className={`group flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                index === 0
                  ? "border-blue-500/40 bg-gradient-to-r from-blue-500/20 to-transparent text-white shadow-lg shadow-blue-500/10"
                  : "border-transparent bg-white/5 text-white/70 hover:border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-lg">{item.icon}</span>
                {item.label}
              </span>
              <span className="text-xs text-white/60">{item.description}</span>
            </button>
          ))}
        </nav>
      </div>

     
    </aside>
  )
}

export default DashboardSidebar
