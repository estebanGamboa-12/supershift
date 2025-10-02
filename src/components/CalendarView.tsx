'use client'

import {
  Calendar,
  dateFnsLocalizer,
  Event as RBCEvent,
  SlotInfo,
} from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { useEffect, useState } from "react"
import type { ShiftEvent } from "@/types/shifts"

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

export default function CalendarView({
  shifts,
  onSelectEvent,
  onSelectSlot,
  onDeleteEvent,
}: {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onDeleteEvent?: (shift: ShiftEvent) => void
}) {
  const events = shifts.map((s) => ({
    ...s,
    title: s.note ? `${s.type} - ${s.note}` : s.type,
  }))

  const typeColor: Record<ShiftEvent["type"], string> = {
    WORK: "#2563eb",
    REST: "#64748b",
    NIGHT: "#7c3aed",
    VACATION: "#f97316",
    CUSTOM: "#0ea5e9",
  }

  function renderEvent(event: ShiftEvent) {
    const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onDeleteEvent?.(event)
    }

    return (
      <div className="flex items-start justify-between gap-2 text-xs">
        <div className="flex-1">
          <span className="font-semibold tracking-wide">{event.type}</span>
          {event.note && <p className="text-[11px] leading-snug opacity-90">{event.note}</p>}
        </div>
        {onDeleteEvent && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow hover:bg-white/30"
          >
            Borrar
          </button>
        )}
      </div>
    )
  }

  // 📱 Detectar si es móvil para cambiar vista
  const [defaultView, setDefaultView] = useState<"month" | "agenda">("month")

  useEffect(() => {
    if (window.innerWidth < 768) {
      setDefaultView("agenda") // en móvil usamos agenda
    }
  }, [])

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        views={["month", "week", "day", "agenda"]}
        style={{ height: 500 }}
        popup
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
        eventPropGetter={(event: ShiftEvent) => ({
          style: {
            backgroundColor: typeColor[event.type],
            color: "white",
            borderRadius: "10px",
            padding: "6px 8px",
            border: "1px solid rgba(255,255,255,0.25)",
          },
        })}
        components={{
          event: ({ event }) => renderEvent(event as ShiftEvent),
        }}
        onSelectEvent={(event: RBCEvent) => onSelectEvent(event as ShiftEvent)}
        selectable
        onSelectSlot={onSelectSlot}
      />
    </div>
  )
}
