"use client"

import type { FC, ReactNode } from "react"

type TeamMember = {
  name: string
  role: string
  focus: string
  avatar: ReactNode
}

type SharedShift = {
  id: string
  title: string
  schedule: string
  type: string
  color: string
  owner: string
}

type TeamMarketingSectionProps = {
  className?: string
}

const teamMembers: TeamMember[] = [
  {
    name: "Laura García",
    role: "Propietaria",
    focus: "Coordina rotaciones",
    avatar: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-400 to-indigo-500 text-base font-semibold text-white">
        LG
      </span>
    ),
  },
  {
    name: "Marc Vidal",
    role: "Administrador",
    focus: "Aprueba cambios",
    avatar: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-teal-400 to-emerald-500 text-base font-semibold text-white">
        MV
      </span>
    ),
  },
  {
    name: "Aina Ríos",
    role: "Miembro",
    focus: "Cubre fines de semana",
    avatar: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-amber-400 to-orange-500 text-base font-semibold text-white">
        AR
      </span>
    ),
  },
  {
    name: "Noa Pérez",
    role: "Miembro",
    focus: "Refuerzos puntuales",
    avatar: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-fuchsia-400 to-purple-500 text-base font-semibold text-white">
        NP
      </span>
    ),
  },
]

const sharedShifts: SharedShift[] = [
  {
    id: "shared-1",
    title: "Cobertura mañana",
    schedule: "Lun · 08:00 – 15:00",
    type: "Trabajo",
    color: "#60a5fa",
    owner: "Laura",
  },
  {
    id: "shared-2",
    title: "Guardia nocturna",
    schedule: "Jue · 22:00 – 06:00",
    type: "Nocturno",
    color: "#c084fc",
    owner: "Marc",
  },
  {
    id: "shared-3",
    title: "Refuerzo fin de semana",
    schedule: "Sáb · 10:00 – 16:00",
    type: "Personalizado",
    color: "#fb7185",
    owner: "Aina",
  },
]

function combineClassNames(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base
}

const TeamMarketingSection: FC<TeamMarketingSectionProps> = ({ className }) => {
  return (
    <section
      className={combineClassNames(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_32px_120px_-48px_rgba(59,130,246,0.75)]",
        className,
      )}
      aria-labelledby="marketing-team-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_62%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.2),transparent_58%)]" />
      </div>
      <div className="relative space-y-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
            Equipo sincronizado
          </p>
          <h2 id="marketing-team-heading" className="text-2xl font-semibold sm:text-3xl">
            Lista visual, roles claros e invitaciones en segundos
          </h2>
          <p className="max-w-2xl text-sm text-white/70">
            Supervisa quién está disponible, comparte enlaces de invitación seguros y revisa los turnos compartidos sin abrir el panel completo.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Miembros del equipo</p>
                <p className="text-sm text-white/70">4 personas · 2 plazas libres</p>
              </div>
              <div className="flex -space-x-3">
                {teamMembers.slice(0, 3).map((member, index) => (
                  <span
                    key={`avatar-${member.name}`}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold"
                    aria-hidden
                    style={{ zIndex: teamMembers.length - index }}
                  >
                    {member.avatar}
                  </span>
                ))}
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white/70">
                  +{Math.max(teamMembers.length - 3, 0)}
                </span>
              </div>
            </div>
            <ul className="space-y-3">
              {teamMembers.map((member) => (
                <li
                  key={member.name}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                >
                  <div aria-hidden className="flex-shrink-0">
                    {member.avatar}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold">{member.name}</p>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{member.focus}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-blue-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Botones de invitación</p>
              <h3 className="text-lg font-semibold">Comparte acceso al instante</h3>
              <p className="text-sm text-blue-100/80">
                Genera un enlace nuevo o envía invitaciones directas por correo para sumar refuerzos en segundos.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
                >
                  Generar enlace
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/90 transition hover:border-white/60"
                >
                  Copiar invitación
                </button>
              </div>
              <p className="text-xs text-blue-100/70">
                Última invitación creada hace 3 horas · 2 plazas disponibles
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Resumen de turnos compartidos
                  </p>
                  <p className="text-sm text-white/60">Anticipa rotaciones clave y responsables</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  8 turnos sincronizados
                </span>
              </div>
              <ul className="space-y-2">
                {sharedShifts.map((shift) => (
                  <li
                    key={shift.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{shift.title}</p>
                      <p className="text-xs text-white/50">{shift.schedule}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-white/60">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-0.5 font-medium"
                        style={{
                          color: shift.color,
                          borderColor: `${shift.color}33`,
                          backgroundColor: `${shift.color}14`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: shift.color }}
                          aria-hidden
                        />
                        {shift.type}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide">Responsable: {shift.owner}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TeamMarketingSection
