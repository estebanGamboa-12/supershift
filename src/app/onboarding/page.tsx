import OnboardingExperience from "@/components/OnboardingExperience"

function toPositiveInteger(value: string | string[] | undefined): number | undefined {
  if (!value) {
    return undefined
  }

  const numericValue = Array.isArray(value) ? Number.parseInt(value[0] ?? "", 10) : Number.parseInt(value, 10)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined
  }

  return numericValue
}

function sanitizeTable(value: string | string[] | undefined): "rotation_templates" | "user_patterns" {
  if (!value) {
    return "rotation_templates"
  }

  const candidate = Array.isArray(value) ? value[0] : value

  return candidate === "user_patterns" ? "user_patterns" : "rotation_templates"
}

function sanitizeUserId(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const candidate = Array.isArray(value) ? value[0] : value
  const trimmed = candidate.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

type OnboardingPageSearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | undefined

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: OnboardingPageSearchParams
}) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as Record<
    string,
    string | string[] | undefined
  >

  const calendarId = toPositiveInteger(resolvedSearchParams.calendarId)
  const initialRepetitions = toPositiveInteger(resolvedSearchParams.repetitions)
  const defaultTable = sanitizeTable(resolvedSearchParams.table)
  const userId = sanitizeUserId(resolvedSearchParams.userId)

  return (
    <main className="min-h-screen bg-slate-950 py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <OnboardingExperience
          calendarId={calendarId}
          userId={userId}
          defaultTable={defaultTable}
          initialRepetitions={initialRepetitions}
        />
      </div>
    </main>
  )
}
