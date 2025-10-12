import type { FC } from "react"
import TeamSpotlight from "@/components/dashboard/TeamSpotlight"
import type { ShiftEvent, ShiftType } from "@/types/shifts"

type TeamTabProps = {
  upcomingShifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
}

const TeamTab: FC<TeamTabProps> = ({ upcomingShifts, shiftTypeLabels }) => {
  return (
    <TeamSpotlight
      upcomingShifts={upcomingShifts}
      shiftTypeLabels={shiftTypeLabels}
    />
  )
}

export default TeamTab
