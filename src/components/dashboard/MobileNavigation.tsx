"use client"

import type { FC } from "react"

const NAV_ITEMS = [
  { value: "calendar", tab: "settings", label: "Configuración", icon: "⚙️" },
  { value: "stats", tab: "stats", label: "Estadísticas", icon: "📊" },
  { value: "team", tab: "team", label: "Equipo", icon: "👥" },
  { value: "settings", tab: "calendar", label: "Calendario", icon: "📅" },
] as const

export type MobileTab = (typeof NAV_ITEMS)[number]["tab"]

type MobileNavigationProps = {
  active: MobileTab
  onChange: (tab: MobileTab) => void
}

const MobileNavigation: FC<MobileNavigationProps> = ({ active, onChange }) => {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="pointer-events-auto flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl shadow-blue-500/20 backdrop-blur">
          {NAV_ITEMS.map((item) => {
            const isActive = item.tab === active
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.tab)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-br from-blue-500/40 to-indigo-500/40 text-white shadow-inner shadow-blue-500/30"
                    : "text-white/60 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`text-lg transition-transform ${
                    isActive ? "scale-110" : "scale-95 opacity-80"
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default MobileNavigation
