import type { FC } from "react"
import { format } from "date-fns"

type PlanningHealthCardProps = {
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
}

const PlanningHealthCard: FC<PlanningHealthCardProps> = ({
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
}) => {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Salud de la planificación
        </p>
        <p className="mt-2 text-sm text-white/60">
          Un vistazo rápido a tus próximos turnos y carga mensual.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-xs uppercase tracking-wide text-white/50">
            {format(new Date(), "MMMM yyyy")}
          </dt>
          <dd className="mt-2 text-2xl font-semibold">{currentMonthShiftCount}</dd>
          <p className="mt-1 text-xs text-white/50">Turnos en este mes</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-xs uppercase tracking-wide text-white/50">Visión global</dt>
          <dd className="mt-2 text-2xl font-semibold">{totalShiftCount}</dd>
          <p className="mt-1 text-xs text-white/50">{activeShiftTypes} tipos activos</p>
        </div>
      </dl>
    </article>
  )
}

export default PlanningHealthCard
