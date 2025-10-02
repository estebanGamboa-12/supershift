"use client"

import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import { motion } from "framer-motion"

const typeColor: Record<ShiftType, string> = {
  WORK: "bg-blue-100 text-blue-700 border-blue-300",
  REST: "bg-slate-100 text-slate-600 border-slate-300",
  NIGHT: "bg-violet-100 text-violet-700 border-violet-300",
  VACATION: "bg-orange-100 text-orange-700 border-orange-300",
  CUSTOM: "bg-sky-100 text-sky-700 border-sky-300",
}

type Props = {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}

export default function AgendaView({ shifts, onSelectEvent }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="divide-y divide-slate-200 bg-white text-slate-900"
    >
      {shifts.map((shift) => {
        const isCurrDay = isToday(shift.start)
        return (
          <motion.div
            key={shift.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="p-3 flex flex-col gap-1"
          >
            <span className={`text-sm font-semibold ${isCurrDay ? "text-blue-600" : "text-slate-700"}`}>
              {format(shift.start, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            <button
              onClick={() => onSelectEvent(shift)}
              className={`px-2 py-1 text-xs rounded border ${typeColor[shift.type]} w-max`}
            >
              {shift.type} {shift.note && `- ${shift.note}`}
            </button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
