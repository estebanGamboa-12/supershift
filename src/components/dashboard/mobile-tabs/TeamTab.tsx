"use client"

import type { FC } from "react"
import TeamSpotlight from "@/components/dashboard/TeamSpotlight"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import type { UserSummary } from "@/types/users"

type TeamTabProps = {
  upcomingShifts: ShiftEvent[]
  shiftTypeLabels: Record<ShiftType, string>
  currentUser: UserSummary | null
}

const TeamTab: FC<TeamTabProps> = ({
  upcomingShifts,
  shiftTypeLabels,
  currentUser,
}) => {
  return (
    <TeamSpotlight
      upcomingShifts={upcomingShifts}
      shiftTypeLabels={shiftTypeLabels}
      currentUser={currentUser}
    />
  )
}

export default TeamTab
