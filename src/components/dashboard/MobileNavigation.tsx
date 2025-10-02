"use client"

import type { FC } from "react"

const NAV_ITEMS = [
  { value: "calendar", label: "Calendario", icon: "📅" },
  { value: "stats", label: "Estadísticas", icon: "📊" },
  { value: "team", label: "Equipo", icon: "👥" },
  { value: "settings", label: "Configuración", icon: "⚙️" },
] as const

export type MobileTab = (typeof NAV_ITEMS)[number]["value"]

type MobileNavigationProps = {
  active: MobileTab
  onChange: (tab: MobileTab) => void
}

const MobileNavigation: FC<MobileNavigationProps> = ({ active, onChange }) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 pb-[calc(env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.value === active
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? "bg-blue-500/20 text-blue-100 shadow-inner shadow-blue-500/30"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNavigation
