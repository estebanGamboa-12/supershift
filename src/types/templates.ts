export type ShiftTemplate = {
  id: number
  userId: string
  title: string
  icon?: string | null
  startTime: string
  endTime: string
  breakMinutes?: number | null
  alertMinutes?: number | null
  location?: string | null
  createdAt: string
  updatedAt: string
}

export type ShiftTemplateInput = {
  title: string
  icon?: string | null
  startTime: string
  endTime: string
  breakMinutes?: number | null
  alertMinutes?: number | null
  location?: string | null
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
