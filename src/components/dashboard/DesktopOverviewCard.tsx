import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type DesktopOverviewCardProps = {
  greeting: string
  currentMonthShiftCount: number
  nextShift?: ShiftEvent
  nextShiftCountdownLabel: string
  activeShiftTypes: number
  teamSize: number
  shiftTypeLabels: Record<ShiftType, string>
}

const DesktopOverviewCard: FC<DesktopOverviewCardProps> = ({
  greeting,
  currentMonthShiftCount,
  nextShift,
  nextShiftCountdownLabel,
  activeShiftTypes,
  teamSize,
  shiftTypeLabels,
}) => {
  return (
    <section className="surface-card relative overflow-hidden px-8 py-8 text-brand-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 -left-16 h-64 w-64 rounded-full bg-brand-primary/35 blur-3xl" />
        <div className="absolute -bottom-36 -right-20 h-72 w-72 rounded-full bg-brand-accent/40 blur-3xl" />
        <div className="absolute inset-y-1/3 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-2xl" />
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-accent/80">
            Resumen diario
          </p>
          <h2 className="text-3xl font-bold text-brand-text sm:text-4xl">Hola, {greeting}</h2>
          <p className="text-sm text-brand-muted">
            Mantén el control de tus turnos con una vista clara pensada para pantallas grandes.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="surface-card--muted px-5 py-4">
            <dt className="text-[11px] uppercase tracking-wide text-brand-muted/80">
              Este mes
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-brand-text">
              {currentMonthShiftCount}
            </dd>
            <p className="mt-1 text-xs text-brand-muted/90">Turnos programados</p>
          </div>

          <div className="surface-card--muted px-5 py-4">
            <dt className="text-[11px] uppercase tracking-wide text-brand-muted/80">
              Próximo turno
            </dt>
            <dd className="mt-2 text-lg font-semibold text-brand-text">
              {nextShift
                ? format(new Date(nextShift.date), "d MMM", { locale: es })
                : "Pendiente"}
            </dd>
            <p className="mt-1 text-xs text-brand-muted/90">
              {nextShift
                ? `${nextShift.label ?? shiftTypeLabels[nextShift.type] ?? nextShift.type} · ${nextShiftCountdownLabel}`
                : "Añade un turno para comenzar"}
            </p>
          </div>

          <div className="surface-card--muted px-5 py-4">
            <dt className="text-[11px] uppercase tracking-wide text-brand-muted/80">
              Equipo activo
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-brand-text">
              {teamSize}
            </dd>
            <p className="mt-1 text-xs text-brand-muted/90">
              {activeShiftTypes} tipos en uso
            </p>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default DesktopOverviewCard
