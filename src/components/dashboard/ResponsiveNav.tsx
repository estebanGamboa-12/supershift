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
    <nav className="sticky top-4 z-20 hidden overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/80 p-2 shadow-[0_20px_60px_-30px_rgba(59,130,246,0.5)] backdrop-blur lg:block">
      <ul className="flex gap-2">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col gap-1 rounded-2xl px-4 py-2 text-left transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/40 to-indigo-500/40 text-white shadow-inner shadow-blue-500/30"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                {item.description && (
                  <span className="text-[11px] text-white/50">{item.description}</span>
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
