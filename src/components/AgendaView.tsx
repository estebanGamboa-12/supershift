"use client"

import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const typeColor: Record<ShiftType, string> = {
  WORK: "#2563eb",
  REST: "#64748b",
  NIGHT: "#7c3aed",
  VACATION: "#f97316",
  CUSTOM: "#0ea5e9",
}

function resolveColor(shift: ShiftEvent) {
  return shift.color ?? typeColor[shift.type]
}

function resolveLabel(shift: ShiftEvent) {
  const labels: Record<ShiftType, string> = {
    WORK: "Trabajo",
    REST: "Descanso",
    NIGHT: "Nocturno",
    VACATION: "Vacaciones",
    CUSTOM: "Personalizado",
  }
  return shift.label ?? labels[shift.type]
}

type Props = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}

export default function AgendaView({ shifts, onSelectEvent }: Props) {
  return (
    <div className="space-y-4">
      {shifts.map((shift) => {
        const isCurrDay = isToday(shift.start)
        return (
          <div
            key={shift.id}
            className={`rounded-2xl border p-4 transition shadow-md backdrop-blur-sm ${
              isCurrDay
                ? "border-blue-400/50 bg-blue-500/10 shadow-blue-500/20"
                : "border-white/10 bg-slate-900/60"
            }`}
          >
            {/* Fecha */}
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${isCurrDay ? "text-blue-300" : "text-white"}`}>
                {format(shift.start, "d", { locale: es })}
              </span>
              <span className="text-sm uppercase tracking-wide text-white/60">
                {format(shift.start, "EEEE, MMMM", { locale: es })}
              </span>
            </div>

            {/* Evento */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSelectEvent(shift)}
                className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm transition hover:scale-[1.03]"
                style={{
                  color: resolveColor(shift),
                  borderColor: `${resolveColor(shift)}66`,
                  backgroundColor: `${resolveColor(shift)}1a`,
                }}
              >
                {resolveLabel(shift)}
              </button>
              {shift.note && (
                <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/70">
                  {shift.note}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
