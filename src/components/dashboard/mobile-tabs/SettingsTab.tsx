import type { FC } from "react"
import ShiftPlannerLab from "@/components/ShiftPlannerLab"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"

type SettingsTabProps = {
  plannerDays: ManualRotationDay[]
  onCommit: (days: ManualRotationDay[]) => Promise<void> | void
  isCommitting: boolean
  errorMessage: string | null
}

const SettingsTab: FC<SettingsTabProps> = ({
  plannerDays,
  onCommit,
  isCommitting,
  errorMessage,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <ShiftPlannerLab
        initialEntries={plannerDays}
        onCommit={onCommit}
        isCommitting={isCommitting}
        errorMessage={errorMessage}
      />
    </div>
  )
}

export default SettingsTab
