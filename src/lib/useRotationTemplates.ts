"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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

function normaliseAssignment(
  row: RotationTemplateAssignmentRow,
  index: number,
): RotationTemplateAssignment {
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
    ? row.assignments
        .map((assignment, index) => normaliseAssignment(assignment, index))
        .sort((a, b) => a.dayIndex - b.dayIndex)
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

  const selectProjection = useMemo(
    () =>
      [
        "id",
        "user_id",
        "title",
        "icon",
        "description",
        "days_count",
        "created_at",
        "updated_at",
        "assignments:rotation_template_preset_assignments(day_index,shift_template_id)",
      ].join(","),
    [],
  )

  const readTemplateById = useCallback(
    async (templateId: number): Promise<RotationTemplate | null> => {
      if (!supabase || !userId) {
        return null
      }

      const { data, error: fetchError } = await supabase
        .from("rotation_template_presets")
        .select(selectProjection)
        .eq("id", templateId)
        .eq("user_id", userId)
        .maybeSingle()

      if (fetchError) {
        console.error(
          `No se pudo obtener la plantilla de rotación con id ${templateId}`,
          fetchError,
        )
        setError(
          fetchError.message ??
            "No se pudo cargar la plantilla de rotación. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      if (!data) {
        return null
      }

      return normaliseRotationTemplate(data as unknown as RotationTemplateRow)
    },
    [selectProjection, supabase, userId],
  )

  const fetchTemplates = useCallback(async () => {
    if (!supabase || !userId) {
      setTemplates([])
      return
    }

    setIsLoading(true)
    setError(null)

    const response = await supabase
      .from("rotation_template_presets")
      .select(selectProjection)
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

    const rows = (response.data ?? []) as unknown as RotationTemplateRow[]
    setTemplates(rows.map((row) => normaliseRotationTemplate(row)))
    setIsLoading(false)
  }, [selectProjection, supabase, userId])

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

      setError(null)

      const insertPayload = {
        user_id: userId,
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        description: payload.description?.trim() ?? null,
        days_count: payload.daysCount,
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from("rotation_template_presets")
        .insert(insertPayload)
        .select("id")
        .single<{ id: number }>()

      if (insertError || !insertedRow) {
        console.error("No se pudo crear la plantilla de rotación", insertError)
        setError(
          insertError?.message ??
            "No se pudo crear la plantilla de rotación. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const templateId = insertedRow.id

      if (payload.assignments.length > 0) {
        const assignmentsPayload = payload.assignments.map((assignment) => ({
          template_id: templateId,
          day_index: assignment.dayIndex,
          shift_template_id: assignment.shiftTemplateId,
        }))

        const { error: assignmentsError } = await supabase
          .from("rotation_template_preset_assignments")
          .upsert(assignmentsPayload, { onConflict: "template_id,day_index" })

        if (assignmentsError) {
          console.error(
            "No se pudieron guardar los días de la plantilla de rotación",
            assignmentsError,
          )
          await supabase
            .from("rotation_template_presets")
            .delete()
            .eq("id", templateId)
          setError(
            assignmentsError.message ??
              "No se pudieron guardar los días de la plantilla. Inténtalo de nuevo más tarde.",
          )
          return null
        }
      }

      const template = await readTemplateById(templateId)
      if (!template) {
        return null
      }

      setTemplates((current) => [template, ...current])
      return template
    },
    [readTemplateById, supabase, userId],
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

      setError(null)

      const updatePayload = {
        title: payload.title.trim(),
        icon: payload.icon ?? null,
        description: payload.description?.trim() ?? null,
        days_count: payload.daysCount,
      }

      const { error: updateError } = await supabase
        .from("rotation_template_presets")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", userId)

      if (updateError) {
        console.error("No se pudo actualizar la plantilla de rotación", updateError)
        setError(
          updateError.message ??
            "No se pudo actualizar la plantilla de rotación. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      const { error: deleteError } = await supabase
        .from("rotation_template_preset_assignments")
        .delete()
        .eq("template_id", id)

      if (deleteError) {
        console.error(
          "No se pudieron limpiar los días de la plantilla de rotación",
          deleteError,
        )
        setError(
          deleteError.message ??
            "No se pudieron actualizar los días de la plantilla. Inténtalo de nuevo más tarde.",
        )
        return null
      }

      if (payload.assignments.length > 0) {
        const assignmentsPayload = payload.assignments.map((assignment) => ({
          template_id: id,
          day_index: assignment.dayIndex,
          shift_template_id: assignment.shiftTemplateId,
        }))

        const { error: assignmentsError } = await supabase
          .from("rotation_template_preset_assignments")
          .upsert(assignmentsPayload, { onConflict: "template_id,day_index" })

        if (assignmentsError) {
          console.error(
            "No se pudieron guardar los días actualizados de la plantilla",
            assignmentsError,
          )
          setError(
            assignmentsError.message ??
              "No se pudieron guardar los días actualizados. Inténtalo de nuevo más tarde.",
          )
          return null
        }
      }

      const template = await readTemplateById(id)
      if (!template) {
        return null
      }

      setTemplates((current) => current.map((item) => (item.id === id ? template : item)))
      return template
    },
    [readTemplateById, supabase, userId],
  )

  const deleteRotationTemplate = useCallback(
    async (id: number): Promise<boolean> => {
      if (!supabase || !userId) {
        setError("Necesitas iniciar sesión para eliminar plantillas de rotación")
        return false
      }

      const { error: deleteError } = await supabase
        .from("rotation_template_presets")
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
