import { redirect } from "next/navigation"

type RouteParams = Record<string, string | string[] | undefined>

type AuthPageProps = {
  searchParams?: Promise<RouteParams>
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = new URLSearchParams()

  const resolvedParams = searchParams ? await searchParams : undefined

  if (resolvedParams) {
    for (const [key, value] of Object.entries(resolvedParams)) {
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
