import type { FC } from "react"
import CalendarView from "@/components/CalendarView"
import NextShiftCard from "@/components/dashboard/NextShiftCard"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type CalendarTabProps = {
  nextShift: ShiftEvent | null
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  orderedShifts: ShiftEvent[]
  onSelectEvent: (shift: ShiftEvent) => void
  onSelectSlot: (slot: { start: Date }) => void
}

const CalendarTab: FC<CalendarTabProps> = ({
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  orderedShifts,
  onSelectEvent,
  onSelectSlot,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <NextShiftCard
        nextShift={nextShift ?? undefined}
        daysUntilNextShift={daysUntilNextShift}
        shiftTypeLabels={shiftTypeLabels}
      />
      <CalendarView
        shifts={orderedShifts}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
      />
    </div>
  )
}

export default CalendarTab
