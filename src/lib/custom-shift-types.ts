import type { CustomShiftType } from "@/types/preferences"

const API_BASE = "/api/users"

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {}
  try {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase")
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const token = data.session?.access_token
    if (token) return { Authorization: `Bearer ${token}` }
  } catch {
    // ignore
  }
  return {}
}

export async function fetchCustomShiftTypes(userId: string): Promise<CustomShiftType[]> {
  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/${userId}/custom-shift-types`, {
      headers: { ...authHeaders },
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.shiftTypes || []
  } catch (error) {
    console.error("Error fetching custom shift types:", error)
    return []
  }
}

export async function createCustomShiftType(
  userId: string,
  shiftType: Omit<CustomShiftType, "id">,
): Promise<CustomShiftType> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/${userId}/custom-shift-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      name: shiftType.name,
      color: shiftType.color,
      icon: shiftType.icon,
      defaultStartTime: shiftType.defaultStartTime ?? null,
      defaultEndTime: shiftType.defaultEndTime ?? null,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "No se pudo crear el tipo de turno")
  }

  const data = await response.json()
  return data.shiftType
}

export async function updateCustomShiftType(
  userId: string,
  id: string,
  updates: Partial<Omit<CustomShiftType, "id">>,
): Promise<CustomShiftType> {
  const authHeaders = await getAuthHeaders()
  const body: Record<string, unknown> = { ...updates }
  if ("defaultStartTime" in updates) body.defaultStartTime = updates.defaultStartTime ?? null
  if ("defaultEndTime" in updates) body.defaultEndTime = updates.defaultEndTime ?? null
  const response = await fetch(`${API_BASE}/${userId}/custom-shift-types/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "No se pudo actualizar el tipo de turno")
  }

  const data = await response.json()
  return data.shiftType
}

export async function deleteCustomShiftType(userId: string, id: string): Promise<void> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/${userId}/custom-shift-types/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "No se pudo eliminar el tipo de turno")
  }
}
