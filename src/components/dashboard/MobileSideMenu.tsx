"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import type { FC } from "react"

type MobileSideMenuProps = {
  open: boolean
  onClose: () => void
  userName: string
  userEmail: string
  onLogout: () => void
}

const MobileSideMenu: FC<MobileSideMenuProps> = ({
  open,
  onClose,
  userName,
  userEmail,
  onLogout,
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Side Menu */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-[85vw] max-w-sm overflow-y-auto bg-slate-950/98 backdrop-blur-xl shadow-2xl lg:hidden"
            aria-label="Menú lateral"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-0 -translate-y-1 scale-110 rounded-full bg-cyan-400/20 blur" aria-hidden />
                    <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 shadow-lg shadow-sky-500/30">
                      <Image src="/planloop-logo.svg" alt="Logotipo de Planloop" width={36} height={36} className="h-9 w-9" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{userName}</p>
                    <p className="text-xs text-white/60">{userEmail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95 touch-manipulation"
                  aria-label="Cerrar menú"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-4">
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/templates"
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-sky-400/50 hover:bg-sky-500/15 hover:text-white active:scale-[0.98] touch-manipulation"
                    >
                      <span className="text-lg" aria-hidden>🧩</span>
                      <span>Plantillas</span>
                    </Link>
                  </li>
                  
                  <li className="pt-2">
                    <div className="border-t border-white/10" />
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout()
                        onClose()
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-red-500/50 bg-red-500/20 px-4 py-3.5 text-base font-bold text-red-200 transition hover:border-red-400 hover:bg-red-500/30 hover:text-red-100 active:scale-[0.98] touch-manipulation shadow-lg shadow-red-500/20"
                    >
                      <span className="text-xl" aria-hidden>🚪</span>
                      <span>Cerrar sesión</span>
                    </button>
                  </li>
                </ul>
              </nav>

              {/* Footer */}
              <div className="border-t border-white/10 p-4">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-emerald-200/80">
                    Planloop Ops
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileSideMenu
