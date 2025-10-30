"use client"

import type { FC } from "react"

type Feature = {
  title: string
  description: string
}

type KeyFeaturesSectionProps = {
  className?: string
}

const features: Feature[] = [
  {
    title: "Calendario mensual y semanal interactivo",
    description:
      "Visualiza los turnos por colores para identificar rápidamente la carga de trabajo y los tipos de jornada.",
  },
  {
    title: "Panel del propietario con vista de equipo",
    description:
      "Organiza a tu equipo, asigna turnos y gestiona roles en un panel diseñado para tenerlo todo bajo control.",
  },
  {
    title: "Modo de vista individual",
    description:
      "Cada usuario accede únicamente a sus turnos confirmados y a las horas acumuladas, sin distracciones.",
  },
  {
    title: "Plantillas de turnos y repetición automática (opcional)",
    description:
      "Ahorra tiempo con configuraciones reutilizables para crear horarios recurrentes en cuestión de segundos.",
  },
]

function combineClassNames(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base
}

const KeyFeaturesSection: FC<KeyFeaturesSectionProps> = ({ className }) => {
  return (
    <section
      className={combineClassNames(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_32px_120px_-48px_rgba(59,130,246,0.55)]",
        className,
      )}
      aria-labelledby="key-features-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_65%),_radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_60%)]" />
      </div>
      <div className="relative space-y-5">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">Funcionalidades principales</p>
          <h2 id="key-features-heading" className="text-2xl font-semibold sm:text-3xl">
            Planloop centraliza todo lo que necesitas para gestionar turnos
          </h2>
          <p className="max-w-2xl text-sm text-white/70">
            Simplifica la planificación con herramientas pensadas para propietarios y equipos que necesitan coordinar horarios en vivo.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-blue-400/40 hover:bg-slate-900/70"
            >
              <div className="relative flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/90 to-indigo-500/80 text-sm font-semibold text-white shadow-[0_12px_32px_-18px_rgba(59,130,246,0.9)]"
                >
                  {feature.title.charAt(0)}
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.description}</p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_55%)]" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default KeyFeaturesSection
