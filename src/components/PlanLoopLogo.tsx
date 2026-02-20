"use client"

import type { FC } from "react"

type PlanLoopLogoProps = {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

const PlanLoopLogo: FC<PlanLoopLogoProps> = ({ 
  size = "md", 
  showText = true,
  className = "" 
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Loop icon - flat design */}
      <svg
        className={`${sizeClasses[size]} text-sky-400`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Flat loop - circular arrow */}
        <path
          d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Arrow loop path */}
        <path
          d="M8 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          className="text-sky-300"
        />
        {/* Arrow head pointing right/down */}
        <path
          d="M12 8l2 2-2 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="text-sky-300"
        />
      </svg>
      {showText && (
        <span className={`font-semibold tracking-tight text-white ${textSizeClasses[size]}`}>
          Plan Loop
        </span>
      )}
    </div>
  )
}

export default PlanLoopLogo
