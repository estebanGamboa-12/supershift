import type { UserSummary } from "@/types/users"

type LoginResponse = {
  user?: UserSummary
  error?: string
}

const LOGIN_TIMEOUT_MS = 20000

export async function exchangeAccessToken(
  accessToken: string,
): Promise<UserSummary> {
  let response: Response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    const isAbort = err instanceof Error && err.name === "AbortError"
    const message = isAbort
      ? "La validación tardó demasiado. Prueba a ir al inicio; si ya iniciaste sesión, deberías estar dentro."
      : err instanceof TypeError && (err as Error).message === "Failed to fetch"
        ? "No se pudo conectar con el servidor. Comprueba tu conexión."
        : err instanceof Error
          ? err.message
          : "Error de red"
    throw new Error(message)
  }
  clearTimeout(timeoutId)

  const data = (await response.json().catch(() => null)) as LoginResponse | null

  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? "No se pudo validar la sesión actual")
  }

  return data.user
}
