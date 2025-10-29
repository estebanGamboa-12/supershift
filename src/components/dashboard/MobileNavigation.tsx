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
    <nav className="sticky bottom-0 z-40 border-t border-white/10 bg-slate-950/70 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-[10px] shadow-[0_-18px_48px_rgba(15,23,42,0.65)] supports-[backdrop-filter:blur(0px)]:bg-slate-950/60 lg:hidden">
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
                    ? "bg-gradient-to-br from-sky-500/35 via-blue-600/35 to-indigo-500/35 text-white shadow-inner shadow-sky-500/35"
                    : "text-white/70 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative flex items-center justify-center" aria-hidden>
                  <span
                    className={`text-lg transition-transform ${
                      isActive ? "scale-110 drop-shadow-[0_0_12px_rgba(56,189,248,0.65)]" : "scale-95 opacity-80"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isActive && (
                    <span className="pointer-events-none absolute -bottom-2 h-1.5 w-8 rounded-full bg-sky-400/70 blur-[1.5px]" />
                  )}
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
