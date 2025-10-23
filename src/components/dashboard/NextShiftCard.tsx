import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
  const fallbackColors: Record<ShiftType, string> = {
    WORK: "#2563eb",
    REST: "#64748b",
    NIGHT: "#7c3aed",
    VACATION: "#f97316",
    CUSTOM: "#0ea5e9",
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-blue-500/10 backdrop-blur">
      {/* Glow de fondo */}
      <div
        className="absolute inset-0 -z-10 opacity-40 blur-2xl transition duration-500 group-hover:opacity-70"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(59,130,246,0.5), transparent 70%)",
        }}
        aria-hidden
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
        Próximo turno
      </p>

      {nextShift ? (
        <div className="mt-4 space-y-4">
          {/* Fecha */}
          <p className="text-3xl font-bold text-white">
            {format(new Date(nextShift.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>

          {/* Etiquetas */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{
                color: nextShift.color ?? fallbackColors[nextShift.type],
                backgroundColor: `${(nextShift.color ?? fallbackColors[nextShift.type])}1a`,
                border: `1px solid ${(nextShift.color ?? fallbackColors[nextShift.type])}33`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: nextShift.color ?? fallbackColors[nextShift.type] }}
                aria-hidden
              />
              {nextShift.label ?? shiftTypeLabels[nextShift.type] ?? nextShift.type}
            </span>

            {daysUntilNextShift !== null && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                {daysUntilNextShift === 0
                  ? "Hoy"
                  : `En ${daysUntilNextShift} día${daysUntilNextShift === 1 ? "" : "s"}`}
              </span>
            )}

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {nextShift.startTime && nextShift.endTime
                ? `${nextShift.startTime} - ${nextShift.endTime}`
                : "Todo el día"}
            </span>
          </div>

          {nextShift.durationMinutes > 0 && (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span aria-hidden>⏱️</span>
              {`${Math.floor(nextShift.durationMinutes / 60)}h ${String(nextShift.durationMinutes % 60).padStart(2, "0")}m`}
            </div>
          )}

          {/* Nota */}
          {nextShift.note && (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-inner shadow-amber-500/20">
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
