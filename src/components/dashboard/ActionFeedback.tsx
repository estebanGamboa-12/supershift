"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Save, Trash2, WifiOff } from "lucide-react"

type FeedbackType = "create" | "update" | "delete"

type ActionFeedbackState = {
  type: FeedbackType
  message: string
  offline?: boolean
}

type ActionFeedbackProps = {
  feedback: ActionFeedbackState | null
  onDismiss: () => void
}

const iconByType: Record<FeedbackType, typeof CheckCircle2> = {
  create: CheckCircle2,
  update: Save,
  delete: Trash2,
}

export default function ActionFeedback({ feedback, onDismiss }: ActionFeedbackProps) {
  useEffect(() => {
    if (!feedback) return undefined

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [feedback, onDismiss])

  return (
    <AnimatePresence>
      {feedback ? (
        <motion.div
          key={`${feedback.type}-${feedback.message}`}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          className="pointer-events-auto fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
        >
          <motion.div
            layout
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-sky-400/30 bg-slate-950/90 p-4 text-white shadow-2xl shadow-sky-500/25 backdrop-blur"
          >
            <div className="absolute inset-0 opacity-80" aria-hidden>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-500/20 via-blue-600/20 to-indigo-500/20" />
            </div>
            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/20">
                {(() => {
                  const Icon = iconByType[feedback.type]
                  return <Icon className="h-5 w-5 text-sky-200" aria-hidden />
                })()}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-white">{feedback.message}</p>
                {feedback.offline ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-100/80">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden />
                    Cambios pendientes de sincronizar.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-white/70">Acción aplicada correctamente.</p>
                )}
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Cerrar notificación"
                className="rounded-full bg-white/5 p-1.5 text-xs font-medium uppercase tracking-wide text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
              >
                Cerrar
              </button>
            </div>
            <motion.span
              layoutId={`progress-${feedback.type}`}
              className="mt-4 block h-1 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export type { ActionFeedbackState }
