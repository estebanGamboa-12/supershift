"use client"

import type { FC } from "react"

export type NavItem = {
  id: string
  label: string
  description?: string
}

type ResponsiveNavProps = {
  items: NavItem[]
  activeId: string
  onNavigate: (id: string) => void
}

const ResponsiveNav: FC<ResponsiveNavProps> = ({ items, activeId, onNavigate }) => {
  return (
    <nav className="surface-card sticky top-4 z-20 hidden overflow-x-auto rounded-xl p-1.5 shadow-brand-soft lg:block lg:rounded-xl lg:p-2" aria-label="Secciones del panel">
      <ul className="flex gap-1.5 lg:gap-2">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition lg:rounded-lg lg:px-4 lg:py-2 ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500/30 via-sky-500/25 to-indigo-500/25 text-white shadow-[0_12px_40px_-18px_rgba(96,165,250,0.5)] ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                {item.description && (
                  <span className="text-[11px] text-slate-500 lg:text-xs">{item.description}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default ResponsiveNav
