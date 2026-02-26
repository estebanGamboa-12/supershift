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
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-3 sm:px-4 lg:inset-x-auto lg:bottom-6 lg:left-6 lg:px-0">
      <div className="mx-auto w-full max-w-7xl lg:mx-0 lg:w-72">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(8,12,24,0.72)] shadow-[0_18px_55px_rgba(8,12,24,0.75)] backdrop-blur-xl supports-[backdrop-filter:blur(0px)]:bg-[rgba(8,12,24,0.9)]">
          <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(249,115,22,0.35),transparent_55%),_radial-gradient(circle_at_90%_120%,rgba(59,130,246,0.22),transparent_60%)]" />
          </div>

          <div className="relative flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
                Créditos
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {creditBalance !== null ? `${creditBalance}` : "—"}
              </p>
            </div>

            <Link
              href={upgradeHref}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-[0.98] touch-manipulation"
            >
              Upgrade plan
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreditsBottomBar

