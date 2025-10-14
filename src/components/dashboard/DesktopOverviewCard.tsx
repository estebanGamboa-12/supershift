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
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-8 text-white shadow-[0_45px_120px_-45px_rgba(37,99,235,0.65)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 -left-16 h-64 w-64 rounded-full bg-blue-500/40 blur-3xl" />
        <div className="absolute -bottom-36 -right-20 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl" />
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-200/80">
            Resumen diario
          </p>
          <h2 className="text-3xl font-bold sm:text-4xl">Hola, {greeting}</h2>
          <p className="text-sm text-white/70">
            Mantén el control de tus turnos con una vista clara pensada para pantallas grandes.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-blue-500/10">
            <dt className="text-[11px] uppercase tracking-wide text-white/60">
              Este mes
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-white">
              {currentMonthShiftCount}
            </dd>
            <p className="mt-1 text-xs text-white/50">Turnos programados</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-indigo-500/10">
            <dt className="text-[11px] uppercase tracking-wide text-white/60">
              Próximo turno
            </dt>
            <dd className="mt-2 text-lg font-semibold text-white">
              {nextShift
                ? format(new Date(nextShift.date), "d MMM", { locale: es })
                : "Pendiente"}
            </dd>
            <p className="mt-1 text-xs text-white/50">
              {nextShift
                ? `${nextShift.label ?? shiftTypeLabels[nextShift.type] ?? nextShift.type} · ${nextShiftCountdownLabel}`
                : "Añade un turno para comenzar"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-purple-500/10">
            <dt className="text-[11px] uppercase tracking-wide text-white/60">
              Equipo activo
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-white">
              {teamSize}
            </dd>
            <p className="mt-1 text-xs text-white/50">
              {activeShiftTypes} tipos en uso
            </p>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default DesktopOverviewCard
