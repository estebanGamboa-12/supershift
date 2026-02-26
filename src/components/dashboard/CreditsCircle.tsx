"use client"

import Link from "next/link"
import type { FC } from "react"

const DEFAULT_CAP = 100

/** Formatea número para caber en el círculo: 10000 -> "10k" */
function formatCredits(value: number): string {
  if (value >= 1_000_000) return `${Math.floor(value / 1_000_000)}M`
  if (value >= 1_000) return `${Math.floor(value / 1_000)}k`
  return String(value)
}

type CreditsCircleProps = {
  creditBalance: number | null
  /** Máximo de créditos (ej. plan). Si no se pasa, se usa max(balance, 100) */
  creditMax?: number | null
  href?: string
  size?: "sm" | "md"
  className?: string
  /** En la barra inferior: al pasar el ratón muestra X/max y barra */
  showHoverTooltip?: boolean
}

const CreditsCircle: FC<CreditsCircleProps> = ({
  creditBalance,
  creditMax: creditMaxProp,
  href = "/pricing",
  size = "md",
  className = "",
  showHoverTooltip = false,
}) => {
  const balance = creditBalance ?? 0
  const maxCredits = creditMaxProp ?? Math.max(balance, DEFAULT_CAP)
  const safeMax = maxCredits <= 0 ? DEFAULT_CAP : maxCredits
  const percent = balance > 0 ? Math.min(100, (balance / safeMax) * 100) : 0
  const label = creditBalance !== null ? `${balance}/${safeMax}` : `—/${safeMax}`
  const isEmpty = balance <= 0

  const sizeClasses = size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"
  const strokeWidth = size === "sm" ? 2.5 : 3
  const r = 18

  const strokeClass = isEmpty
    ? "text-white/20"
    : "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"

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
          className={`${strokeClass} transition-[stroke-dashoffset,color,filter] duration-300`}
        />
      </svg>
      <span className="relative z-10 font-bold tabular-nums text-white drop-shadow-sm">
        {creditBalance !== null ? formatCredits(balance) : "—"}
      </span>
      {showHoverTooltip && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/20 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100"
          role="tooltip"
        >
          <span className="block tabular-nums">{label}</span>
          <span className="mt-1.5 block h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
            <span
              className="block h-full rounded-full bg-sky-400 transition-[width]"
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
