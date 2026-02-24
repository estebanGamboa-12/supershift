"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addDays, format } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { ShiftType } from "@/types/shifts"

type DayPattern = {
  type: ShiftType
  label?: string
}

type CustomCycleBuilderProps = {
  calendarId?: number
  /**
   * UUID del usuario autenticado. Se utiliza al guardar en user_patterns
   * o como created_by en rotation_templates.
   */
  userId?: string
  /**
   * Tabla de destino inicial. El usuario podrá modificarla desde la UI.
   */
  defaultTable?: "rotation_templates" | "user_patterns"
  /**
   * Número inicial de repeticiones del patrón al generar turnos en la tabla shifts.
   * Por defecto, el patrón se repite cuatro veces.
   */
  initialRepetitions?: number
  /**
   * Estado inicial del cuestionario, útil para precargar respuestas guardadas.
   */
  initialQuestionnaire?: QuestionnaireState
  /**
   * Controla si el cuestionario debe mostrarse al montar el componente.
   * Útil cuando se quiere reabrir el constructor con un patrón ya definido.
   */
  showQuestionnaireOnMount?: boolean
  /**
   * Se ejecuta cuando el usuario finaliza el cuestionario inicial.
   * Permite integrar acciones de onboarding como marcar la configuración como completada.
   */
  onQuestionnaireComplete?: (payload: {
    snapshot: PreferencesSnapshot
    state: QuestionnaireState
  }) => void
  /**
   * Se ejecuta cuando se generan turnos en el calendario sin errores.
   * Útil para redirigir al usuario a la vista principal del calendario
   * u otras acciones posteriores al guardado.
   */
  onCalendarGenerated?: (payload: CalendarGeneratedPayload) => void
}

type ShiftOption = {
  value: ShiftType
  label: string
  description: string
}

const SHIFT_OPTIONS: ShiftOption[] = [
  {
    value: "WORK",
    label: "Trabajo",
    description: "Día laboral estándar",
  },
  {
    value: "REST",
    label: "Descanso",
    description: "Día libre para recuperar energía",
  },
  {
    value: "NIGHT",
    label: "Noche",
    description: "Turno nocturno completo",
  },
  {
    value: "VACATION",
    label: "Vacaciones",
    description: "Día de vacaciones planificado",
  },
  {
    value: "CUSTOM",
    label: "Personalizado",
    description: "Define un turno o etiqueta específica",
  },
]

const CYCLE_LENGTH_PRESETS = [7, 10, 14, 21, 28, 31]

const CELL_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

const SHIFT_STYLES: Record<ShiftType, string> = {
  WORK: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
  REST: "border-slate-400/40 bg-slate-500/20 text-slate-100",
  NIGHT: "border-indigo-400/40 bg-indigo-500/20 text-indigo-100",
  VACATION: "border-amber-400/40 bg-amber-500/20 text-amber-100",
  CUSTOM: "border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-100",
}

export function createPreferencesSnapshot(
  preferences: QuestionnaireState,
): PreferencesSnapshot {
  return {
    role: preferences.role.trim() || null,
    goal: preferences.goal,
    work_block: Math.max(1, Math.min(14, preferences.workBlock)),
    rest_block: Math.max(1, Math.min(14, preferences.restBlock)),
    night_preference: preferences.nightPreference,
    include_vacation_day: preferences.includeVacationDay,
    include_personal_focus: preferences.includePersonalFocus,
    custom_focus_label: preferences.includePersonalFocus
      ? preferences.customFocusLabel.trim() || null
      : null,
    notes: preferences.notes.trim() || null,
  }
}

export type WorkGoal = "balance" | "rest_first" | "compact_work" | "development"

export type NightPreference = "none" | "occasional" | "rotation"

export type QuestionnaireState = {
  role: string
  goal: WorkGoal
  workBlock: number
  restBlock: number
  nightPreference: NightPreference
  includeVacationDay: boolean
  includePersonalFocus: boolean
  customFocusLabel: string
  startDate: string
  notes: string
}

export type PreferencesSnapshot = {
  role: string | null
  goal: WorkGoal
  work_block: number
  rest_block: number
  night_preference: NightPreference
  include_vacation_day: boolean
  include_personal_focus: boolean
  custom_focus_label: string | null
  notes: string | null
}

type SubmissionPayload = {
  pattern: ShiftType[]
  cycle_length: number
  start_date: string
  custom_labels: (string | null)[]
  preferences_snapshot?: PreferencesSnapshot
}

export type CalendarGeneratedPayload = {
  calendarId?: number
  patternLength: number
  repetitions: number
  startDate: string
}

type UsageScenario = "personal" | "work"

const USAGE_SCENARIO_LABELS: Record<UsageScenario, string> = {
  personal: "Uso personal",
  work: "Para mi trabajo",
}

const USAGE_SCENARIO_DESCRIPTIONS: Record<UsageScenario, string> = {
  personal: "Gestiona tus propios turnos y descansos de forma individual.",
  work: "Planifica tus turnos profesionales sin coordinar a otras personas.",
}

const USAGE_SCENARIO_HEADLINES: Record<UsageScenario, { title: string; subtitle: string }> = {
  personal: {
    title: "Crea una rutina para ti",
    subtitle:
      "Define tus bloques de trabajo, descanso o estudio con total flexibilidad. Podrás ajustar cada día antes de guardarlo.",
  },
  work: {
    title: "Planifica tus turnos profesionales",
    subtitle:
      "Organiza jornadas laborales, descansos y noches según las necesidades de tu puesto. Personaliza la rotación a tu ritmo.",
  },
}

export const GOAL_DESCRIPTIONS: Record<WorkGoal, string> = {
  balance: "Equilibrar carga de trabajo y descansos",
  rest_first: "Priorizar descansos frecuentes",
  compact_work: "Concentrar jornadas laborales seguidas",
  development: "Reservar tiempo para formación o proyectos personales",
}

export const GOAL_LABELS: Record<WorkGoal, string> = {
  balance: "Equilibrio general",
  rest_first: "Más descansos",
  compact_work: "Bloques intensivos",
  development: "Espacio para crecer",
}

export const NIGHT_PREFERENCE_DESCRIPTIONS: Record<NightPreference, string> = {
  none: "Evitar turnos nocturnos",
  occasional: "Agregar noches ocasionales",
  rotation: "Incluir bloques nocturnos regulares",
}

export const DEFAULT_QUESTIONNAIRE: QuestionnaireState = {
  role: "",
  goal: "balance",
  workBlock: 4,
  restBlock: 3,
  nightPreference: "none",
  includeVacationDay: false,
  includePersonalFocus: false,
  customFocusLabel: "",
  startDate: format(new Date(), "yyyy-MM-dd"),
  notes: "",
}

function buildPatternFromPreferences(preferences: QuestionnaireState): DayPattern[] {
  const pattern: DayPattern[] = []

  const normalizedWorkBlock = Math.max(1, Math.min(14, preferences.workBlock))
  const normalizedRestBlock = Math.max(1, Math.min(14, preferences.restBlock))

  for (let index = 0; index < normalizedWorkBlock; index += 1) {
    pattern.push({ type: "WORK" })
  }

  if (preferences.nightPreference === "occasional") {
    pattern.push({ type: "NIGHT" })
  } else if (preferences.nightPreference === "rotation") {
    pattern.push({ type: "NIGHT" }, { type: "NIGHT" })
  }

  for (let index = 0; index < normalizedRestBlock; index += 1) {
    pattern.push({ type: "REST" })
  }

  if (preferences.includeVacationDay) {
    pattern.push({ type: "VACATION" })
  }

  if (preferences.includePersonalFocus) {
    pattern.push({
      type: "CUSTOM",
      label: preferences.customFocusLabel.trim() || "Desarrollo personal",
    })
  }

  if (!pattern.length) {
    return [{ type: "REST" }]
  }

  return pattern
}

async function generateCalendarFromPattern(
  supabase: SupabaseClient,
  pattern: ShiftType[],
  startDate: string,
  calendarId?: number,
  labels?: (string | null | undefined)[],
  repetitions: number = 4,
) {
  if (!calendarId) {
    return
  }

  if (!pattern.length) {
    return
  }

  const baseDate = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("La fecha de inicio no es válida")
  }

  const totalDays = pattern.length * Math.max(1, repetitions)

  const events = Array.from({ length: totalDays }, (_, index) => {
    const currentDate = addDays(baseDate, index)
    const startAt = new Date(currentDate)
    startAt.setHours(0, 0, 0, 0)
    const endAt = addDays(startAt, 1)
    const patternIndex = index % pattern.length

    return {
      calendar_id: calendarId,
      shift_type_code: pattern[patternIndex],
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: true,
      label: labels?.[patternIndex] ?? null,
    }
  })

  const { error } = await supabase.from("shifts").insert(events)

  if (error) {
    throw new Error(
      `No se pudo generar el calendario automáticamente: ${error.message}`,
    )
  }
}

function DayCell({
  dayIndex,
  day,
  onTypeChange,
  onLabelChange,
}: {
  dayIndex: number
  day: DayPattern
  onTypeChange: (type: ShiftType) => void
  onLabelChange: (value: string) => void
}) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const option = SHIFT_OPTIONS.find((item) => item.value === day.type) ?? SHIFT_OPTIONS[0]

  return (
    <motion.div
      layout
      variants={CELL_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      onClick={() => selectRef.current?.focus()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          selectRef.current?.focus()
        }
      }}
      className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-white/10 bg-slate-900/70 p-4 shadow-inner shadow-black/20 transition focus-within:border-sky-400/50 focus-within:shadow-sky-500/15 hover:border-sky-400/30 hover:shadow-sky-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer w-full aspect-square min-w-[160px] min-h-[160px]`}
    >
      <div className="flex w-full flex-shrink-0 items-center justify-between text-xs uppercase tracking-wide text-white/50">
        <span>Día {dayIndex + 1}</span>
        <motion.span
          layout
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${SHIFT_STYLES[day.type]}`}
        >
          {option.label}
        </motion.span>
      </div>

      <div className="w-full flex-1 flex flex-col justify-center space-y-2 min-w-0">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          Tipo de turno
        </label>
        <div className="relative w-full">
          <select
            ref={selectRef}
            value={day.type}
            onChange={(event) => onTypeChange(event.target.value as ShiftType)}
            onClick={(e) => e.stopPropagation()}
            className="w-full min-h-[44px] appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30 cursor-pointer"
          >
            {SHIFT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-white/50 line-clamp-2">{option.description}</p>
      </div>

      {day.type === "CUSTOM" && (
        <AnimatePresence>
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full space-y-2 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Etiqueta personalizada
            </label>
            <input
              value={day.label ?? ""}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder="Ej: Guardia, Formación"
              className="w-full rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-fuchsia-300/70 focus:ring-2 focus:ring-fuchsia-400/30"
            />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}

function UsageSelection({
  onSelect,
}: {
  onSelect: (scenario: UsageScenario) => void
}) {
  return (
    <motion.section
      layout
      className="space-y-8 rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-white shadow-xl shadow-black/40"
    >
      <header className="space-y-3">
        <motion.h2 layout className="text-2xl font-semibold">
          ¿Para qué quieres crear turnos?
        </motion.h2>
        <p className="max-w-3xl text-sm text-white/70">
          Elige la opción que mejor describa tu caso de uso y prepararemos el constructor adecuado. Después podrás ajustar cada
          detalle del calendario antes de guardarlo.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(USAGE_SCENARIO_LABELS) as UsageScenario[]).map((scenario) => (
          <button
            key={scenario}
            type="button"
            onClick={() => onSelect(scenario)}
            className="group flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-left transition hover:border-sky-400/60 hover:bg-slate-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">{USAGE_SCENARIO_LABELS[scenario]}</span>
              <span className="rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200/80 transition group-hover:border-sky-300/70 group-hover:bg-sky-500/20">
                Seleccionar
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              {USAGE_SCENARIO_DESCRIPTIONS[scenario]}
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide text-white/40">
        Puedes cambiar de opción más adelante si tus necesidades evolucionan.
      </p>
    </motion.section>
  )
}

export type PreferenceQuestionnaireProps = {
  value: QuestionnaireState
  onChange: (value: QuestionnaireState) => void
  onComplete: () => void
  title?: string
  subtitle?: string
  ctaLabel?: string
  onCancel?: () => void
  cancelLabel?: string
  footnote?: string
}

export function PreferenceQuestionnaire({
  value,
  onChange,
  onComplete,
  title,
  subtitle,
  ctaLabel = "Continuar y generar propuesta",
  onCancel,
  cancelLabel = "Cancelar",
  footnote =
    "Utilizaremos estas respuestas para proponer un patrón inicial y podrás modificarlo antes de guardarlo en Supabase.",
}: PreferenceQuestionnaireProps) {
  const handleChange = useCallback(<Key extends keyof QuestionnaireState>(
    key: Key,
    nextValue: QuestionnaireState[Key],
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    })
  }, [onChange, value])

  return (
    <motion.section
      layout
      className="space-y-8 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-xl shadow-black/40"
    >
      <header className="space-y-3">
        <motion.h2 layout className="text-2xl font-semibold text-white">
          {title ?? "Personalicemos tu calendario"}
        </motion.h2>
        <p className="max-w-3xl text-sm text-white/70">
          {subtitle ??
            "Responde estas preguntas para que podamos sugerirte la estructura inicial de tu ciclo. Siempre podrás ajustar los detalles o volver a editar estas preferencias desde tu perfil cuando cambien tus necesidades laborales."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Cuál es tu rol o equipo principal?
            </span>
            <input
              value={value.role}
              onChange={(event) => handleChange("role", event.target.value)}
              placeholder="Ej: Enfermería, Soporte técnico, Producción"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Cuál es tu prioridad principal al planificar turnos?
            </legend>
            <div className="grid gap-3">
              {(Object.keys(GOAL_DESCRIPTIONS) as WorkGoal[]).map((option) => (
                <label
                  key={option}
                  className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    value.goal === option
                      ? "border-sky-400/60 bg-sky-500/10"
                      : "border-white/10 bg-slate-950/60 hover:border-slate-500/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={option}
                    checked={value.goal === option}
                    onChange={() => handleChange("goal", option)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-sky-400"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-white">
                      {GOAL_LABELS[option]}
                    </span>
                    <span className="block text-xs text-white/70">
                      {GOAL_DESCRIPTIONS[option]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Cuántos días seguidos prefieres trabajar?
            </span>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={14}
                value={value.workBlock}
                onChange={(event) => handleChange("workBlock", Number(event.target.value))}
                className="flex-1 accent-sky-400"
              />
              <span className="w-10 text-sm font-semibold text-white">{value.workBlock}</span>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Cuántos días de descanso quieres después de cada bloque?
            </span>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={14}
                value={value.restBlock}
                onChange={(event) => handleChange("restBlock", Number(event.target.value))}
                className="flex-1 accent-emerald-400"
              />
              <span className="w-10 text-sm font-semibold text-white">{value.restBlock}</span>
            </div>
          </label>
        </div>

        <div className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Cómo te sientes respecto a los turnos nocturnos?
            </legend>
            <div className="grid gap-3">
              {(Object.keys(NIGHT_PREFERENCE_DESCRIPTIONS) as NightPreference[]).map((option) => (
                <label
                  key={option}
                  className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    value.nightPreference === option
                      ? "border-indigo-400/60 bg-indigo-500/10"
                      : "border-white/10 bg-slate-950/60 hover:border-slate-500/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="night-preference"
                    value={option}
                    checked={value.nightPreference === option}
                    onChange={() => handleChange("nightPreference", option)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-indigo-400"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold capitalize text-white">
                      {NIGHT_PREFERENCE_DESCRIPTIONS[option]}
                    </span>
                    <span className="block text-xs text-white/70">
                      {option === "none"
                        ? "Organizaremos el ciclo evitando noches para priorizar el descanso."
                        : option === "occasional"
                          ? "Añadiremos noches espaciadas para cubrir necesidades puntuales."
                          : "Planificaremos bloques nocturnos consecutivos para facilitar la adaptación."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-slate-500/40">
            <input
              type="checkbox"
              checked={value.includeVacationDay}
              onChange={(event) => handleChange("includeVacationDay", event.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer accent-amber-400"
            />
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-white">
                ¿Quieres reservar un día de vacaciones por ciclo?
              </span>
              <span className="block text-xs text-white/70">
                Añade un recordatorio para planificar vacaciones o licencias dentro del patrón.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-slate-500/40">
            <input
              type="checkbox"
              checked={value.includePersonalFocus}
              onChange={(event) => handleChange("includePersonalFocus", event.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer accent-fuchsia-400"
            />
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-white">
                ¿Deseas dedicar un día a formación o asuntos personales?
              </span>
              <span className="block text-xs text-white/70">
                Podemos reservar un bloque personalizado para cursos, trámites o autocuidado.
              </span>
            </span>
          </label>

          {value.includePersonalFocus && (
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Define la etiqueta de ese día especial
              </span>
              <input
                value={value.customFocusLabel}
                onChange={(event) => handleChange("customFocusLabel", event.target.value)}
                placeholder="Ej: Formación, Gestión personal, Proyecto"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/30"
              />
            </label>
          )}

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              ¿Desde qué fecha quieres iniciar este patrón?
            </span>
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => handleChange("startDate", event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Notas o restricciones importantes
            </span>
            <textarea
              value={value.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              rows={3}
              placeholder="Ej: Evitar fines de semana seguidos, coordinar con equipo de guardia, disponibilidad de guardería."
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-white/70">
          <p>{footnote}</p>
          <p className="text-xs text-white/50">
            Más adelante podrás actualizar estas preferencias desde tu perfil si cambias de
            equipo o rol.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/60 bg-sky-500/80 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {ctaLabel}
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </motion.section>
  )
}

export function CustomCycleBuilder({
  calendarId,
  userId,
  defaultTable = "rotation_templates",
  initialRepetitions = 4,
  initialQuestionnaire,
  showQuestionnaireOnMount,
  onQuestionnaireComplete,
  onCalendarGenerated,
}: CustomCycleBuilderProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [usageScenario, setUsageScenario] = useState<UsageScenario | null>(null)
  const initialPattern = useMemo(
    () => buildPatternFromPreferences(initialQuestionnaire ?? DEFAULT_QUESTIONNAIRE),
    [initialQuestionnaire],
  )
  const [cycleLength, setCycleLength] = useState<number>(initialPattern.length)
  const [pattern, setPattern] = useState<DayPattern[]>(initialPattern)
  const [selectedTable, setSelectedTable] = useState<
    "rotation_templates" | "user_patterns"
  >(defaultTable)
  const [startDate, setStartDate] = useState(
    () => initialQuestionnaire?.startDate ?? DEFAULT_QUESTIONNAIRE.startDate,
  )
  const [templateName, setTemplateName] = useState("Ciclo personalizado")
  const [templateDescription, setTemplateDescription] = useState("")
  const [repetitions, setRepetitions] = useState<number>(initialRepetitions ?? 4)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | undefined
  >(undefined)

  useEffect(() => {
    if (!initialQuestionnaire) {
      return
    }

    const generatedPattern = buildPatternFromPreferences(initialQuestionnaire)
    setPattern(generatedPattern)
    setCycleLength(generatedPattern.length)
    setStartDate(initialQuestionnaire.startDate || DEFAULT_QUESTIONNAIRE.startDate)
  }, [initialQuestionnaire])

  useEffect(() => {
    if (showQuestionnaireOnMount === false) {
      setUsageScenario((previous) => previous ?? "personal")
    } else {
      setUsageScenario(null)
    }
  }, [showQuestionnaireOnMount])

  useEffect(() => {
    setPattern((previous) => {
      const next = Array.from({ length: cycleLength }, (_, index) => {
        return previous[index] ?? { type: "WORK" }
      })
      return next
    })
  }, [cycleLength])

  useEffect(() => {
    setRepetitions(initialRepetitions ?? 4)
  }, [initialRepetitions])

  const normalizedPattern = useMemo(
    () => pattern.map((day) => day.type),
    [pattern],
  )

  const customLabels = useMemo(
    () => pattern.map((day) => (day.type === "CUSTOM" ? day.label?.trim() || null : null)),
    [pattern],
  )

  const handleScenarioSelect = useCallback(
    (scenario: UsageScenario) => {
      setUsageScenario(scenario)
      setFeedback(undefined)
      setSelectedTable(scenario === "personal" ? "user_patterns" : "rotation_templates")

      const questionnaireState = initialQuestionnaire ?? DEFAULT_QUESTIONNAIRE
      onQuestionnaireComplete?.({
        snapshot: createPreferencesSnapshot(questionnaireState),
        state: questionnaireState,
      })
    },
    [initialQuestionnaire, onQuestionnaireComplete],
  )

  const handleScenarioReset = useCallback(() => {
    setUsageScenario(null)
    setFeedback(undefined)
  }, [])

  const submissionPayload = useMemo<SubmissionPayload>(() => {
    return {
      pattern: normalizedPattern,
      cycle_length: cycleLength,
      start_date: startDate,
      custom_labels: customLabels,
    }
  }, [customLabels, cycleLength, normalizedPattern, startDate])

  const previewPayload = submissionPayload

  const handleDayTypeChange = useCallback((index: number, type: ShiftType) => {
    setPattern((previous) => {
      const next = [...previous]
      next[index] = { ...next[index], type }
      if (type !== "CUSTOM") {
        next[index].label = undefined
      }
      return next
    })
  }, [])

  const handleDayLabelChange = useCallback((index: number, label: string) => {
    setPattern((previous) => {
      const next = [...previous]
      next[index] = { ...next[index], label }
      return next
    })
  }, [])

  const cycleLengthOptions = useMemo(() => {
    const maxOption = Math.max(...CYCLE_LENGTH_PRESETS)
    if (cycleLength > maxOption && !CYCLE_LENGTH_PRESETS.includes(cycleLength)) {
      return [...CYCLE_LENGTH_PRESETS, cycleLength]
    }
    return CYCLE_LENGTH_PRESETS
  }, [cycleLength])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setFeedback(undefined)

    try {
      if (!startDate) {
        throw new Error("Debes indicar una fecha de inicio para el patrón")
      }

      if (selectedTable === "rotation_templates") {
        if (!calendarId) {
          throw new Error(
            "Necesitas proporcionar un calendarId para guardar en rotation_templates",
          )
        }

        if (!userId) {
          throw new Error(
            "Necesitas proporcionar un userId (created_by) para guardar en rotation_templates",
          )
        }

        const templatePayload = {
          calendar_id: calendarId,
          name: templateName.trim() || "Ciclo personalizado",
          description: templateDescription.trim() || null,
          start_date: startDate,
          days_horizon: cycleLength * repetitions,
          created_by: userId,
        }

        const { data: template, error: templateError } = await supabase
          .from("rotation_templates")
          .insert([templatePayload])
          .select("id")
          .single()

        if (templateError) {
          throw new Error(
            `No se pudo guardar el patrón en rotation_templates: ${templateError.message}`,
          )
        }

        const templateId = template?.id

        if (!templateId) {
          throw new Error(
            "No se pudo obtener el identificador del nuevo registro en rotation_templates",
          )
        }

        const stepsPayload = normalizedPattern.map((shiftType, index) => ({
          template_id: templateId,
          day_offset: index,
          shift_type_code: shiftType,
        }))

        if (stepsPayload.length > 0) {
          const { error: stepsError } = await supabase
            .from("rotation_steps")
            .insert(stepsPayload)

          if (stepsError) {
            await supabase.from("rotation_templates").delete().eq("id", templateId)
            throw new Error(
              `No se pudieron guardar los pasos del patrón en rotation_steps: ${stepsError.message}`,
            )
          }
        }
      } else {
        if (!userId) {
          throw new Error(
            "Necesitas proporcionar un userId para guardar en user_patterns",
          )
        }

        const finalUserPatternPayload = {
          user_id: userId,
          ...submissionPayload,
        }

        const { error } = await supabase
          .from("user_patterns")
          .insert([finalUserPatternPayload])
        if (error) {
          throw new Error(`No se pudo guardar el patrón en user_patterns: ${error.message}`)
        }
      }

      await generateCalendarFromPattern(
        supabase,
        normalizedPattern,
        startDate,
        calendarId,
        customLabels,
        repetitions,
      )

      setFeedback({
        type: "success",
        message: "Patrón guardado y calendario generado correctamente",
      })
      onCalendarGenerated?.({
        calendarId,
        patternLength: normalizedPattern.length,
        repetitions,
        startDate,
      })
    } catch (error) {
      console.error(error)
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el patrón. Inténtalo de nuevo.",
      })
    } finally {
      setIsSaving(false)
    }
  }, [
    calendarId,
    customLabels,
    cycleLength,
    repetitions,
    normalizedPattern,
    selectedTable,
    startDate,
    supabase,
    templateDescription,
    templateName,
    userId,
    submissionPayload,
    onCalendarGenerated,
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AnimatePresence mode="wait" initial={false}>
        {!usageScenario ? (
          <motion.div
            key="usage-selection"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <UsageSelection onSelect={handleScenarioSelect} />
          </motion.div>
        ) : (
          <motion.div
            key={`builder-${usageScenario}`}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="space-y-8 rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-white shadow-xl shadow-black/40 backdrop-blur-xl">
              <header className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-sky-100/90">
                    {USAGE_SCENARIO_LABELS[usageScenario]}
                  </span>
                  <button
                    type="button"
                    onClick={handleScenarioReset}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    Cambiar opción
                  </button>
                </div>
                <motion.h1
                  layout
                  className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                >
                  {USAGE_SCENARIO_HEADLINES[usageScenario].title}
                </motion.h1>
                <p className="max-w-3xl text-sm text-white/70">
                  {USAGE_SCENARIO_HEADLINES[usageScenario].subtitle}
                </p>
              </header>

              <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-6">
                  <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Longitud del ciclo
                        </span>
                        <div className="flex gap-3">
                          <select
                            value={cycleLength}
                            onChange={(event) => setCycleLength(Number(event.target.value))}
                            className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                          >
                            {cycleLengthOptions.map((lengthOption) => (
                              <option key={lengthOption} value={lengthOption}>
                                {lengthOption} días
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Fecha de inicio
                        </span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Tabla de destino
                        </span>
                        <select
                          value={selectedTable}
                          onChange={(event) =>
                            setSelectedTable(event.target.value as "rotation_templates" | "user_patterns")
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                        >
                          <option value="rotation_templates">rotation_templates</option>
                          <option value="user_patterns">user_patterns</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Repeticiones para generar eventos
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={repetitions}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value)
                            if (Number.isNaN(nextValue) || nextValue <= 0) {
                              return
                            }
                            setRepetitions(Math.floor(nextValue))
                          }}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                        />
                      </label>
                    </div>

                    {selectedTable === "rotation_templates" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                            Nombre del patrón
                          </span>
                          <input
                            value={templateName}
                            onChange={(event) => setTemplateName(event.target.value)}
                            placeholder="Ej: Ciclo 7x7"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                            Descripción
                          </span>
                          <input
                            value={templateDescription}
                            onChange={(event) => setTemplateDescription(event.target.value)}
                            placeholder="Turnos rotativos del equipo"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white/90 placeholder:text-white/40 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/30"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div
                    className="grid gap-4 w-full"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))",
                    }}
                  >
                    {pattern.map((day, index) => (
                      <DayCell
                        key={index}
                        dayIndex={index}
                        day={day}
                        onTypeChange={(type) => handleDayTypeChange(index, type)}
                        onLabelChange={(label) => handleDayLabelChange(index, label)}
                      />
                    ))}
                  </div>
                </div>

                <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-white">Resumen</h2>
                    <p className="text-sm text-white/70">
                      Este es el JSON que se enviará a Supabase cuando guardes el patrón.
                    </p>
                    <pre className="max-h-72 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-sky-200">
                      {JSON.stringify(previewPayload, null, 2)}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-sky-500/80 bg-sky-500/80 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-300/40 to-sky-500/0 opacity-0 transition group-hover:opacity-100"
                      layout
                    />
                    <span className="relative flex items-center gap-2">
                      {isSaving ? "Guardando patrón..." : "Guardar patrón"}
                      <motion.span
                        animate={{ rotate: isSaving ? 360 : 0 }}
                        transition={{ duration: 1, ease: "linear", repeat: isSaving ? Infinity : 0 }}
                        className="inline-flex h-4 w-4 items-center justify-center"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {isSaving ? (
                            <path d="M21 12a9 9 0 1 1-6-8.66" />
                          ) : (
                            <path d="M5 13l4 4L19 7" />
                          )}
                        </svg>
                      </motion.span>
                    </span>
                  </button>

                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        feedback.type === "success"
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                          : "border-rose-400/50 bg-rose-500/10 text-rose-100"
                      }`}
                    >
                      {feedback.message}
                    </motion.div>
                  )}
                </aside>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomCycleBuilder
