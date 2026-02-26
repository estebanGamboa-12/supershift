import { NextResponse } from "next/server"
import { createSupabaseClientForUser, getSupabaseClient } from "@/lib/supabase"
import { getCreditBalance } from "@/lib/credits"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId obligatorio" }, { status: 400 })
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const authHeader = request.headers.get("authorization") ?? ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : ""

    const supabase = serviceRoleKey
      ? getSupabaseClient()
      : bearer
        ? createSupabaseClientForUser(bearer)
        : null

    if (!supabase) {
      return NextResponse.json(
        { error: "Necesitas iniciar sesión para ver tu saldo." },
        { status: 401 },
      )
    }

    if (!serviceRoleKey) {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        return NextResponse.json(
          { error: "No se pudo validar tu sesión. Vuelve a iniciar sesión." },
          { status: 401 },
        )
      }
      if (authData.user.id !== userId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    }

    const balance = await getCreditBalance(supabase, userId.trim())
    return NextResponse.json({ balance })
  } catch (error) {
    console.error("[credits] GET balance error", error)
    return NextResponse.json(
      { error: "No se pudo obtener el saldo" },
      { status: 500 },
    )
  }
}
