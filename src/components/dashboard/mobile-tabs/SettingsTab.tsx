import type { FC } from "react"
import ConfigurationPanel from "@/components/dashboard/ConfigurationPanel"
import type { UserPreferences } from "@/types/preferences"
import type { UserSummary } from "@/types/users"

type SettingsTabProps = {
  user: UserSummary | null
  preferences: UserPreferences
  onSave: (preferences: UserPreferences) => Promise<void> | void
  onUpdateProfile: (payload: {
    name: string
    timezone: string
    avatarUrl: string | null
  }) => Promise<unknown> | unknown
  isSaving: boolean
  lastSavedAt: Date | null
  onLogout: () => void
}

const SettingsTab: FC<SettingsTabProps> = ({
  user,
  preferences,
  onSave,
  onUpdateProfile,
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
        onUpdateProfile={onUpdateProfile}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onLogout={onLogout}
      />
    </div>
  )
}

export default SettingsTab
