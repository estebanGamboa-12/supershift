import type { FC } from "react"
import ConfigurationPanel, {
  type UserPreferences,
} from "@/components/dashboard/ConfigurationPanel"
import type { UserSummary } from "@/types/users"

type SettingsTabProps = {
  user: UserSummary | null
  preferences: UserPreferences
  onSave: (preferences: UserPreferences) => Promise<void> | void
  isSaving: boolean
  lastSavedAt: Date | null
  onLogout: () => void
}

const SettingsTab: FC<SettingsTabProps> = ({
  user,
  preferences,
  onSave,
  isSaving,
  lastSavedAt,
  onLogout,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <ConfigurationPanel
        user={user}
        defaultPreferences={preferences}
        onSave={onSave}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onLogout={onLogout}
      />
    </div>
  )
}

export default SettingsTab
