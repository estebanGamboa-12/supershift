"use client"

import type { FC } from "react"
import { useState, useCallback, useEffect } from "react"
import {
  addDays,
  addMonths,
  isAfter,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { MoreVertical, X } from "lucide-react"
import ShiftPlannerLab from "@/components/ShiftPlannerLab"
import PlanLoopLogo from "@/components/PlanLoopLogo"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import type { ShiftTemplate } from "@/types/templates"
import { formatCompactDate } from "@/lib/formatDate"
import MiniCalendar from "@/components/calendar/MiniCalendar"
import DayView from "@/components/calendar/DayView"

export type CalendarSidebarProps = {
  nextShift: ShiftEvent | null
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  orderedShifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
}

type CalendarTabProps = CalendarSidebarProps & {
  plannerDays: ManualRotationDay[]
  onCommitPlanner: (days: ManualRotationDay[]) => Promise<void> | void
  isCommittingPlanner: boolean
  plannerError: string | null
  onSelectEvent: (shift: ShiftEvent) => void
  embedSidebar?: boolean
  onAddShiftForDate?: (date: Date, startTime?: string, endTime?: string) => void
  onUpdateShift?: (shift: ShiftEvent, updates: { startTime?: string; endTime?: string }) => Promise<void>
  calendarView?: "day" | "monthly"
  onCalendarViewChange?: (view: "day" | "monthly") => void
  userId?: string | null
  isLoadingShifts?: boolean
  shiftTemplates?: ShiftTemplate[]
  /** Inicio de semana para el calendario: "monday" | "sunday" */
  startOfWeek?: "monday" | "sunday"
}

/** Skeleton para el área del calendario/día mientras cargan los turnos */
function CalendarDaysSkeleton() {
  return (
    <div
      className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-slate-950/30 p-4"
      aria-busy="true"
      aria-label="Cargando turnos"
    >
      <div className="flex items-center gap-2 pb-3 text-sm text-white/50">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
        <span>Cargando días...</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-lg bg-white/5"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

const upcomingShiftsFromOrdered = (
  orderedShifts: ShiftEvent[],
): ShiftEvent[] => {
  const today = startOfDay(new Date())
  return orderedShifts
    .filter((shift) => {
      const shiftDate = startOfDay(new Date(shift.date))
      return !isAfter(today, shiftDate)
    })
    .slice(0, 5)
}

export const CalendarSidebar: FC<CalendarSidebarProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  onSelectEvent,
}) => {
  const upcomingShifts = upcomingShiftsFromOrdered(orderedShifts)
  return (
    <div className="flex flex-col gap-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
      <NextShiftCard
        nextShift={nextShift ?? undefined}
        daysUntilNextShift={daysUntilNextShift}
        shiftTypeLabels={shiftTypeLabels}
      />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10 lg:rounded-3xl lg:border-white/15 lg:bg-white/[0.06] lg:p-5 lg:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.2)]">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
              Próximos turnos
            </p>
            <p className="mt-1 text-sm text-white/60">
              Un vistazo rápido a los próximos días para reaccionar a tiempo.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {upcomingShifts.length} {upcomingShifts.length === 1 ? "turno" : "turnos"}
          </span>
        </header>
        <ul className="mt-4 space-y-3">
          {upcomingShifts.length > 0 ? (
            upcomingShifts.map((shift) => {
              const typeLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
              const dateLabel = formatCompactDate(new Date(shift.date))
              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(shift)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-white/80 shadow-inner shadow-blue-500/10 transition hover:border-blue-400/40 hover:bg-blue-500/10"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-white/50">{dateLabel}</span>
                      <span className="font-semibold text-white">{typeLabel}</span>
                      <span className="mt-1 text-[11px] text-white/60">
                        {shift.startTime && shift.endTime
                          ? `${shift.startTime} - ${shift.endTime}`
                          : "Todo el día"}
                        {shift.durationMinutes > 0 &&
                          ` • ${Math.floor(shift.durationMinutes / 60)}h ${String(shift.durationMinutes % 60).padStart(2, "0")}m`}
                      </span>
                      {shift.note && <span className="mt-1 text-xs text-white/60">{shift.note}</span>}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition group-hover:border-blue-400/60 group-hover:text-blue-200">
                      Ver
                    </span>
                  </button>
                </li>
              )
            })
          ) : (
            <li>
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/60">
                No hay turnos próximos. ¡Añade uno para empezar!
              </p>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

const CalendarTab: FC<CalendarTabProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  plannerDays,
  onCommitPlanner,
  isCommittingPlanner,
  plannerError,
  onSelectEvent,
  onAddShiftForDate,
  onUpdateShift,
  calendarView = "day",
  userId = null,
  isLoadingShifts = false,
  shiftTemplates = [],
  startOfWeek = "monday",
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // En móvil, sidebar cerrado por defecto; en desktop, abierto.
      setIsSidebarOpen(!mobile)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => subMonths(m, 1))
  }, [])
  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => addMonths(m, 1))
  }, [])
  const handleGoToday = useCallback(() => {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(startOfMonth(today))
  }, [])

  const displayDate = selectedDate ?? new Date()
  const upcomingShifts = upcomingShiftsFromOrdered(orderedShifts)

  return (
    <div className="flex flex-col gap-1 lg:flex-row lg:items-stretch lg:gap-1">
      {/* Botón para abrir sidebar (móviles y desktop) */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          data-tour="sidebar-toggle"
          className={`fixed z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 shadow-lg transition hover:bg-white/20 hover:text-white active:scale-95 ${
            isMobile ? "left-2 top-16" : "left-2 top-4"
          }`}
          aria-label="Abrir menú lateral"
        >
          <MoreVertical size={20} />
        </button>
      )}

      {/* Overlay para cerrar sidebar (solo en móviles) */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Columna izquierda tipo Google Calendar: scroll con calendario + próximos turnos */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={isMobile ? { x: "-100%" } : { x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`${
              isMobile
                ? "fixed left-0 top-0 z-50 h-full w-[280px] shrink-0 border-r border-white/10 bg-slate-950 shadow-2xl"
                : "order-none flex min-h-0 w-[200px] flex-col"
            }`}
          >
            <div className="flex h-full flex-col gap-1 overflow-y-auto py-1 lg:max-h-[calc(100vh-2rem)] lg:pr-1">
              {/* Header del sidebar con logo y botón de cerrar */}
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <PlanLoopLogo size="sm" showText={true} />
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar menú lateral"
                >
                  <X size={18} />
                </button>
              </div>
          {onAddShiftForDate && calendarView !== "day" && (
            <div className="px-1">
              <button
                type="button"
                onClick={() => {
                  onAddShiftForDate(displayDate)
                  if (isMobile) {
                    setIsSidebarOpen(false)
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-400 hover:shadow-sky-400/40"
              >
                <span className="text-base leading-none">+</span>
                Crear Turno
              </button>
            </div>
          )}
          <div className="px-1" data-tour="mini-calendar">
            <MiniCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date)
                if (isMobile) {
                  setIsSidebarOpen(false)
                }
              }}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
              shifts={orderedShifts}
              weekStartsOn={startOfWeek === "sunday" ? 0 : 1}
            />
          </div>
          <div className="mt-1 flex flex-col gap-1 px-1">
            <NextShiftCard
              nextShift={nextShift ?? undefined}
              daysUntilNextShift={daysUntilNextShift}
              shiftTypeLabels={shiftTypeLabels}
            />
            <section className="py-1" data-tour="stats">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[9px] font-semibold uppercase text-white/50">
                  Próximos
                </p>
                <span className="text-[9px] font-semibold text-white/40">
                  {upcomingShifts.length}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {upcomingShifts.length > 0 ? (
                  upcomingShifts.map((shift) => {
                    const typeLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
                    const dateLabel = formatCompactDate(new Date(shift.date))
                    return (
                      <li key={shift.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEvent(shift)
                            // Cerrar sidebar en móviles al seleccionar turno
                            if (isMobile) {
                              setIsSidebarOpen(false)
                            }
                          }}
                          className="group flex w-full items-center justify-between gap-1 rounded bg-white/5 px-1.5 py-1 text-left text-[9px] text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-[8px] text-white/50">{dateLabel}</span>
                            <span className="block font-semibold text-white truncate">{typeLabel}</span>
                            {shift.startTime && shift.endTime && (
                              <span className="mt-0.5 block text-[8px] text-white/40">
                                {shift.startTime} – {shift.endTime}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li>
                    <p className="px-1 py-1 text-center text-[8px] text-white/40">
                      Sin turnos
                    </p>
                  </li>
                )}
              </ul>
            </section>
          </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Área principal: una sola vista (día o plan mensual) */}
      <div className={`order-1 min-w-0 flex-1 transition-all lg:pl-1 ${isSidebarOpen ? 'lg:pl-1' : ''}`}>
        {isLoadingShifts ? (
          <CalendarDaysSkeleton />
        ) : calendarView === "monthly" ? (
          <ShiftPlannerLab
            initialEntries={plannerDays}
            onCommit={onCommitPlanner}
            isCommitting={isCommittingPlanner}
            errorMessage={plannerError}
            userId={userId}
            shiftTemplates={shiftTemplates ?? []}
            startOfWeek={startOfWeek}
          />
        ) : (
          <DayView
            date={displayDate}
            shifts={orderedShifts}
            shiftTypeLabels={shiftTypeLabels}
            onSelectEvent={onSelectEvent}
            onAddSlot={onAddShiftForDate}
            onUpdateShift={onUpdateShift}
            onPrevDay={() => setSelectedDate((prev) => addDays(prev ?? new Date(), -1))}
            onNextDay={() => setSelectedDate((prev) => addDays(prev ?? new Date(), 1))}
            onGoToday={handleGoToday}
          />
        )}
      </div>
    </div>
  )
}

export default CalendarTab
