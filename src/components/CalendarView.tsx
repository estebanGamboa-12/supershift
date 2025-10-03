'use client'

import { Calendar, dateFnsLocalizer, Event as RBCEvent } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { useEffect, useState } from "react"
import type { Shift } from "@/types/shifts"

type ShiftEvent = Shift & {
  start: Date
  end: Date
}

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
}: {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}) {
  const events = shifts.map((s) => ({
    ...s,
    title: s.note ? `${s.type} - ${s.note}` : s.type,
  }))

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
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
        eventPropGetter={(event: ShiftEvent) => {
          let bg = "blue"
          if (event.type === "WORK") bg = "green"
          if (event.type === "REST") bg = "gray"
          if (event.type === "NIGHT") bg = "purple"
          if (event.type === "VACATION") bg = "orange"
          return { style: { backgroundColor: bg, color: "white", borderRadius: "6px", padding: "2px 4px" } }
        }}
        onSelectEvent={(event: RBCEvent) => onSelectEvent(event as ShiftEvent)}
      />
    </div>
  )
}
