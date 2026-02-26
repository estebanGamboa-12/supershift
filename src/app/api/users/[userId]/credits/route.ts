import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { getCreditBalance } from "@/lib/credits"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId obligatorio" }, { status: 400 })
  }

  try {
    const supabase = getSupabaseClient()
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
