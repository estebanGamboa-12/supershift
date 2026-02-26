"use client"

import Link from "next/link"
import type { FC } from "react"

const MAX_CREDITS = 100

type CreditsCircleProps = {
  creditBalance: number | null
  href?: string
  size?: "sm" | "md"
  className?: string
}

const CreditsCircle: FC<CreditsCircleProps> = ({
  creditBalance,
  href = "/pricing",
  size = "md",
  className = "",
}) => {
  const balance = creditBalance ?? 0
  const percent = Math.min(100, Math.max(0, (balance / MAX_CREDITS) * 100))

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
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        title="Créditos. Pulsa para ver planes y comprar más."
        className="inline-flex rounded-full outline-none ring-white/20 focus-visible:ring-2"
      >
        {content}
      </Link>
    )
  }

  return content
}

export default CreditsCircle
