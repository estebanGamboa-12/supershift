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
  start_time?: string | null
  end_time?: string | null
  break_minutes?: number | null
  alert_minutes?: number | null
  location?: string | null
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
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? "Plantilla sin título",
    icon: row.icon ?? null,
    startTime: normaliseTime(row.start_time ?? undefined) || "09:00",
    endTime: normaliseTime(row.end_time ?? undefined) || "17:00",
    breakMinutes: typeof row.break_minutes === "number" ? row.break_minutes : null,
    alertMinutes: typeof row.alert_minutes === "number" ? row.alert_minutes : null,
    location: row.location ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

export function useShiftTemplates(userId: string | null | undefined) {
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

    const response: PostgrestSingleResponse<ShiftTemplateRow[]> = await supabase
      .from("shift_template_presets")
      .select(
        "id, user_id, title, icon, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

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

      const insertPayload = {
        user_id: userId,
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        start_time: payload.startTime,
        end_time: payload.endTime,
        break_minutes: payload.breakMinutes ?? null,
        alert_minutes: payload.alertMinutes ?? null,
        location: payload.location ?? null,
      }

      const { data, error: insertError } = await supabase
        .from("shift_template_presets")
        .insert(insertPayload)
        .select(
          "id, user_id, title, icon, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at",
        )
        .single()

      if (insertError) {
        console.error("No se pudo crear la plantilla de turno", insertError)
        setError(
          insertError.message ??
            "No se pudo crear la plantilla de turno. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const template = normaliseTemplate(data as ShiftTemplateRow)
      setTemplates((current) => [template, ...current])
      return template
    },
    [supabase, userId],
  )

  const updateShiftTemplate = useCallback(
    async (id: number, payload: ShiftTemplateInput): Promise<ShiftTemplate | null> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para actualizar plantillas")
        return null
      }

      const updatePayload = {
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        start_time: payload.startTime,
        end_time: payload.endTime,
        break_minutes: payload.breakMinutes ?? null,
        alert_minutes: payload.alertMinutes ?? null,
        location: payload.location ?? null,
      }

      const { data, error: updateError } = await supabase
        .from("shift_template_presets")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", userId)
        .select(
          "id, user_id, title, icon, start_time, end_time, break_minutes, alert_minutes, location, created_at, updated_at",
        )
        .single()

      if (updateError) {
        console.error("No se pudo actualizar la plantilla de turno", updateError)
        setError(
          updateError.message ??
            "No se pudo actualizar la plantilla de turno. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const template = normaliseTemplate(data as ShiftTemplateRow)
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
