import OnboardingExperience from "@/components/OnboardingExperience"

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

  const userId = sanitizeUserId(resolvedSearchParams.userId)

  return (
    <main className="min-h-screen bg-slate-950 py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <OnboardingExperience userId={userId} />
      </div>
    </main>
  )
}
