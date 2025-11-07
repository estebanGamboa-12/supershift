"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { format } from "date-fns"

import CustomCycleBuilder, {
  DEFAULT_QUESTIONNAIRE,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  NIGHT_PREFERENCE_DESCRIPTIONS,
  PreferenceQuestionnaire,
  type QuestionnaireState,
  createPreferencesSnapshot,
} from "@/components/CustomCycleBuilder"
import {
  clearStoredPreferences,
  loadStoredPreferences,
  saveStoredPreferences,
  type StoredPreferencesRecord,
} from "@/lib/preferences-storage"

type ProfileSchedulingPreferencesCardProps = {
  calendarId?: number
  userId?: string
  defaultTable?: "rotation_templates" | "user_patterns"
  initialRepetitions?: number
}

type Mode = "summary" | "editing" | "builder"

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function ProfileSchedulingPreferencesCard({
  calendarId,
  userId,
  defaultTable = "rotation_templates",
  initialRepetitions,
}: ProfileSchedulingPreferencesCardProps) {
  const [stored, setStored] = useState<StoredPreferencesRecord | null>(null)
  const [formState, setFormState] = useState<QuestionnaireState>(DEFAULT_QUESTIONNAIRE)
  const [mode, setMode] = useState<Mode>("summary")

  useEffect(() => {
    const record = loadStoredPreferences(userId)
    if (record) {
      setStored(record)
      setFormState(record.questionnaire)
    } else {
      setStored(null)
      setFormState(DEFAULT_QUESTIONNAIRE)
    }
  }, [userId])

  const builderUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (calendarId) {
      params.set("calendarId", String(calendarId))
    }
    if (userId) {
      params.set("userId", userId)
    }
    if (defaultTable) {
      params.set("table", defaultTable)
    }
    if (initialRepetitions) {
      params.set("repetitions", String(initialRepetitions))
    }

    const query = params.toString()
    return `/custom-cycle-builder${query ? `?${query}` : ""}`
  }, [calendarId, defaultTable, initialRepetitions, userId])

  const handleSave = () => {
    const snapshot = createPreferencesSnapshot(formState)
    const record: StoredPreferencesRecord = {
      completedAt: new Date().toISOString(),
      snapshot,
      questionnaire: formState,
      userId,
    }
    saveStoredPreferences(record, userId)
    setStored(record)
    setMode("summary")
  }

  const handleCancel = () => {
    setFormState(stored?.questionnaire ?? DEFAULT_QUESTIONNAIRE)
    setMode("summary")
  }

  const handleClear = () => {
    clearStoredPreferences(userId)
    setStored(null)
    setFormState(DEFAULT_QUESTIONNAIRE)
    setMode("summary")
  }

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="surface-card space-y-6 p-6 text-brand-text"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Preferencias de programación</h2>
          <p className="max-w-2xl text-sm text-brand-muted">
            Guarda tus respuestas para generar patrones alineados con tus objetivos. Puedes repetir el cuestionario cuando cambies de equipo o quieras preparar un nuevo ritmo de trabajo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {mode === "summary" && (
            <>
              <button
                type="button"
                onClick={() => setMode("editing")}
                className="accent-action gap-2 px-4 py-2"
              >
                Actualizar respuestas
              </button>
              <Link
                href={builderUrl}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-2 font-semibold text-brand-muted transition hover:border-white/40 hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Abrir constructor
              </Link>
              <button
                type="button"
                onClick={() => setMode("builder")}
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-accent/40 bg-brand-accent/15 px-4 py-2 font-semibold text-brand-text transition hover:bg-brand-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Repetir en línea
              </button>
              {stored && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-transparent px-4 py-2 font-semibold text-brand-muted transition hover:border-white/30 hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Limpiar respuestas
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {mode === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {stored ? (
              <div className="space-y-6">
                <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Prioridad</p>
                    <p className="text-sm font-semibold text-white">
                      {GOAL_LABELS[stored.snapshot.goal]}
                    </p>
                    <p className="text-xs text-white/50">
                      {GOAL_DESCRIPTIONS[stored.snapshot.goal]}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Bloques</p>
                    <p className="text-sm font-semibold text-white">
                      {stored.snapshot.work_block} trabajo · {stored.snapshot.rest_block} descanso
                    </p>
                    <p className="text-xs text-white/50">
                      Preferencia nocturna: {NIGHT_PREFERENCE_DESCRIPTIONS[stored.snapshot.night_preference]}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Extras</p>
                    <p className="text-sm font-semibold text-white">
                      {stored.snapshot.include_vacation_day ? "Incluye vacaciones" : "Sin día de vacaciones"}
                    </p>
                    <p className="text-xs text-white/50">
                      {stored.snapshot.include_personal_focus
                        ? `Día especial: ${stored.snapshot.custom_focus_label ?? "Personal"}`
                        : "Sin bloque personalizado"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Última actualización</p>
                    <p className="text-sm font-semibold text-white">
                      {format(new Date(stored.completedAt), "dd MMM yyyy HH:mm")}
                    </p>
                    {stored.snapshot.notes && (
                      <p className="text-xs text-white/50">Notas: {stored.snapshot.notes}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-white/50">
                  Guarda o exporta un patrón desde el constructor para sincronizar estas preferencias con Supabase.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center text-sm text-white/60">
                Aún no has completado el cuestionario inicial. Empieza ahora para recibir recomendaciones personalizadas.
              </div>
            )}
          </motion.div>
        )}

        {mode === "editing" && (
          <motion.div
            key="editing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <PreferenceQuestionnaire
              value={formState}
              onChange={setFormState}
              onComplete={handleSave}
              onCancel={handleCancel}
              ctaLabel="Guardar preferencias"
              subtitle="Actualiza tus respuestas para mantener tus turnos alineados a tu realidad actual. Tus elecciones sirven como base para cualquier nuevo patrón que generes."
              footnote="Estas preferencias se guardan localmente para acelerar la creación de tus próximos ciclos."
            />
          </motion.div>
        )}

        {mode === "builder" && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            <CustomCycleBuilder
              calendarId={calendarId}
              userId={userId}
              defaultTable={defaultTable}
              initialRepetitions={initialRepetitions}
              initialQuestionnaire={stored?.questionnaire ?? DEFAULT_QUESTIONNAIRE}
              showQuestionnaireOnMount
              onQuestionnaireComplete={({ snapshot, state }) => {
                const record: StoredPreferencesRecord = {
                  completedAt: new Date().toISOString(),
                  snapshot,
                  questionnaire: state,
                }
                saveStoredPreferences(record, userId)
                setStored(record)
                setFormState(state)
              }}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode("summary")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Cerrar vista integrada
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
