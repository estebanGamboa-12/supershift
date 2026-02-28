"use client"

import type { FC, ReactNode } from "react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

export type ScreenInfoIconProps = {
  /** Título del popover (ej. "Esta pantalla") */
  title: string
  /** Contenido: texto o lista de puntos que explica la pantalla */
  children: ReactNode
  /** Clase opcional para el contenedor del icono */
  className?: string
  /** Posición del popover respecto al icono */
  placement?: "bottom" | "top" | "left" | "right"
  /** Si se pasa, dentro del popover se muestra un botón "Ver tutorial" que ejecuta el onboarding */
  onLaunchTour?: () => void
}

/**
 * Icono de información (ℹ️) que al hacer clic muestra un popover
 * y se cierra al tocar fuera o con Escape. El popover se renderiza en portal para no quedar cortado.
 */
const ScreenInfoIcon: FC<ScreenInfoIconProps> = ({
  title,
  children,
  className = "",
  placement = "bottom",
  onLaunchTour,
}) => {
  const [open, setOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !containerRef.current || typeof document === "undefined") return
    const rect = containerRef.current.getBoundingClientRect()
    const gap = 8
    const popoverMaxWidth = 340
    const padding = 12
    const maxLeft = window.innerWidth - popoverMaxWidth - padding
    let top: number | undefined
    let bottom: number | undefined
    let left = 0
    if (placement === "right") {
      left = Math.max(padding, Math.min(rect.right + gap, maxLeft))
      top = rect.top
    } else if (placement === "left") {
      left = Math.max(padding, rect.left - popoverMaxWidth - gap)
      top = rect.top
    } else if (placement === "bottom") {
      left = Math.max(padding, Math.min(rect.left + rect.width / 2 - popoverMaxWidth / 2, maxLeft))
      top = rect.bottom + gap
    } else {
      left = Math.max(padding, Math.min(rect.left + rect.width / 2 - popoverMaxWidth / 2, maxLeft))
      bottom = Math.max(padding, window.innerHeight - rect.top + gap)
    }
    setPopoverStyle({
      position: "fixed",
      left,
      ...(top !== undefined ? { top } : { bottom: bottom ?? padding }),
      zIndex: 99999,
      minWidth: 240,
      maxWidth: popoverMaxWidth,
    })
  }, [open, placement])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const popoverContent = open && typeof document !== "undefined" && (
    createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={title}
        style={popoverStyle}
        className="rounded-2xl border-2 border-amber-400/30 bg-slate-900 px-4 py-3.5 text-left shadow-2xl shadow-black/50 backdrop-blur-md"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{title}</p>
        <div className="mt-2 text-sm text-white/95 leading-relaxed [&_ul]:mt-1.5 [&_ul]:space-y-0.5 [&_strong]:text-amber-200/90">{children}</div>
        {onLaunchTour ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLaunchTour()
            }}
            className="mt-3.5 w-full rounded-xl border-2 border-sky-400/50 bg-sky-500/30 px-3 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Ver tutorial
          </button>
        ) : null}
      </div>,
      document.body,
    )
  )

  return (
    <>
      <div
        ref={containerRef}
        className={`relative inline-flex ${className}`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          aria-label="Información de esta pantalla"
          aria-expanded={open}
        >
          <Info size={16} strokeWidth={2.5} />
        </button>
      </div>
      {popoverContent}
    </>
  )
}

export default ScreenInfoIcon
