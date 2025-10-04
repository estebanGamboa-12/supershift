import type { FC } from "react"

interface AuroraBackgroundProps {
  className?: string
}

const AuroraBackground: FC<AuroraBackgroundProps> = ({ className }) => {
  return (
    <div
      className={`aurora-container pointer-events-none absolute inset-0 overflow-hidden ${
        className ?? ""
      }`}
      aria-hidden
    >
      <div className="aurora-grid" />
      <div className="aurora-spot aurora-spot--one" />
      <div className="aurora-spot aurora-spot--two" />
      <div className="aurora-spot aurora-spot--three" />
      <div className="aurora-glow" />
    </div>
  )
}

export default AuroraBackground
