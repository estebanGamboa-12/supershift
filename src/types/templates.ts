import type { ShiftPluses } from "./shifts"

/** Mapa extraId -> 0|1 (los extras los crea el usuario en Extras). */
export type DefaultExtrasMap = Record<string, number>

export type ShiftTemplate = {
  id: number
  userId: string
  title: string
  icon?: string | null
  color?: string | null
  startTime: string
  endTime: string
  breakMinutes?: number | null
  alertMinutes?: number | null
  location?: string | null
  /** Extras por defecto por ID de extra (usuario los crea). En BBDD como default_extras JSONB. */
  defaultExtras?: DefaultExtrasMap | null
  /** @deprecated Usar defaultExtras; se deriva en cliente para compat. */
  defaultPluses?: ShiftPluses | null
  createdAt: string
  updatedAt: string
}

export type ShiftTemplateInput = {
  title: string
  icon?: string | null
  color?: string | null
  startTime: string
  endTime: string
  breakMinutes?: number | null
  alertMinutes?: number | null
  location?: string | null
  /** Extras por defecto por ID de extra. */
  defaultExtras?: DefaultExtrasMap | null
  /** @deprecated Enviar defaultExtras en su lugar. */
  defaultPluses?: ShiftPluses | null
}

export type RotationTemplateAssignment = {
  dayIndex: number
  shiftTemplateId: number | null
}

export type RotationTemplate = {
  id: number
  userId: string
  title: string
  icon?: string | null
  description?: string | null
  daysCount: number
  assignments: RotationTemplateAssignment[]
  createdAt: string
  updatedAt: string
}

export type RotationTemplateInput = {
  title: string
  icon?: string | null
  description?: string | null
  daysCount: number
  assignments: RotationTemplateAssignment[]
}
