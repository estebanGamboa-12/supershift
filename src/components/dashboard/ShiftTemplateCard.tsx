import type { FC } from "react"
import { motion } from "framer-motion"
import type { ShiftTemplate } from "@/types/templates"

type ShiftTemplateCardProps = {
  template: ShiftTemplate
  onAdd?: (template: ShiftTemplate) => void
  onEdit?: (template: ShiftTemplate) => void
  onDelete?: (template: ShiftTemplate) => void
}

const ShiftTemplateCard: FC<ShiftTemplateCardProps> = ({
  template,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <motion.article
      layout
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-white shadow-[0_30px_60px_-40px_rgba(59,130,246,0.65)] transition hover:border-sky-400/40 hover:shadow-[0_40px_80px_-48px_rgba(56,189,248,0.65)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-inner shadow-slate-900/50">
            {template.icon ?? "🗓️"}
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{template.title}</h3>
            <p className="text-sm text-white/60">
              {template.startTime} — {template.endTime}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(template)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/20 text-base text-sky-100 shadow hover:bg-sky-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              aria-label={`Agregar ${template.title}`}
            >
              +
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm text-white/80 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={`Editar ${template.title}`}
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(template)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sm text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              aria-label={`Eliminar ${template.title}`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 text-xs text-white/60 sm:grid-cols-2">
        <p>
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/40">
            Descanso
          </span>
          {template.breakMinutes != null ? `${template.breakMinutes} min` : "No definido"}
        </p>
        <p>
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/40">
            Alerta
          </span>
          {template.alertMinutes != null ? `${template.alertMinutes} min antes` : "Sin alerta"}
        </p>
        <p className="sm:col-span-2">
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/40">
            Ubicación
          </span>
          {template.location?.trim() || "No especificada"}
        </p>
      </div>
    </motion.article>
  )
}

export default ShiftTemplateCard
