"use client"

import Link from "next/link"
import type { FC } from "react"

const MAX_CREDITS = 100

type CreditsCircleProps = {
  creditBalance: number | null
  href?: string
  size?: "sm" | "md"
  className?: string
  /** En la barra inferior: al pasar el ratón muestra X/100 y barra */
  showHoverTooltip?: boolean
}

const CreditsCircle: FC<CreditsCircleProps> = ({
  creditBalance,
  href = "/pricing",
  size = "md",
  className = "",
  showHoverTooltip = false,
}) => {
  const balance = creditBalance ?? 0
  const percent = Math.min(100, Math.max(0, (balance / MAX_CREDITS) * 100))
  const label = creditBalance !== null ? `${balance}/${MAX_CREDITS}` : "—/100"

  const sizeClasses = size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"
  const strokeWidth = size === "sm" ? 2.5 : 3
  const r = 18

  const content = (
    <span className={`relative inline-flex items-center justify-center ${sizeClasses} ${className}`}>
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 40 40"
        aria-hidden
      >
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/15"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${2 * Math.PI * r}`}
          strokeDashoffset={2 * Math.PI * r - (percent / 100) * 2 * Math.PI * r}
          strokeLinecap="round"
          className="text-orange-400 transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="relative z-10 font-bold tabular-nums text-white drop-shadow-sm">
        {creditBalance !== null ? balance : "—"}
      </span>
      {showHoverTooltip && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/20 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100"
          role="tooltip"
        >
          <span className="block tabular-nums">{label}</span>
          <span className="mt-1.5 block h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
            <span
              className="block h-full rounded-full bg-orange-400"
              style={{ width: `${percent}%` }}
            />
          </span>
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        title={showHoverTooltip ? label : "Créditos. Pulsa para ver planes."}
        className={`inline-flex rounded-full outline-none ring-white/20 focus-visible:ring-2 ${showHoverTooltip ? "group" : ""}`}
      >
        {content}
      </Link>
    )
  }

  return content
}

export default CreditsCircle
