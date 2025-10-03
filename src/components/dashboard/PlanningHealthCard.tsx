import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
    <article className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-blue-500/10 backdrop-blur">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
          Salud de la planificación
        </p>
        <p className="mt-1 text-sm text-white/60">
          Un vistazo rápido a tus próximos turnos y carga mensual.
        </p>
      </header>

      {/* Datos */}
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/80 p-5 shadow-inner shadow-blue-500/10">
          <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
            {format(new Date(), "MMMM yyyy", { locale: es })}
          </dt>
          <dd className="mt-2 text-3xl font-bold text-white">
            {currentMonthShiftCount}
          </dd>
          <p className="mt-1 text-xs text-white/50">Turnos en este mes</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/80 p-5 shadow-inner shadow-indigo-500/10">
          <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Visión global
          </dt>
          <dd className="mt-2 text-3xl font-bold text-white">
            {totalShiftCount}
          </dd>
          <p className="mt-1 text-xs text-white/50">
            {activeShiftTypes} tipos activos
          </p>
        </div>
      </dl>
    </article>
  )
}

export default PlanningHealthCard
