import type { FC } from "react"
import { format } from "date-fns"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type NextShiftCardProps = {
  nextShift?: ShiftEvent
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
}

const NextShiftCard: FC<NextShiftCardProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
}) => {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-blue-500/10">
      <div
        className="absolute inset-0 -z-10 opacity-30 blur-2xl transition duration-500 group-hover:opacity-60"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(59,130,246,0.6), transparent 60%)",
        }}
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">Próximo turno</p>
      {nextShift ? (
        <div className="mt-4 space-y-3">
          <p className="text-3xl font-semibold">
            {format(new Date(nextShift.date), "dd MMMM yyyy")}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
              {shiftTypeLabels[nextShift.type] ?? nextShift.type}
            </span>
            {daysUntilNextShift !== null && (
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                {daysUntilNextShift === 0
                  ? "Sucede hoy"
                  : `En ${daysUntilNextShift} día${daysUntilNextShift === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
          {nextShift.note && (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {nextShift.note}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/60">
          No hay turnos programados todavía. Añade uno para empezar a planificar tu rotación.
        </p>
      )}
    </article>
  )
}

export default NextShiftCard
