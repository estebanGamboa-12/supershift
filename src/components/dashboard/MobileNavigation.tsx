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
    <nav className="relative sticky bottom-0 z-40 overflow-hidden border-t border-white/10 bg-[rgba(8,12,24,0.78)] pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl shadow-[0_-22px_55px_rgba(8,12,24,0.85)] supports-[backdrop-filter:blur(0px)]:bg-[rgba(8,12,24,0.92)] lg:hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(59,130,246,0.28),transparent_55%),_radial-gradient(circle_at_80%_120%,rgba(139,92,246,0.25),transparent_60%)]" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4">
        <div className="grid grid-cols-4 gap-2.5 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.tab === active
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.tab)}
                className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                  isActive
                    ? "bg-gradient-to-br from-sky-500/25 via-blue-600/25 to-indigo-500/30 text-white shadow-[0_14px_45px_-20px_rgba(56,189,248,0.75)]"
                    : "text-white/70 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative flex items-center justify-center" aria-hidden>
                  <span
                    className={`text-lg transition-transform ${
                      isActive
                        ? "scale-110 drop-shadow-[0_0_18px_rgba(59,130,246,0.75)]"
                        : "scale-95 opacity-80"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isActive && (
                    <>
                      <span className="pointer-events-none absolute -bottom-1.5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                      <span className="pointer-events-none absolute -bottom-3 h-5 w-16 rounded-full bg-sky-500/25 blur-lg" />
                    </>
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
