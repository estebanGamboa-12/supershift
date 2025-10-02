"use client"

import {
  Calendar,
  dateFnsLocalizer,
  Event as RBCEvent,
  SlotInfo,
} from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { es } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { useEffect, useMemo, useState } from "react"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import type { ToolbarProps, View } from "react-big-calendar"

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

type CalendarEvent = RBCEvent & { resource: ShiftEvent }

export default function CalendarView({
  shifts,
  onSelectEvent,
  onSelectSlot,
  onDeleteEvent,
  className = "",
}: {
  shifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onDeleteEvent?: (shift: ShiftEvent) => void
  className?: string
}) {
  const events = useMemo<CalendarEvent[]>(
    () =>
      shifts.map((shift) => ({
        title: shift.note ? `${shift.type} - ${shift.note}` : shift.type,
        start: shift.start,
        end: shift.end,
        allDay: true,
        resource: shift,
      })),
    [shifts]
  )

  const typeColor: Record<ShiftType, string> = {
    WORK: "#2563eb",
    REST: "#64748b",
    NIGHT: "#7c3aed",
    VACATION: "#f97316",
    CUSTOM: "#0ea5e9",
  }

  function renderEvent(event: CalendarEvent) {
    const shift = event.resource
    if (!shift) return null

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation()
      onDeleteEvent?.(shift)
    }

    return (
      <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs">
        <div className="flex-1">
          <span className="font-semibold tracking-wide">{shift.type}</span>
          {shift.note && (
            <p className="mt-0.5 text-[10px] leading-snug opacity-90 sm:text-[11px]">
              {shift.note}
            </p>
          )}
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

  const [view, setView] = useState<View>("month")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    setView((current) => {
      if (isMobile && current !== "agenda" && current !== "day") {
        return "agenda"
      }
      if (!isMobile && current === "agenda") {
        return "month"
      }
      return current
    })
  }, [isMobile])

  const availableViews = useMemo<View[]>(
    () => (isMobile ? ["agenda", "day"] : ["month", "week", "day", "agenda"]),
    [isMobile]
  )

  const Toolbar = (toolbarProps: ToolbarProps<CalendarEvent>) => {
    const { label, localizer, onNavigate, onView: changeView } = toolbarProps
    const viewOptions = availableViews

    return (
      <div className="rbc-toolbar flex flex-col gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate("PREV")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            >
              {localizer.messages.previous ?? "Ant."}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("TODAY")}
              className="rounded-full border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {localizer.messages.today ?? "Hoy"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("NEXT")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            >
              {localizer.messages.next ?? "Sig."}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="text-sm font-semibold text-slate-700 sm:text-base">
            {label}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {viewOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setView(option)
                  changeView(option)
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  view === option
                    ? "bg-blue-600 text-white shadow"
                    : "border border-slate-200/70 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {(localizer.messages as Record<string, string>)[option] ?? option}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const containerClassName = [
    "flex h-full w-full flex-col overflow-hidden rounded-none bg-white text-slate-900",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClassName}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor={(event: CalendarEvent) =>
          event.title || event.resource?.type || "Turno"
        }
        view={view}
        onView={(nextView) => setView(nextView)}
        views={availableViews}
        style={{ width: "100%", height: "100%" }}
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
        eventPropGetter={(event: CalendarEvent) => {
          const shift = event.resource
          const backgroundColor = shift ? typeColor[shift.type as ShiftType] : "#2563eb"
          return {
            style: {
              backgroundColor,
              color: "white",
              borderRadius: "10px",
              padding: "6px 8px",
              border: "1px solid rgba(255,255,255,0.25)",
            },
          }
        }}
        components={{
          event: ({ event }) => renderEvent(event as CalendarEvent),
          toolbar: (props) => <Toolbar {...props} />,
        }}
        onSelectEvent={(event: RBCEvent) => {
          const calendarEvent = event as CalendarEvent
          if (calendarEvent.resource) {
            onSelectEvent(calendarEvent.resource)
          }
        }}
        selectable
        onSelectSlot={onSelectSlot}
      />
    </div>
  )
}
