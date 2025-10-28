import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

type PushSubscriptionPayload = {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
  expirationTime?: number | null
}

function normalizeSubscription(value: unknown): PushSubscriptionPayload | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as PushSubscriptionPayload
  if (typeof candidate.endpoint !== "string" || candidate.endpoint.trim().length === 0) {
    return null
  }
  return {
    endpoint: candidate.endpoint.trim(),
    keys: {
      p256dh: candidate.keys?.p256dh,
      auth: candidate.keys?.auth,
    },
    expirationTime: candidate.expirationTime ?? null,
  }
}

function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isNaN(parsed)) {
      return null
    }
    return Math.max(1, parsed)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const subscription = normalizeSubscription(payload.subscription)
    const userId = normalizeUserId(payload.userId)

    if (!subscription) {
      return NextResponse.json(
        { error: "La suscripción enviada no es válida" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseClient()
    const upsertPayload = {
      endpoint: subscription.endpoint,
      user_id: userId,
      p256dh: subscription.keys?.p256dh ?? null,
      auth: subscription.keys?.auth ?? null,
      expiration_time: subscription.expirationTime
        ? new Date(subscription.expirationTime).toISOString()
        : null,
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(upsertPayload, { onConflict: "endpoint" })

    if (error) {
      throw error
    }

    return NextResponse.json({ message: "Suscripción push registrada correctamente" })
  } catch (error) {
    console.error("Error storing push subscription", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la suscripción de notificaciones push.",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}))
    const subscription = normalizeSubscription(payload.subscription)

    if (!subscription) {
      return NextResponse.json(
        { error: "Debes indicar la suscripción que quieres eliminar" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: "Suscripción push eliminada" })
  } catch (error) {
    console.error("Error deleting push subscription", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la suscripción push proporcionada.",
      },
      { status: 500 },
    )
  }
}
