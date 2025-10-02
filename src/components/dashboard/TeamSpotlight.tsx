import type { FC } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type TeamSpotlightProps = {
  upcomingShifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
}

const TeamSpotlight: FC<TeamSpotlightProps> = ({
  upcomingShifts,
  shiftTypeLabels,
}) => {
  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl shadow-blue-500/10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Equipo conectado</p>
        <h3 className="text-2xl font-semibold">Coordina a tu escuadrón</h3>
        <p className="text-sm text-white/60">
          Sincroniza horarios, comparte contexto y mantén a todo el equipo alineado incluso desde el móvil.
        </p>
      </header>

      <div className="space-y-3">
        {upcomingShifts.length > 0 ? (
          <ul className="space-y-3">
            {upcomingShifts.slice(0, 4).map((shift) => (
              <li
                key={shift.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white/80"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Próximo turno</p>
                  <p className="font-semibold text-white">
                    {format(new Date(shift.date), "EEEE d MMMM", { locale: es })}
                  </p>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  {shiftTypeLabels[shift.type] ?? shift.type}
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

      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
        <p className="font-semibold">Invita a tu equipo</p>
        <p className="mt-1 text-blue-100/80">
          Crea enlaces compartidos, recibe notificaciones y mantén conversaciones rápidas sobre cada turno.
        </p>
      </div>
    </section>
  )
}

export default TeamSpotlight
