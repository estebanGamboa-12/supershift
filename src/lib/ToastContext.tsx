"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Save, Trash2 } from "lucide-react"

export type ToastType = "create" | "update" | "delete"

type ToastState = {
  id: number
  type: ToastType
  message: string
  offline?: boolean
}

const defaultMessages: Record<ToastType, string> = {
  create: "Se ha creado correctamente",
  update: "Se ha modificado correctamente",
  delete: "Se ha eliminado correctamente",
}

const iconByType: Record<ToastType, typeof CheckCircle2> = {
  create: CheckCircle2,
  update: Save,
  delete: Trash2,
}

type ShowOptions = {
  type: ToastType
  message?: string
  offline?: boolean
}

type ContextValue = {
  showToast: (options: ShowOptions) => void
}

const ToastContext = createContext<ContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return ctx
}

export function useToastOptional(): ContextValue | null {
  return useContext(ToastContext)
}

const TOAST_DURATION_MS = 3400
const TOAST_OFFLINE_DURATION_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const showToast = useCallback((options: ShowOptions) => {
    const { type, message, offline } = options
    const id = ++idRef.current

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setToast({
      id,
      type,
      message: message ?? defaultMessages[type],
      offline,
    })

    const duration = offline ? TOAST_OFFLINE_DURATION_MS : TOAST_DURATION_MS
    timeoutRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev))
      timeoutRef.current = null
    }, duration)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const value: ContextValue = { showToast }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {toast ? (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-4"
              >
                <div className="w-full max-w-md rounded-2xl border border-sky-400/30 bg-slate-950/95 p-4 text-white shadow-2xl shadow-sky-500/20 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
                      {(() => {
                        const Icon = iconByType[toast.type]
                        return <Icon className="h-5 w-5 text-sky-200" aria-hidden />
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{toast.message}</p>
                      {toast.offline ? (
                        <p className="mt-0.5 text-xs text-sky-200/80">
                          Pendiente de sincronizar
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-white/70">
                          Acción aplicada correctamente
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}
