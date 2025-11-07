import Link from "next/link"
import CustomCycleBuilder from "@/components/CustomCycleBuilder"

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

type BuilderPageSearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | undefined

export default async function CustomCycleBuilderPage({
  searchParams,
}: {
  searchParams: BuilderPageSearchParams
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
        <header className="mb-10 space-y-4 text-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Configura tu ciclo personalizado
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-white/70">
              Ajusta el número de días, los tipos de turno y guarda el resultado directamente en Supabase.
              Puedes pasar parámetros por URL para precargar el calendario (calendarId), el usuario (userId) o la tabla de destino.
            </p>
          </div>
          <div className="flex justify-center">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-sky-400/40 hover:text-white"
            >
              Explorar plantillas
            </Link>
          </div>
        </header>

        <CustomCycleBuilder
          calendarId={calendarId}
          userId={userId}
          defaultTable={defaultTable}
          initialRepetitions={initialRepetitions}
        />
      </div>
    </main>
  )
}
