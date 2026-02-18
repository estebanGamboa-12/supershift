import type { UserSummary } from "@/types/users"

type LoginResponse = {
  user?: UserSummary
  error?: string
}

export async function exchangeAccessToken(
  accessToken: string,
): Promise<UserSummary> {
  let response: Response
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    })
  } catch (err) {
    const message =
      err instanceof TypeError && (err as Error).message === "Failed to fetch"
        ? "No se pudo conectar con el servidor. Comprueba tu conexión."
        : err instanceof Error
          ? err.message
          : "Error de red"
    throw new Error(message)
  }

  const data = (await response.json().catch(() => null)) as LoginResponse | null

  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? "No se pudo validar la sesión actual")
  }

  return data.user
}
