'use client'

import { useEffect, useMemo, useState } from "react"
import {
    addDays,
    addMonths,
    addWeeks,
    eachDayOfInterval,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

const WEEK_STARTS_ON = 1

export type CalendarViewType = "month" | "week" | "day" | "agenda"

export type CalendarSlot = {
    start: Date
    end: Date
}

export default function CalendarView({
    shifts,
    onSelectEvent,
    onSelectSlot,
    onDeleteEvent,
    className = "",
}: {
    shifts: ShiftEvent[]
    onSelectEvent: (shift: ShiftEvent) => void
    onSelectSlot?: (slotInfo: CalendarSlot) => void
    onDeleteEvent?: (shift: ShiftEvent) => void
    className?: string
}) {
    const [view, setView] = useState<CalendarViewType>("month")
    const [currentDate, setCurrentDate] = useState(() => new Date())
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const availableViews = useMemo<CalendarViewType[]>(
        () => (isMobile ? ["agenda", "day"] : ["month", "week", "day", "agenda"]),
        [isMobile],
    )

    useEffect(() => {
        if (!availableViews.includes(view)) {
            setView(availableViews[0])
        }
    }, [availableViews, view])

    const sortedShifts = useMemo(
        () => [...shifts].sort((a, b) => a.start.getTime() - b.start.getTime()),
        [shifts],
    )

    const eventsByDate = useMemo(() => {
        const map = new Map<string, ShiftEvent[]>()
        sortedShifts.forEach((shift) => {
            const key = format(shift.start, "yyyy-MM-dd")
            const existing = map.get(key)
            if (existing) {
                existing.push(shift)
            } else {
                map.set(key, [shift])
            }
        })
        return map
    }, [sortedShifts])

    const typeColor: Record<ShiftType, string> = {
        WORK: "#2563eb",
        REST: "#64748b",
        NIGHT: "#7c3aed",
        VACATION: "#f97316",
        CUSTOM: "#0ea5e9",
    }

    const weekDayNames = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON })
        return eachDayOfInterval({ start, end: addDays(start, 6) }).map((day) =>
            format(day, "EEE", { locale: es }).toUpperCase(),
        )
    }, [currentDate])

    const monthMatrix = useMemo(() => {
        if (view !== "month") return []
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: WEEK_STARTS_ON })
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: WEEK_STARTS_ON })
        const days = eachDayOfInterval({ start, end })
        const weeks: Date[][] = []
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7))
        }
        return weeks
    }, [currentDate, view])

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON })
        return eachDayOfInterval({ start, end: addDays(start, 6) })
    }, [currentDate])

    const handleDaySelection = (date: Date) => {
        onSelectSlot?.({ start: startOfDay(date), end: endOfDay(date) })
    }

    const handleNavigate = (action: "PREV" | "NEXT" | "TODAY") => {
        if (action === "TODAY") {
            setCurrentDate(startOfDay(new Date()))
            return
        }

        const direction = action === "NEXT" ? 1 : -1
        setCurrentDate((current) => {
            switch (view) {
                case "month":
                    return addMonths(current, direction)
                case "week":
                case "agenda":
                    return addWeeks(current, direction)
                case "day":
                default:
                    return addDays(current, direction)
            }
        })
    }

    const viewLabel = useMemo(() => {
        switch (view) {
            case "month":
                return format(currentDate, "MMMM yyyy", { locale: es })
            case "week": {
                const start = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON })
                const end = endOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON })
                return `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`
            }
            case "day":
                return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })
            case "agenda":
                return `Agenda desde ${format(currentDate, "d MMM yyyy", { locale: es })}`
            default:
                return ""
        }
    }, [currentDate, view])

    const renderEvent = (shift: ShiftEvent, variant: "compact" | "full" = "compact") => {
        const backgroundColor = typeColor[shift.type as ShiftType] ?? "#2563eb"
        const baseClasses =
            variant === "compact"
                ? "group relative flex flex-col gap-1 rounded-xl border border-white/10 px-2 py-2 text-left text-[11px] leading-tight text-white shadow-sm"
                : "group relative flex flex-col gap-2 rounded-2xl border border-white/10 px-3 py-3 text-left text-sm leading-snug text-white shadow-md"

        return (
            <div
                key={shift.id}
                className={`${baseClasses} transition hover:shadow-lg`}
                style={{ backgroundColor }}
                onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(shift)
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
                            {shift.type}
                        </p>
                        {shift.note && (
                            <p className="mt-1 text-[10px] leading-tight text-white/90 sm:text-xs">
                                {shift.note}
                            </p>
                        )}
                    </div>
                    {onDeleteEvent && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDeleteEvent(shift)
                            }}
                            className="rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/40"
                        >
                            Borrar
                        </button>
                    )}
                </div>
                <p className="text-[10px] uppercase tracking-wide text-white/80">
                    {format(shift.start, "dd MMM yyyy", { locale: es })}
                </p>
            </div>
        )
    }

    const containerClassName = [
        "flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 text-slate-900 shadow-xl ring-1 ring-black/5 backdrop-blur",
        className,
    ]
        .filter(Boolean)
        .join(" ")

    return (
        <div className={containerClassName}>
            <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                    <div className="inline-flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleNavigate("PREV")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                        >
                            Ant.
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNavigate("TODAY")}
                            className="rounded-full border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNavigate("NEXT")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                        >
                            Sig.
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-sm font-semibold text-slate-700 sm:text-base">{viewLabel}</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {availableViews.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setView(option)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                                    view === option
                                        ? "bg-blue-600 text-white shadow"
                                        : "border border-slate-200/70 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                }`}
                            >
                                {option === "month"
                                    ? "Mes"
                                    : option === "week"
                                    ? "Semana"
                                    : option === "day"
                                    ? "Día"
                                    : "Agenda"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100/30 p-4">
                {view === "month" && (
                    <div className="flex h-full flex-col">
                        <div className="grid grid-cols-7 gap-px rounded-t-2xl border border-slate-200/70 bg-slate-200/60 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {weekDayNames.map((name) => (
                                <div key={name} className="bg-white/60 px-2 py-2">
                                    {name}
                                </div>
                            ))}
                        </div>
                        <div className="grid flex-1 grid-cols-7 gap-px rounded-b-2xl border border-t-0 border-slate-200/70 bg-slate-200/60">
                            {monthMatrix.map((week, weekIndex) => (
                                <div key={weekIndex} className="contents">
                                    {week.map((day) => {
                                        const key = format(day, "yyyy-MM-dd")
                                        const dayEvents = eventsByDate.get(key) ?? []
                                        const isCurrentMonth = isSameMonth(day, currentDate)
                                        const isToday = isSameDay(day, startOfDay(new Date()))

                                        const cellClasses = [
                                            "flex min-h-[7.5rem] flex-col gap-2 bg-white/80 p-3 transition",
                                            isCurrentMonth
                                                ? "text-slate-900 hover:bg-blue-50/80"
                                                : "text-slate-400 hover:bg-slate-100/80",
                                            "cursor-pointer",
                                            isToday ? "ring-2 ring-inset ring-blue-500" : "border border-white/40",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")

                                        return (
                                            <div
                                                key={key}
                                                className={cellClasses}
                                                onClick={() => {
                                                    setCurrentDate(day)
                                                    handleDaySelection(day)
                                                }}
                                            >
                                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                                                    <span>{format(day, "d")}</span>
                                                    {!isCurrentMonth && (
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                                                            {format(day, "MMM", { locale: es })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {dayEvents.map((shift) => renderEvent(shift))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === "week" && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
                        {weekDays.map((day) => {
                            const key = format(day, "yyyy-MM-dd")
                            const dayEvents = eventsByDate.get(key) ?? []
                            const isToday = isSameDay(day, startOfDay(new Date()))

                            return (
                                <div
                                    key={key}
                                    className={`flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm transition hover:bg-blue-50/60 ${
                                        isToday ? "ring-2 ring-blue-500" : ""
                                    }`}
                                    onClick={() => handleDaySelection(day)}
                                >
                                    <div className="flex items-baseline justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                {format(day, "EEEE", { locale: es })}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">
                                                {format(day, "d")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {dayEvents.length === 0 && (
                                            <p className="text-xs text-slate-500">Sin turnos</p>
                                        )}
                                        {dayEvents.map((shift) => renderEvent(shift, "full"))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {view === "day" && (() => {
                    const key = format(currentDate, "yyyy-MM-dd")
                    const dayEvents = eventsByDate.get(key) ?? []

                    return (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                                </h3>
                                <p className="text-2xl font-bold text-slate-900">
                                    {format(currentDate, "yyyy")}
                                </p>
                            </div>
                            <div className="space-y-3">
                                {dayEvents.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
                                        No hay turnos programados para este día.
                                    </p>
                                )}
                                {dayEvents.map((shift) => renderEvent(shift, "full"))}
                            </div>
                        </div>
                    )
                })()}

                {view === "agenda" && (() => {
                    const upcoming = sortedShifts.filter(
                        (shift) => startOfDay(shift.start).getTime() >= startOfDay(currentDate).getTime(),
                    )

                    return (
                        <div className="space-y-3">
                            {upcoming.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
                                    No hay turnos próximos en la agenda.
                                </p>
                            )}
                            {upcoming.map((shift) => (
                                <div
                                    key={shift.id}
                                    className="rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:bg-blue-50/70"
                                    onClick={() => onSelectEvent(shift)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {format(shift.start, "EEEE d 'de' MMMM", { locale: es })}
                                            </p>
                                            <p className="text-lg font-semibold text-slate-900">{shift.type}</p>
                                            {shift.note && (
                                                <p className="mt-1 text-sm text-slate-600">{shift.note}</p>
                                            )}
                                        </div>
                                        <span
                                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                                            style={{ backgroundColor: typeColor[shift.type as ShiftType] ?? "#2563eb" }}
                                        >
                                            {shift.type}
                                        </span>
                                    </div>
                                    {onDeleteEvent && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteEvent(shift)
                                            }}
                                            className="mt-3 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
                                        >
                                            Borrar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
