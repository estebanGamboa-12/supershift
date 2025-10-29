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
    <nav className="surface-card sticky top-4 z-20 hidden overflow-x-auto p-2 shadow-brand-soft lg:block">
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
                    ? "bg-gradient-to-r from-brand-accent/40 via-brand-primary/40 to-brand-primary/50 text-brand-text shadow-[0_12px_40px_-18px_rgba(96,165,250,0.55)]"
                    : "text-brand-muted hover:text-brand-text hover:bg-white/10"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                {item.description && (
                  <span className="text-[11px] text-brand-muted">{item.description}</span>
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
