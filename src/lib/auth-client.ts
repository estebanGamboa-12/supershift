import type { UserSummary } from "@/types/users"

type LoginResponse = {
  user?: UserSummary
  error?: string
}

type PasswordRecoveryResponse = {
  success?: boolean
  recoveryUrl?: string
  error?: string
}

export async function exchangeAccessToken(
  accessToken: string,
): Promise<UserSummary> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  })

  const data = (await response.json().catch(() => null)) as LoginResponse | null

  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? "No se pudo validar la sesión actual")
  }

  return data.user
}

export async function requestPasswordRecovery(payload: {
  email: string
  redirect?: string
}): Promise<{ recoveryUrl: string | null }> {
  const response = await fetch("/api/auth/password-recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | PasswordRecoveryResponse
    | null

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error ?? "No se pudo iniciar el proceso de recuperación",
    )
  }

  const recoveryUrl =
    typeof data.recoveryUrl === "string" && data.recoveryUrl.length > 0
      ? data.recoveryUrl
      : null

  return { recoveryUrl }
}
