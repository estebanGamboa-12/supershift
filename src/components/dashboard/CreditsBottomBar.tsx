"use client"

import Link from "next/link"
import type { FC } from "react"

type CreditsBottomBarProps = {
  creditBalance: number | null
  upgradeHref?: string
}

const CreditsBottomBar: FC<CreditsBottomBarProps> = ({
  creditBalance,
  upgradeHref = "/landing/pricing",
}) => {
  return (
    <div className="fixed right-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 left-auto w-auto max-w-[120px] sm:right-4 sm:max-w-[200px] lg:bottom-6 lg:right-6 lg:max-w-[220px]">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,12,24,0.72)] shadow-[0_18px_55px_rgba(8,12,24,0.75)] backdrop-blur-xl supports-[backdrop-filter:blur(0px)]:bg-[rgba(8,12,24,0.9)] sm:rounded-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(59,130,246,0.35),transparent_55%),_radial-gradient(circle_at_90%_120%,rgba(59,130,246,0.22),transparent_60%)]" />
        </div>

        <div className="relative flex flex-row items-center justify-between gap-1.5 px-2 py-1.5 sm:flex-col sm:items-stretch sm:gap-2 sm:px-3 sm:py-2.5">
          <div className="min-w-0">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-white/50 sm:text-[10px] sm:tracking-[0.2em]">
              Créditos
            </p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-white sm:mt-0.5 sm:text-sm">
              {creditBalance !== null ? `${creditBalance}` : "—"}
            </p>
          </div>

          <Link
            href={upgradeHref}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-sky-500 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-md shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.98] touch-manipulation sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-[10px] lg:text-xs"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CreditsBottomBar

