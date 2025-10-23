"use client"

import type { FC } from "react"
import type { ShiftType } from "@/types/shifts"

export type HistorySnapshot = {
  date: string
  type: ShiftType
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  note?: string | null
  label?: string | null
  color?: string | null
  pluses?: {
    night: number
    holiday: number
    availability: number
    other: number
  }
}

export type HistoryEntry = {
  id: string
  shiftId: number
  action: "create" | "update" | "delete"
  timestamp: string
  before?: HistorySnapshot | null
  after?: HistorySnapshot | null
}

type ChangeHistoryPanelProps = {
  entries: HistoryEntry[]
  shiftTypeLabels: Record<ShiftType, string>
}

const ACTION_LABELS: Record<HistoryEntry["action"], { label: string; tone: string }> = {
  create: { label: "Creación", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
  update: { label: "Actualización", tone: "bg-blue-500/15 text-blue-200 border-blue-400/30" },
  delete: { label: "Eliminación", tone: "bg-rose-500/15 text-rose-200 border-rose-400/30" },
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${String(remainder).padStart(2, "0")}m`
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const renderSnapshot = (
  snapshot: HistorySnapshot | null | undefined,
  shiftTypeLabels: Record<ShiftType, string>,
) => {
  if (!snapshot) {
    return <p className="text-xs text-white/50">Sin datos previos</p>
  }

  const label = snapshot.label ?? shiftTypeLabels[snapshot.type] ?? snapshot.type
  const rangeLabel = snapshot.startTime && snapshot.endTime ? `${snapshot.startTime} - ${snapshot.endTime}` : "Todo el día"
  return (
    <div className="space-y-1 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs text-white/70">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p>{rangeLabel}</p>
      <p className="text-white/60">Duración: {formatDuration(snapshot.durationMinutes)}</p>
      {snapshot.note && <p className="text-white/50">Nota: {snapshot.note}</p>}
    </div>
  )
}

const ChangeHistoryPanel: FC<ChangeHistoryPanelProps> = ({ entries, shiftTypeLabels }) => {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Historial de cambios</h2>
          <p className="text-sm text-white/60">
            Consulta la evolución de cada turno comparando el estado anterior y el actual.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
          {entries.length} {entries.length === 1 ? "registro" : "registros"}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
          Aún no hay cambios registrados. Empieza modificando o creando turnos para ver el historial.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {entries.map((entry) => {
            const actionTone = ACTION_LABELS[entry.action]
            return (
              <li
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-blue-500/10"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${actionTone.tone}`}>
                      {actionTone.label}
                    </span>
                    <span className="text-xs text-white/50">Turno #{entry.shiftId}</span>
                  </div>
                  <span className="text-xs text-white/50">{formatTimestamp(entry.timestamp)}</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Antes</p>
                    {renderSnapshot(entry.before, shiftTypeLabels)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Después</p>
                    {renderSnapshot(entry.after, shiftTypeLabels)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ChangeHistoryPanel
