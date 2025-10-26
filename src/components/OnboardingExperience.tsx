"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

import CustomCycleBuilder, {
  DEFAULT_QUESTIONNAIRE,
  type CalendarGeneratedPayload,
  type QuestionnaireState,
} from "@/components/CustomCycleBuilder"
import {
  loadStoredPreferences,
  saveStoredPreferences,
  type StoredPreferencesRecord,
} from "@/lib/preferences-storage"

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

type OnboardingExperienceProps = {
  calendarId?: number
  userId?: string
  defaultTable?: "rotation_templates" | "user_patterns"
  initialRepetitions?: number
}

export default function OnboardingExperience({
  calendarId,
  userId,
  defaultTable,
  initialRepetitions,
}: OnboardingExperienceProps) {
  const router = useRouter()
  const [storedPreferences, setStoredPreferences] = useState<StoredPreferencesRecord | null>(null)
  const [initialQuestionnaire, setInitialQuestionnaire] = useState<QuestionnaireState | undefined>(
    undefined,
  )

  const handleCalendarGenerated = useCallback(
    ({ calendarId: resultingCalendarId }: CalendarGeneratedPayload) => {
      const params = new URLSearchParams()

      const calendarToUse = resultingCalendarId ?? calendarId
      if (calendarToUse) {
        params.set("calendarId", String(calendarToUse))
      }

      if (userId) {
        params.set("userId", userId)
      }

      const query = params.toString()

      router.push(`/${query ? `?${query}` : ""}`)
    },
    [calendarId, router, userId],
  )

  useEffect(() => {
    const stored = loadStoredPreferences()
    if (stored) {
      setStoredPreferences(stored)
      setInitialQuestionnaire(stored.questionnaire)
    } else {
      setInitialQuestionnaire(DEFAULT_QUESTIONNAIRE)
    }
  }, [])

  const introSubtitle = useMemo(() => {
    if (!storedPreferences) {
      return "Responde a unas preguntas rápidas para que Supershift pueda recomendarte un ciclo que encaje con tu estilo de trabajo desde el primer día."
    }

    return "Puedes actualizar tus respuestas cuando quieras. Si tus objetivos cambiaron, vuelve a completar el cuestionario y ajustaremos el patrón sugerido."
  }, [storedPreferences])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-10"
    >
      <header className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-white shadow-xl shadow-black/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bienvenido a tu calendario inteligente
            </h1>
            <p className="max-w-3xl text-sm text-white/70">{introSubtitle}</p>
          </div>
          {storedPreferences && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">
              Última personalización: {new Date(storedPreferences.completedAt).toLocaleString()}
            </div>
          )}
        </div>
        <p className="text-xs text-white/40">
          Después de completar el cuestionario podrás ajustar cada día del ciclo y guardar el resultado en Supabase.
          Si más tarde quieres modificar tus respuestas, abre la sección de preferencias en tu perfil.
        </p>
      </header>

      {initialQuestionnaire && (
        <CustomCycleBuilder
          calendarId={calendarId}
          userId={userId}
          defaultTable={defaultTable}
          initialRepetitions={initialRepetitions}
          initialQuestionnaire={initialQuestionnaire}
          onQuestionnaireComplete={({ snapshot, state }) => {
            const record: StoredPreferencesRecord = {
              completedAt: new Date().toISOString(),
              snapshot,
              questionnaire: state,
            }
            saveStoredPreferences(record)
            setStoredPreferences(record)
          }}
          onCalendarGenerated={handleCalendarGenerated}
        />
      )}

      <footer className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-white/60">
        <p>
          ¿Ya guardaste un ciclo y quieres modificarlo más adelante? Dirígete a tu{" "}
          <Link href="/profile" className="font-semibold text-sky-200 hover:text-sky-100">
            perfil
          </Link>
          {" "}para repetir el cuestionario o abrir el constructor con tus respuestas guardadas.
        </p>
      </footer>
    </motion.div>
  )
}
