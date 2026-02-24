import { NextResponse } from "next/server"

import { getOrCreateCalendarForUser } from "@/lib/calendars"
import type { CalendarSummary } from "@/types/calendars"

export const runtime = "nodejs"

function sanitizeUserId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === "bigint") {
    const candidate = value.toString()
    return candidate.length > 0 ? candidate : null
  }

  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = sanitizeUserId(searchParams.get("userId"))

  if (!userId) {
    return NextResponse.json(
      { error: "Debes indicar el usuario para obtener sus calendarios" },
      { status: 400 },
    )
  }

  try {
    const calendars: CalendarSummary[] = []

    const personalCalendarId = await getOrCreateCalendarForUser(userId)
    if (personalCalendarId) {
      calendars.push({
        id: personalCalendarId,
        name: "Mi calendario",
        scope: "personal",
      })
    }

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("No se pudieron recuperar los calendarios del usuario", error)
    return NextResponse.json(
      { error: "No se pudo cargar la lista de calendarios disponibles" },
      { status: 500 },
    )
  }
}
