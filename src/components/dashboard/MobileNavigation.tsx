"use client"

import type { FC } from "react"

const NAV_ITEMS = [
  {
    type: "tab",
    value: "calendar",
    tab: "calendar",
    label: "Calendario",
    icon: "📅",
  },
  {
    type: "tab",
    value: "insights",
    tab: "insights",
    label: "Resumen",
    icon: "📈",
  },
  { type: "tab", value: "team", tab: "team", label: "Equipo", icon: "👥" },
  {
    type: "tab",
    value: "settings",
    tab: "settings",
    label: "Configuración",
    icon: "⚙️",
  },
  {
    type: "link",
    value: "templates",
    href: "/templates",
    label: "Plantillas",
    icon: "🧩",
  },
] as const

type NavItem = (typeof NAV_ITEMS)[number]

export type MobileTab = Extract<NavItem, { type: "tab" }>["tab"]

type MobileNavigationProps = {
  active: MobileTab
  onChange: (tab: MobileTab) => void
  onNavigateLink?: (href: string) => void
}

const MobileNavigation: FC<MobileNavigationProps> = ({
  active,
  onChange,
  onNavigateLink,
}) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-white/10 bg-[rgba(8,12,24,0.78)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl shadow-[0_-22px_55px_rgba(8,12,24,0.85)] supports-[backdrop-filter:blur(0px)]:bg-[rgba(8,12,24,0.92)] lg:hidden">
      <div className="relative mx-auto w-full max-w-3xl px-2">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(59,130,246,0.28),transparent_55%),_radial-gradient(circle_at_80%_120%,rgba(139,92,246,0.25),transparent_60%)]" />
        </div>
        <div className="relative">
          <div className="grid grid-cols-5 gap-1.5 py-1">
            {NAV_ITEMS.map((item) => {
              const isTab = item.type === "tab"
              const isActive = isTab && item.tab === active
              const handleClick = () => {
                if (isTab) {
                  onChange(item.tab)
                  return
                }

                if (item.type === "link") {
                  if (onNavigateLink) {
                    onNavigateLink(item.href)
                  } else if (typeof window !== "undefined") {
                    window.location.assign(item.href)
                  }
                }
              }

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={handleClick}
                  className={`group relative flex w-full flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                    isActive
                      ? "bg-gradient-to-br from-sky-500/25 via-blue-600/25 to-indigo-500/30 text-white shadow-[0_8px_25px_-12px_rgba(56,189,248,0.75)]"
                      : item.type === "link"
                        ? "border border-sky-400/40 bg-sky-500/10 text-sky-100 shadow-[0_6px_20px_-12px_rgba(56,189,248,0.55)] hover:bg-sky-500/15 hover:text-sky-50"
                        : "text-white/70 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="relative flex items-center justify-center" aria-hidden>
                    <span
                      className={`text-base transition-transform ${
                        isActive
                          ? "scale-105 drop-shadow-[0_0_12px_rgba(59,130,246,0.75)]"
                          : "scale-95 opacity-80"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {isActive && (
                      <>
                        <span className="pointer-events-none absolute -bottom-1 h-0.5 w-8 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                        <span className="pointer-events-none absolute -bottom-2 h-3 w-12 rounded-full bg-sky-500/25 blur-md" />
                      </>
                    )}
                  </span>
                  <span className="leading-tight">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MobileNavigation
