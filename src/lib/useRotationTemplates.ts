"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { PostgrestSingleResponse } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type {
  RotationTemplate,
  RotationTemplateAssignment,
  RotationTemplateInput,
} from "@/types/templates"

type RotationTemplateRow = {
  id: number
  user_id: string
  title?: string | null
  icon?: string | null
  description?: string | null
  days_count?: number | null
  assignments?: RotationTemplateAssignmentRow[] | null
  created_at?: string | null
  updated_at?: string | null
}

type RotationTemplateAssignmentRow = {
  day_index?: number | null
  shift_template_id?: number | null
}

function normaliseAssignment(row: RotationTemplateAssignmentRow, index: number): RotationTemplateAssignment {
  const dayIndex =
    typeof row.day_index === "number"
      ? row.day_index
      : Number.isFinite(row.day_index)
        ? Number(row.day_index)
        : index

  return {
    dayIndex,
    shiftTemplateId: typeof row.shift_template_id === "number" ? row.shift_template_id : null,
  }
}

function normaliseRotationTemplate(row: RotationTemplateRow): RotationTemplate {
  const assignments = Array.isArray(row.assignments)
    ? row.assignments.map((assignment, index) => normaliseAssignment(assignment, index))
    : []

  const daysCount =
    typeof row.days_count === "number"
      ? row.days_count
      : assignments.length > 0
        ? assignments.length
        : 7

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title?.trim() || "Plantilla sin título",
    icon: row.icon ?? null,
    description: row.description ?? null,
    daysCount,
    assignments,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

export function useRotationTemplates(userId: string | null | undefined) {
  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    try {
      return getSupabaseBrowserClient()
    } catch (error) {
      console.error("No se pudo inicializar Supabase en useRotationTemplates", error)
      return null
    }
  }, [])

  const [templates, setTemplates] = useState<RotationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!supabase || !userId) {
      setTemplates([])
      return
    }

    setIsLoading(true)
    setError(null)

    const response: PostgrestSingleResponse<RotationTemplateRow[]> = await supabase
      .from("rotation_templates")
      .select(
        "id, user_id, title, icon, description, days_count, assignments, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (response.error) {
      console.error("No se pudieron cargar las plantillas de rotación", response.error)
      setError(
        response.error.message ??
          "No se pudieron cargar las plantillas de rotación. Inténtalo de nuevo más tarde.",
      )
      setTemplates([])
      setIsLoading(false)
      return
    }

    const rows = response.data ?? []
    setTemplates(rows.map((row) => normaliseRotationTemplate(row)))
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

  const createRotationTemplate = useCallback(
    async (payload: RotationTemplateInput): Promise<RotationTemplate | null> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para crear plantillas de rotación")
        return null
      }

      const insertPayload = {
        user_id: userId,
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        description: payload.description?.trim() ?? null,
        days_count: payload.daysCount,
        assignments: payload.assignments.map((assignment) => ({
          day_index: assignment.dayIndex,
          shift_template_id: assignment.shiftTemplateId,
        })),
      }

      const { data, error: insertError } = await supabase
        .from("rotation_templates")
        .insert(insertPayload)
        .select(
          "id, user_id, title, icon, description, days_count, assignments, created_at, updated_at",
        )
        .single()

      if (insertError) {
        console.error("No se pudo crear la plantilla de rotación", insertError)
        setError(
          insertError.message ??
            "No se pudo crear la plantilla de rotación. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const template = normaliseRotationTemplate(data as RotationTemplateRow)
      setTemplates((current) => [template, ...current])
      return template
    },
    [supabase, userId],
  )

  const updateRotationTemplate = useCallback(
    async (
      id: number,
      payload: RotationTemplateInput,
    ): Promise<RotationTemplate | null> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para actualizar plantillas de rotación")
        return null
      }

      const updatePayload = {
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        description: payload.description?.trim() ?? null,
        days_count: payload.daysCount,
        assignments: payload.assignments.map((assignment) => ({
          day_index: assignment.dayIndex,
          shift_template_id: assignment.shiftTemplateId,
        })),
      }

      const { data, error: updateError } = await supabase
        .from("rotation_templates")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", userId)
        .select(
          "id, user_id, title, icon, description, days_count, assignments, created_at, updated_at",
        )
        .single()

      if (updateError) {
        console.error("No se pudo actualizar la plantilla de rotación", updateError)
        setError(
          updateError.message ??
            "No se pudo actualizar la plantilla de rotación. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const template = normaliseRotationTemplate(data as RotationTemplateRow)
      setTemplates((current) => current.map((item) => (item.id === id ? template : item)))
      return template
    },
    [supabase, userId],
  )

  const deleteRotationTemplate = useCallback(
    async (id: number): Promise<boolean> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para eliminar plantillas de rotación")
        return false
      }

      const { error: deleteError } = await supabase
        .from("rotation_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (deleteError) {
        console.error("No se pudo eliminar la plantilla de rotación", deleteError)
        setError(
          deleteError.message ??
            "No se pudo eliminar la plantilla de rotación. Inténtalo de nuevo más tarde.",
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
    createRotationTemplate,
    updateRotationTemplate,
    deleteRotationTemplate,
  }
}
