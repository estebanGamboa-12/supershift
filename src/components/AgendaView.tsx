"use client"

import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const typeColor: Record<ShiftType, string> = {
  WORK: "border-blue-400/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/25",
  REST: "border-white/20 bg-white/10 text-white/80 hover:bg-white/20",
  NIGHT: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
  VACATION: "border-orange-400/40 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25",
  CUSTOM: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
}

type Props = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}

export default function AgendaView({ shifts, onSelectEvent }: Props) {
  return (
    <div className="space-y-3">
      {shifts.map((shift) => {
        const isCurrDay = isToday(shift.start)
        return (
          <div
            key={shift.id}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white/80"
          >
            <span className={`font-semibold ${isCurrDay ? "text-blue-300" : "text-white"}`}>
              {format(shift.start, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSelectEvent(shift)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${typeColor[shift.type]}`}
              >
                {shift.type}
              </button>
              {shift.note && <span className="text-xs text-white/60">{shift.note}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
