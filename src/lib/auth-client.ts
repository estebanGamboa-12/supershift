import type { UserSummary } from "@/types/users"

type LoginResponse = {
  user?: UserSummary
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
