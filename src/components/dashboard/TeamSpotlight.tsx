import type { FC } from "react"
import { formatCompactDate } from "@/lib/formatDate"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type TeamSpotlightProps = {
  upcomingShifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
}

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

const TeamSpotlight: FC<TeamSpotlightProps> = ({
  upcomingShifts,
  shiftTypeLabels,
}) => {
  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-6 text-white shadow-xl shadow-blue-500/10 backdrop-blur">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-slate-900" />
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-600 border-2 border-slate-900" />
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 border-2 border-slate-900" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Equipo conectado
          </p>
        </div>
        <h3 className="text-2xl font-semibold">Coordina a tu escuadrón</h3>
        <p className="text-sm text-white/60">
          Sincroniza horarios, comparte contexto y mantén a todo el equipo alineado incluso desde el móvil.
        </p>
      </header>

      {/* Próximos turnos */}
      <div className="space-y-3">
        {upcomingShifts.length > 0 ? (
          <ul className="space-y-3">
            {upcomingShifts.slice(0, 4).map((shift) => (
              <li
                key={shift.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Próximo turno</p>
                  <p className="font-semibold text-white">
                    {formatCompactDate(new Date(shift.date))}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    color: shift.color ?? typeColor[shift.type],
                    backgroundColor: `${(shift.color ?? typeColor[shift.type])}1a`,
                    borderColor: `${(shift.color ?? typeColor[shift.type])}33`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: shift.color ?? typeColor[shift.type] }}
                  />
                  {shift.label ?? shiftTypeLabels[shift.type] ?? shift.type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/30 px-4 py-5 text-sm text-white/60">
            Cuando agregues turnos, aquí aparecerán los próximos hitos compartidos con tu equipo.
          </p>
        )}
      </div>

      {/* CTA Invitar */}
      <div className="space-y-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
        <p className="font-semibold">Invita a tu equipo</p>
        <p className="mt-1 text-blue-100/80">
          Crea enlaces compartidos, recibe notificaciones y mantén conversaciones rápidas sobre cada turno.
        </p>
        <button className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow hover:from-blue-400 hover:to-indigo-400">
          Invitar ahora
        </button>
      </div>
    </section>
  )
}

export default TeamSpotlight
