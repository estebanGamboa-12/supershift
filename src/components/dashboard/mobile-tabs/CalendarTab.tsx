import type { FC } from "react"
import ShiftPlannerLab from "@/components/ShiftPlannerLab"
import type { ManualRotationDay } from "@/components/ManualRotationBuilder"

type CalendarTabProps = {
  plannerDays: ManualRotationDay[]
  onCommit: (days: ManualRotationDay[]) => Promise<void> | void
  isCommitting: boolean
  errorMessage: string | null
}

const CalendarTab: FC<CalendarTabProps> = ({
  plannerDays,
  onCommit,
  isCommitting,
  errorMessage,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-blue-500/10">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/60">
            Configuración rápida
          </p>
          <h2 className="text-2xl font-bold text-white">
            Diseña tu rotación móvil
          </h2>
          <p className="text-sm text-white/70">
            Ajusta los días y pluses de tu cuadrante directamente desde el
            móvil. Los cambios se guardarán en tu calendario principal al
            confirmar.
          </p>
        </div>
        <ShiftPlannerLab
          initialEntries={plannerDays}
          onCommit={onCommit}
          isCommitting={isCommitting}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  )
}

export default CalendarTab
