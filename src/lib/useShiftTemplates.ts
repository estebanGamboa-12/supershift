"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { PostgrestSingleResponse } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { ShiftTemplate, ShiftTemplateInput } from "@/types/templates"

type ShiftTemplateRow = {
  id: number
  user_id: string
  title: string | null
  icon?: string | null
  color?: string | null
  start_time?: string | null
  end_time?: string | null
  break_minutes?: number | null
  alert_minutes?: number | null
  location?: string | null
  default_extras?: Record<string, number> | null
  plus_night?: number | null
  plus_holiday?: number | null
  plus_availability?: number | null
  plus_other?: number | null
  created_at?: string | null
  updated_at?: string | null
}

function normaliseTime(value?: string | null): string {
  if (!value) {
    return "00:00"
  }

  const [hours = "00", minutes = "00"] = value.split(":")
  const normalizedHours = hours.padStart(2, "0").slice(0, 2)
  const normalizedMinutes = minutes.padStart(2, "0").slice(0, 2)
  return `${normalizedHours}:${normalizedMinutes}`
}

function normaliseTemplate(row: ShiftTemplateRow): ShiftTemplate {
  let raw = row.default_extras
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as Record<string, number>
    } catch {
      raw = null
    }
  }
  const defaultExtras =
    raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).length > 0
      ? (raw as Record<string, number>)
      : undefined
  const defaultPluses =
    !defaultExtras &&
    (typeof row.plus_night === "number" ||
      typeof row.plus_holiday === "number" ||
      typeof row.plus_availability === "number" ||
      typeof row.plus_other === "number")
      ? {
          night: Number(row.plus_night) || 0,
          holiday: Number(row.plus_holiday) || 0,
          availability: Number(row.plus_availability) || 0,
          other: Number(row.plus_other) || 0,
        }
      : undefined
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? "Plantilla sin título",
    icon: row.icon ?? null,
    color: row.color ?? null,
    startTime: normaliseTime(row.start_time ?? undefined) || "09:00",
    endTime: normaliseTime(row.end_time ?? undefined) || "17:00",
    breakMinutes: typeof row.break_minutes === "number" ? row.break_minutes : null,
    alertMinutes: typeof row.alert_minutes === "number" ? row.alert_minutes : null,
    location: row.location ?? null,
    defaultExtras: defaultExtras ?? null,
    defaultPluses: defaultPluses ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

export type UseShiftTemplatesOptions = {
  onCreditsRequired?: (cost: number) => void
}

export function useShiftTemplates(
  userId: string | null | undefined,
  options?: UseShiftTemplatesOptions,
) {
  const { onCreditsRequired } = options ?? {}
  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("No se pudo inicializar Supabase en useShiftTemplates", error)
      return null
    }
  }, [])

  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!supabase || !userId) {
      setTemplates([])
      return
    }

    setIsLoading(true)
    setError(null)

    const selectWithDefaultExtras =
      "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, default_extras, created_at, updated_at"
    const selectWithPluses =
      "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, plus_night, plus_holiday, plus_availability, plus_other, created_at, updated_at"
    const selectBase =
      "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at"

    let response: PostgrestSingleResponse<ShiftTemplateRow[]> = await supabase
      .from("shift_template_presets")
      .select(selectWithDefaultExtras)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (response.error) {
      const msg = String(response.error.message ?? "")
      const code = String((response.error as { code?: string }).code ?? "")
      const missingColumn = /column.*does not exist|does not exist|PGRST204/i.test(msg) || code === "PGRST204"
      if (missingColumn) {
        response = await supabase
          .from("shift_template_presets")
          .select(selectWithPluses)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      }
      if (response.error && missingColumn) {
        response = await supabase
          .from("shift_template_presets")
          .select(selectBase)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      }
    }

    if (response.error) {
      console.error("No se pudieron cargar las plantillas de turnos", response.error)
      setError(
        response.error.message ??
          "No se pudieron cargar las plantillas de turnos. Inténtalo de nuevo más tarde.",
      )
      setTemplates([])
      setIsLoading(false)
      return
    }

    const data = response.data ?? []
    setTemplates(data.map((row) => normaliseTemplate(row)))
    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    let isMounted = true

    if (!supabase || !userId) {
      setTemplates([])
      return
    }

    setIsLoading(true)
    setError(null)

    void fetchTemplates().finally(() => {
      if (isMounted) {
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [fetchTemplates, supabase, userId])

  const createShiftTemplate = useCallback(
    async (payload: ShiftTemplateInput): Promise<ShiftTemplate | null> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para crear plantillas de turno")
        return null
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token ?? ""
      if (!token) {
        setError("Necesitas iniciar sesión para crear plantillas de turno")
        return null
      }

      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/shift-templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: payload.title.trim(),
          icon: payload.icon ?? null,
          color: payload.color ?? null,
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes: payload.breakMinutes ?? null,
          alertMinutes: payload.alertMinutes ?? null,
          location: payload.location ?? null,
          defaultExtras: payload.defaultExtras ?? undefined,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (data?.code === "CREDITS_INSUFFICIENT") {
          onCreditsRequired?.(20)
          setError(null)
          return null
        }
        setError(data?.error ?? "No se pudo crear la plantilla de turno. Inténtalo de nuevo más tarde.")
        return null
      }

      const template: ShiftTemplate = {
        id: data.id,
        userId: data.userId,
        title: data.title ?? "Plantilla sin título",
        icon: data.icon ?? null,
        color: data.color ?? null,
        startTime: data.startTime ?? "09:00",
        endTime: data.endTime ?? "17:00",
        breakMinutes: data.breakMinutes ?? null,
        alertMinutes: data.alertMinutes ?? null,
        location: data.location ?? null,
        defaultExtras: data.defaultExtras ?? null,
        defaultPluses: data.defaultPluses ?? null,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
      }
      setTemplates((current) => [template, ...current])
      return template
    },
    [onCreditsRequired, supabase, userId],
  )

  const updateShiftTemplate = useCallback(
    async (id: number, payload: ShiftTemplateInput): Promise<ShiftTemplate | null> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para actualizar plantillas")
        return null
      }

      const basePayload = {
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        color: payload.color ?? null,
        start_time: payload.startTime,
        end_time: payload.endTime,
        break_minutes: payload.breakMinutes ?? null,
        alert_minutes: payload.alertMinutes ?? null,
        location: payload.location ?? null,
      }
      const updatePayloadWithDefaultExtras = {
        ...basePayload,
        default_extras: payload.defaultExtras ?? {},
      }

      const selectWithDefaultExtras =
        "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, default_extras, created_at, updated_at"
      const selectBase =
        "id, user_id, title, icon, color, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at"

      let result = await supabase
        .from("shift_template_presets")
        .update(updatePayloadWithDefaultExtras)
        .eq("id", id)
        .eq("user_id", userId)
        .select(selectWithDefaultExtras)
        .single()

      if (result.error) {
        const msg = String(result.error.message ?? "")
        const code = String((result.error as { code?: string }).code ?? "")
        const missingColumn = /column.*does not exist|does not exist|PGRST204/i.test(msg) || code === "PGRST204"
        if (missingColumn) {
          result = await supabase
            .from("shift_template_presets")
            .update(basePayload)
            .eq("id", id)
            .eq("user_id", userId)
            .select(selectBase)
            .single()
        }
      }

      if (result.error) {
        console.error("No se pudo actualizar la plantilla de turno", result.error)
        setError(
          result.error.message ??
            "No se pudo actualizar la plantilla de turno. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const template = normaliseTemplate(result.data as ShiftTemplateRow)
      setTemplates((current) => current.map((item) => (item.id === id ? template : item)))
      return template
    },
    [supabase, userId],
  )

  const deleteShiftTemplate = useCallback(
    async (id: number): Promise<boolean> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para eliminar plantillas")
        return false
      }

      const { error: deleteError } = await supabase
        .from("shift_template_presets")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (deleteError) {
        console.error("No se pudo eliminar la plantilla de turno", deleteError)
        setError(
          deleteError.message ??
            "No se pudo eliminar la plantilla de turno. Inténtalo de nuevo más tarde.",
        )
        return false
      }

      setTemplates((current) => current.filter((item) => item.id !== id))
      return true
    },
    [supabase, userId],
  )

  return {
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
    createShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
  }
}
