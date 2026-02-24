"use client"

import type { FC } from "react"
import { motion } from "framer-motion"
import type { ShiftExtra } from "@/types/preferences"
import NumberInput from "@/components/NumberInput"

type ExtraCardProps = {
  extra: ShiftExtra
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onUpdate: (updates: Partial<ShiftExtra>) => void
  onFinishEdit: () => void
  onDelete: () => void
}

const ExtraCard: FC<ExtraCardProps> = ({
  extra,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onFinishEdit,
  onDelete,
}) => {
  const color = extra.color ?? "#3b82f6"

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-white shadow-[0_30px_60px_-40px_rgba(59,130,246,0.65)] transition hover:border-sky-400/40 hover:shadow-[0_40px_80px_-48px_rgba(56,189,248,0.65)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {isEditing ? (
          <>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto]">
              <input
                type="color"
                value={color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-white/20 bg-white/5"
                title="Color"
              />
              <input
                type="text"
                value={extra.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Nombre"
                className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base font-medium text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
              <NumberInput
                value={extra.value}
                onChange={(v) => onUpdate({ value: v })}
                min={0}
                step={0.01}
                suffix="€"
                allowEmpty={false}
                className="min-w-[7rem] shrink-0"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onFinishEdit}
                className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
              >
                Listo
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border shadow-inner"
                style={{
                  backgroundColor: `${color}25`,
                  borderColor: `${color}50`,
                }}
              >
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: color }} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold tracking-tight text-white">{extra.name}</h3>
                <p className="text-base font-bold tabular-nums text-emerald-400">+{extra.value.toFixed(2)} €</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm text-white/80 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Editar"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sm text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                aria-label="Eliminar"
              >
                ×
              </button>
            </div>
          </>
        )}
      </div>
    </motion.article>
  )
}

export default ExtraCard
