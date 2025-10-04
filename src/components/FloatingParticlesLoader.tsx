import type { CSSProperties } from "react"

const PARTICLES = [
  { x: 18, y: -74, size: 12, duration: 5.8, delay: 0, opacity: 0.75 },
  { x: -30, y: -68, size: 10, duration: 6.6, delay: 0.6, opacity: 0.65 },
  { x: 46, y: -32, size: 8, duration: 5.2, delay: 1.2, opacity: 0.7 },
  { x: -54, y: -18, size: 11, duration: 6, delay: 1.8, opacity: 0.55 },
  { x: -22, y: 42, size: 9, duration: 5.4, delay: 1, opacity: 0.6 },
  { x: 30, y: 54, size: 13, duration: 6.8, delay: 0.3, opacity: 0.7 },
  { x: -8, y: 70, size: 7, duration: 5.6, delay: 2.1, opacity: 0.65 },
  { x: 64, y: 6, size: 10, duration: 7, delay: 1.5, opacity: 0.55 },
  { x: -68, y: 18, size: 9, duration: 6.4, delay: 0.9, opacity: 0.6 },
  { x: 52, y: 44, size: 8, duration: 5.9, delay: 2.4, opacity: 0.5 },
  { x: 12, y: -40, size: 7, duration: 4.8, delay: 2.8, opacity: 0.7 },
  { x: -42, y: 56, size: 11, duration: 6.2, delay: 1.9, opacity: 0.6 },
] as const

function FloatingParticlesLoader() {
  return (
    <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-slate-900/80 p-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-24 w-24" aria-hidden>
          <div className="loader-ring" />
          <div className="loader-ring loader-ring--inner" />
          <div className="loader-core" />
          <div className="loader-core-glow" />
          {PARTICLES.map((particle, index) => {
            const style = {
              "--particle-x": `${particle.x}px`,
              "--particle-y": `${particle.y}px`,
              "--particle-size": `${particle.size}px`,
              "--particle-duration": `${particle.duration}s`,
              "--particle-delay": `${particle.delay}s`,
              opacity: particle.opacity,
            } as CSSProperties

            return <span key={index} className="loader-particle" style={style} />
          })}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Preparando tu equipo...</p>
          <p className="text-xs text-white/60">Cargando usuarios y configuraciones</p>
        </div>
      </div>
    </div>
  )
}

export default FloatingParticlesLoader
