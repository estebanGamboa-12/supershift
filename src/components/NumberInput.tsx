"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  arrowStep?: number // Step para los botones de flecha (por defecto: 1 si step < 1, sino step)
  placeholder?: string
  className?: string
  label?: string
  suffix?: string
  allowEmpty?: boolean
}

export default function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  arrowStep,
  placeholder,
  className = "",
  label,
  suffix,
  allowEmpty = false,
}: NumberInputProps) {
  // Si step < 1 (valores monetarios), usar 1.0 para las flechas por defecto
  // Si no, usar el step normal
  const effectiveArrowStep = arrowStep ?? (step < 1 ? 1 : step)
  const [displayValue, setDisplayValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Solo actualizar si el valor cambió externamente y el input no tiene foco
    if (document.activeElement !== inputRef.current) {
      if (value === 0 && allowEmpty && displayValue === "") {
        // Mantener vacío si ya estaba vacío
        return
      }
      setDisplayValue(value === 0 && allowEmpty ? "" : value.toString())
    }
  }, [value, allowEmpty, displayValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Permitir campo vacío temporalmente mientras se escribe
    if (inputValue === "" && allowEmpty) {
      setDisplayValue("")
      return
    }

    // Permitir escribir números parciales (ej: "1", "10", "10.")
    if (inputValue === "-" || inputValue === "." || inputValue === "-.") {
      setDisplayValue(inputValue)
      return
    }

    const numValue = parseFloat(inputValue)
    
    if (isNaN(numValue)) {
      // Si no es un número válido pero tiene contenido, mantenerlo para permitir escritura parcial
      if (inputValue !== "") {
        setDisplayValue(inputValue)
      } else {
        setDisplayValue("")
      }
      return
    }

    const clampedValue = Math.max(min ?? 0, max !== undefined ? Math.min(max, numValue) : numValue)
    setDisplayValue(clampedValue.toString())
    onChange(clampedValue)
  }

  const handleBlur = () => {
    // Si está vacío al perder el foco, poner 0 o mantener vacío según allowEmpty
    if (displayValue === "" || displayValue === "-" || displayValue === ".") {
      if (allowEmpty) {
        setDisplayValue("")
        onChange(0)
      } else {
        setDisplayValue("0")
        onChange(0)
      }
    } else {
      const numValue = parseFloat(displayValue)
      if (!isNaN(numValue)) {
        const clampedValue = Math.max(min ?? 0, max !== undefined ? Math.min(max, numValue) : numValue)
        setDisplayValue(clampedValue.toString())
        onChange(clampedValue)
      } else {
        // Si no es válido, resetear a 0 o vacío
        if (allowEmpty) {
          setDisplayValue("")
          onChange(0)
        } else {
          setDisplayValue("0")
          onChange(0)
        }
      }
    }
  }

  const handleIncrement = () => {
    const newValue = Math.min(max ?? Infinity, value + effectiveArrowStep)
    setDisplayValue(newValue.toString())
    onChange(newValue)
    inputRef.current?.focus()
  }

  const handleDecrement = () => {
    const newValue = Math.max(min ?? 0, value - effectiveArrowStep)
    setDisplayValue(newValue.toString())
    onChange(newValue)
    inputRef.current?.focus()
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-semibold text-white">{label}</label>
      )}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || "0"}
          className={`w-full min-w-0 rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2.5 text-base font-semibold tabular-nums text-white focus:border-sky-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${suffix ? "pr-16" : "pr-14"}`}
        />
        {suffix && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 text-base font-semibold tabular-nums text-emerald-300 pointer-events-none select-none">{suffix}</span>
        )}
        <div className="absolute right-1 flex flex-col gap-px">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={max !== undefined && value >= max}
            className="flex h-6 w-7 items-center justify-center rounded-t border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            aria-label="Incrementar"
          >
            <ChevronUp size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={value <= (min ?? 0)}
            className="flex h-6 w-7 items-center justify-center rounded-b border-t-0 border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            aria-label="Decrementar"
          >
            <ChevronDown size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
