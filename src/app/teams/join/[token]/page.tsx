import JoinTeamClient from "./JoinTeamClient"

type RouteParams = Record<string, string | string[] | undefined>

type JoinPageProps = {
  params: Promise<RouteParams>
}

function sanitizeToken(value: unknown): string {
  if (Array.isArray(value)) {
    return sanitizeToken(value[0])
  }

  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export default async function JoinTeamPage({ params }: JoinPageProps) {
  const resolvedParams = await params
  const token = sanitizeToken(resolvedParams.token)

  return <JoinTeamClient token={token} />
}
