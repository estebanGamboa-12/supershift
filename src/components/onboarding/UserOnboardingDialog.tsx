"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import {
  DEFAULT_QUESTIONNAIRE,
  PreferenceQuestionnaire,
  type QuestionnaireState,
} from "@/components/CustomCycleBuilder"
import type { UserSummary } from "@/types/users"

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const dialogVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
}

type UserOnboardingDialogProps = {
  isOpen: boolean
  user: UserSummary | null
  onSubmit: (preferences: QuestionnaireState) => Promise<void>
  onDismiss?: () => void
  initialState?: QuestionnaireState | null
}

export default function UserOnboardingDialog({
  isOpen,
  user,
  onSubmit,
  onDismiss,
  initialState,
}: UserOnboardingDialogProps) {
  const [preferences, setPreferences] = useState<QuestionnaireState>(
    initialState ?? DEFAULT_QUESTIONNAIRE,
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setPreferences(initialState ?? DEFAULT_QUESTIONNAIRE)
    setError(null)
  }, [initialState, isOpen])

  const greetingName = useMemo(() => {
    if (!user) {
      return ""
    }

    const trimmed = user.name.trim()
    if (!trimmed) {
      return user.email.split("@")[0] ?? ""
    }

    const [firstWord] = trimmed.split(" ")
    return firstWord ?? trimmed
  }, [user])

  const handleSubmit = async () => {
    if (!user || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({ ...preferences })
    } catch (submissionError) {
      console.error("No se pudo completar el onboarding", submissionError)
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo generar tu calendario. Inténtalo de nuevo.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && user ? (
        <motion.div
          key="onboarding-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            key="onboarding-dialog"
            className="relative w-full max-w-4xl px-4 py-10"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Cerrar diálogo de bienvenida"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}

            <PreferenceQuestionnaire
              value={preferences}
              onChange={setPreferences}
              onComplete={handleSubmit}
              onCancel={onDismiss}
              cancelLabel="Cerrar"
              isSubmitting={isSubmitting}
              title={`Hola${greetingName ? ` ${greetingName}` : ""}, personalicemos tus turnos`}
              subtitle="Responde a estas preguntas para que generemos automáticamente un calendario alineado a tus preferencias de trabajo y descanso. Puedes ajustarlo más adelante desde tu perfil."
              ctaLabel={
                isSubmitting
                  ? "Generando tu calendario..."
                  : "Crear mi calendario personalizado"
              }
              footnote="Guardaremos estas respuestas para sugerirte patrones futuros y podrás repetir el cuestionario cuando cambien tus necesidades."
            />

            <AnimatePresence>
              {error ? (
                <motion.div
                  key="onboarding-error"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
