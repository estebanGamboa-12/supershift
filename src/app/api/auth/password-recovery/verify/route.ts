import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"

type VerifyPayload = {
  email?: unknown
  code?: unknown
  newPassword?: unknown
}

function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const t = value.trim().toLowerCase()
  return t && t.includes("@") ? t : null
}

function sanitizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const t = value.trim()
  return /^\d{6}$/.test(t) ? t : null
}

function sanitizePassword(value: unknown): string | null {
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length >= 6 ? t : null
}

export async function POST(request: Request) {
  let payload: VerifyPayload | null = null

  try {
    payload = (await request.json()) as VerifyPayload
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON" },
      { status: 400 },
    )
  }

  const email = sanitizeEmail(payload?.email)
  const code = sanitizeCode(payload?.code)
  const newPassword = sanitizePassword(payload?.newPassword)

  if (!email) {
    return NextResponse.json(
      { error: "Proporciona un correo válido" },
      { status: 400 },
    )
  }
  if (!code) {
    return NextResponse.json(
      { error: "El código debe ser de 6 dígitos" },
      { status: 400 },
    )
  }
  if (!newPassword) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    )
  }

  const supabase = getSupabaseClient()

  const { data: rows, error: selectError } = await supabase
    .from("password_reset_codes")
    .select("id")
    .eq("email", email)
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .limit(1)

  if (selectError) {
    console.error("Error leyendo código de recuperación", selectError)
    return NextResponse.json(
      { error: "No se pudo verificar el código. Revisa la tabla password_reset_codes." },
      { status: 500 },
    )
  }

  const row = rows?.[0]
  if (!row) {
    return NextResponse.json(
      { error: "Código incorrecto o caducado. Solicita uno nuevo." },
      { status: 400 },
    )
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    )
  }

  const listRes = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?per_page=1000&page=0`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: anonKey ?? serviceKey,
      },
    },
  )

  if (!listRes.ok) {
    console.error("Error listando usuarios auth", await listRes.text())
    return NextResponse.json(
      { error: "No se pudo identificar la cuenta" },
      { status: 500 },
    )
  }

  const listData = (await listRes.json()) as { users?: Array<{ id: string; email?: string }> }
  const authUser = listData.users?.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  )

  if (!authUser?.id) {
    return NextResponse.json(
      { error: "No hay ninguna cuenta con ese correo." },
      { status: 400 },
    )
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    authUser.id,
    { password: newPassword },
  )

  if (updateError) {
    console.error("Error actualizando contraseña", updateError)
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña. Intenta de nuevo." },
      { status: 500 },
    )
  }

  await supabase.from("password_reset_codes").delete().eq("id", row.id)

  return NextResponse.json({ success: true })
}
