"use client"

import type { FC, ReactNode } from "react"
import { useState, useRef, useEffect } from "react"
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
}

/**
 * Icono de información (ℹ️) que al hacer clic o pasar el ratón muestra un popover
 * explicando qué hay en la pantalla. Pensado para cada sección (plantillas, calendario, etc.).
 */
const ScreenInfoIcon: FC<ScreenInfoIconProps> = ({
  title,
  children,
  className = "",
  placement = "bottom",
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const placementClasses = {
    bottom: "left-1/2 -translate-x-1/2 top-full mt-2",
    top: "left-1/2 -translate-x-1/2 bottom-full mb-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
      {open && (
        <div
          role="dialog"
          aria-label={title}
          className={`absolute z-50 min-w-[220px] max-w-[320px] rounded-xl border border-white/20 bg-slate-900/95 px-4 py-3 text-left shadow-xl backdrop-blur-sm ${placementClasses[placement]}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">{title}</p>
          <div className="mt-1.5 text-sm text-white/90 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  )
}

export default ScreenInfoIcon
