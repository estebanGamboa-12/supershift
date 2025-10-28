"use client"

import type { FC } from "react"

const NAV_ITEMS = [
  { value: "calendar", tab: "calendar", label: "Calendario", icon: "📅" },
  { value: "insights", tab: "insights", label: "Resumen", icon: "📈" },
  { value: "team", tab: "team", label: "Equipo", icon: "👥" },
  { value: "settings", tab: "settings", label: "Configuración", icon: "⚙️" },
] as const

export type MobileTab = (typeof NAV_ITEMS)[number]["tab"]

type MobileNavigationProps = {
  active: MobileTab
  onChange: (tab: MobileTab) => void
}

const MobileNavigation: FC<MobileNavigationProps> = ({ active, onChange }) => {
  return (
    <nav className="sticky bottom-0 z-40 border-t border-white/5 bg-slate-950/90 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-lg lg:hidden">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="grid grid-cols-4 gap-2.5 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.tab === active
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.tab)}
                className={`flex w-full flex-col items-center gap-1 rounded-2xl px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                  isActive
                    ? "bg-gradient-to-br from-sky-500/45 via-blue-600/45 to-indigo-500/45 text-white shadow-inner shadow-sky-500/35"
                    : "text-white/65 hover:text-white"
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
