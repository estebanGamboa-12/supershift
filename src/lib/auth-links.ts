const FALLBACK_REDIRECT = "/"

export function getSiteUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://www.planloop.app"

  if (!siteUrl) {
    throw new Error(
      "Configura NEXT_PUBLIC_SITE_URL (o SITE_URL) para generar enlaces de autenticación.",
    )
  }

  return siteUrl.replace(/\/$/, "")
}

export function sanitizeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null
  }

  return trimmed
}

function buildRedirectQuery(redirect?: string | null): string {
  if (!redirect || redirect === "/") {
    return ""
  }

  return `?redirect=${encodeURIComponent(redirect)}`
}

export function buildAuthCallbackUrl(options?: { redirect?: string | null }): string {
  const siteUrl = getSiteUrl()
  const redirect = sanitizeRedirectPath(options?.redirect)
  const query = buildRedirectQuery(redirect)
  return `${siteUrl}/auth/callback${query}`
}

export function buildUpdatePasswordUrl(options?: { redirect?: string | null }): string {
  const siteUrl = getSiteUrl()
  const redirect = sanitizeRedirectPath(options?.redirect)
  const query = buildRedirectQuery(redirect)
  return `${siteUrl}/reset-password${query}`
}

// URL sin query para que Supabase la acepte en Redirect URLs sin problemas.
// El callback detecta type=recovery por el hash/query que añade Supabase y redirige a /reset-password.
export function buildRecoveryCallbackUrl(_options?: {
  redirect?: string | null
}): string {
  const siteUrl = getSiteUrl()
  return `${siteUrl}/auth/callback`
}

export function resolveRedirectPath(value: unknown): string {
  return sanitizeRedirectPath(value) ?? FALLBACK_REDIRECT
}
