import { redirect } from "next/navigation"

type AuthPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function AuthPage({ searchParams }: AuthPageProps) {
  const params = new URLSearchParams()

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") {
        params.set(key, value)
      } else if (Array.isArray(value)) {
        for (const entry of value) {
          params.append(key, entry)
        }
      }
    }
  }

  const query = params.toString()

  redirect(`/${query ? `?${query}` : ""}`)
}
