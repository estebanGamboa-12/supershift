import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let serverClient: SupabaseClient | null = null
let browserClient: SupabaseClient | null = null

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      "Supabase URL no configurada. Define SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL",
    )
  }
  return url
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      "Supabase anon key no configurada. Define NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY",
    )
  }

  return key
}

function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null
}

export function getSupabaseClient(): SupabaseClient {
  if (!serverClient) {
    const serviceRoleKey = getSupabaseServiceRoleKey()
    const key = serviceRoleKey ?? getSupabaseAnonKey()
    serverClient = createClient(getSupabaseUrl(), key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return serverClient
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "getSupabaseBrowserClient solo puede usarse en el entorno del navegador",
    )
  }

  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}
