const FALLBACK_REDIRECT = "/"

export function getSiteUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL

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

export function buildRecoveryCallbackUrl(options?: {
  redirect?: string | null
}): string {
  const redirectTarget = sanitizeRedirectPath(options?.redirect)
  const params = new URLSearchParams({ type: "recovery" })

  if (redirectTarget && redirectTarget !== "/") {
    params.set("redirect", redirectTarget)
  }

  const updatePasswordPath =
    params.toString().length > 0
      ? `/reset-password?${params.toString()}`
      : "/reset-password"

  return buildAuthCallbackUrl({ redirect: updatePasswordPath })
}

export function resolveRedirectPath(value: unknown): string {
  return sanitizeRedirectPath(value) ?? FALLBACK_REDIRECT
}
