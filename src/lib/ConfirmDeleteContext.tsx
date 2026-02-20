"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2 } from "lucide-react"

type ConfirmDeleteOptions = {
  /** Nombre del elemento a eliminar (ej. "la plantilla Trabajo", "este turno") */
  itemName: string
  /** Se llama solo si el usuario confirma. Debe ser async si la eliminación es async. */
  onConfirm: () => void | Promise<void>
}

type ContextValue = {
  confirmDelete: (options: ConfirmDeleteOptions) => void
}

const ConfirmDeleteContext = createContext<ContextValue | null>(null)

export function useConfirmDelete() {
  const ctx = useContext(ConfirmDeleteContext)
  if (!ctx) {
    throw new Error("useConfirmDelete debe usarse dentro de ConfirmDeleteProvider")
  }
  return ctx
}

/** Opcional: usar donde no haya provider (ej. páginas que no están bajo layout con provider) */
export function useConfirmDeleteOptional(): ContextValue | null {
  return useContext(ConfirmDeleteContext)
}

type State = ConfirmDeleteOptions | null

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null)

  const confirmDelete = useCallback((options: ConfirmDeleteOptions) => {
    setState(options)
  }, [])

  const handleClose = useCallback(() => {
    setState(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!state) return
    try {
      await Promise.resolve(state.onConfirm())
    } finally {
      setState(null)
    }
  }, [state])

  const value: ContextValue = { confirmDelete }

  return (
    <ConfirmDeleteContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {state ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-delete-title"
                aria-describedby="confirm-delete-desc"
              >
                <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={handleClose}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-red-400/30 bg-slate-900 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                      <Trash2 className="h-6 w-6 text-red-300" aria-hidden />
                    </div>
                    <h2
                      id="confirm-delete-title"
                      className="text-lg font-semibold text-white"
                    >
                      ¿Eliminar {state.itemName}?
                    </h2>
                    <p
                      id="confirm-delete-desc"
                      className="mt-2 text-sm text-slate-300"
                    >
                      ¿Estás seguro? Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <div className="flex gap-3 border-t border-white/10 p-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 rounded-xl border border-white/20 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="flex-1 rounded-xl border border-red-400/50 bg-red-500/20 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </ConfirmDeleteContext.Provider>
  )
}
