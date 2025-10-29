import type { FC } from "react"
import type { ShiftType } from "@/types/shifts"

type ShiftDistributionProps = {
  typeCounts: Record<ShiftType, number>
  totalShifts: number
  shiftTypeLabels: Record<ShiftType, string>
}

const ShiftDistribution: FC<ShiftDistributionProps> = ({
  typeCounts,
  totalShifts,
  shiftTypeLabels,
}) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Distribución de turnos</h3>
          <p className="text-sm text-white/60">
            Mantén el equilibrio entre trabajo y descanso con una visión rápida de los tipos de turno planificados.
          </p>
        </div>
        <div className="rounded-full border border-white/10 px-4 py-1 text-xs text-white/60">
          {totalShifts} turnos registrados
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {Object.entries(typeCounts).map(([type, count]) => {
          const percentage = totalShifts === 0 ? 0 : Math.round((count / totalShifts) * 100)
          return (
            <li key={type} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-white/70">
                {shiftTypeLabels[type as ShiftType] ?? type}
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-14 text-right text-sm text-white/60">{count}</span>
            </li>
          )
        })}
        {totalShifts === 0 && (
          <li className="text-sm text-white/60">
            Añade tus primeros turnos para visualizar el equilibrio entre tipos de jornada.
          </li>
        )}
      </ul>
    </div>
  )
}

export default ShiftDistribution
