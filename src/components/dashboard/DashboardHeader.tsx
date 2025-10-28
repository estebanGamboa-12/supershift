"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from "react"
import { formatCompactDate } from "@/lib/formatDate"
import type { ShiftEvent, ShiftType } from "@/types/shifts"
import NextShiftCard from "./NextShiftCard"
import PlanningHealthCard from "./PlanningHealthCard"

type DashboardHeaderProps = {
  onQuickAdd: () => void
  nextShift?: ShiftEvent
  daysUntilNextShift: number | null
  shiftTypeLabels: Record<ShiftType, string>
  currentMonthShiftCount: number
  totalShiftCount: number
  activeShiftTypes: number
  shifts: ShiftEvent[]
  onSearchSelect?: (shift: ShiftEvent) => void
}

const DashboardHeader: FC<DashboardHeaderProps> = ({
  onQuickAdd,
  nextShift,
  daysUntilNextShift,
  shiftTypeLabels,
  currentMonthShiftCount,
  totalShiftCount,
  activeShiftTypes,
  shifts,
  onSearchSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return []
    }

    return shifts
      .map((shift) => {
        const note = shift.note?.trim() ?? ""
        const dateLabel = formatCompactDate(new Date(shift.date), {
          includeYear: true,
        })
        const typeLabel = shift.label ?? shiftTypeLabels[shift.type] ?? shift.type
        const haystack = [
          note.toLowerCase(),
          dateLabel.toLowerCase(),
          typeLabel.toLowerCase(),
          shift.type.toLowerCase(),
        ]

        const matches = haystack.some((value) => value.includes(normalizedQuery))

        return {
          shift,
          note,
          dateLabel,
          typeLabel,
          matches,
        }
      })
      .filter((item) => item.matches)
      .slice(0, 8)
  }, [searchQuery, shiftTypeLabels, shifts])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (searchResults.length > 0) {
      const [firstResult] = searchResults
      onSearchSelect?.(firstResult.shift)
      setSearchQuery("")
    }
  }

  const handleResultClick = (shift: ShiftEvent) => {
    onSearchSelect?.(shift)
    setSearchQuery("")
  }

  const showResults = searchQuery.trim().length > 0

  return (
    <header className="border-b border-white/5 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-slate-950/40 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 xl:px-12">
        {/* Top section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative hidden md:block">
              <span className="pointer-events-none absolute inset-0 -translate-y-1 scale-125 rounded-full bg-cyan-400/30 blur-xl" aria-hidden />
              <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-blue-500/20">
                <Image src="/planloop-logo.svg" alt="Logotipo de Planloop" width={56} height={56} className="h-14 w-14" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                Hoy es {formatCompactDate(new Date())}
              </div>
              <div>
                <p className="text-sm font-medium text-sky-200/80">Panel de rendimiento</p>
                <div className="flex items-center gap-3">
                  <div className="relative md:hidden">
                    <span className="pointer-events-none absolute inset-0 -translate-y-1 scale-110 rounded-full bg-cyan-400/20 blur" aria-hidden />
                    <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 shadow-lg shadow-sky-500/30">
                      <Image src="/planloop-logo.svg" alt="Logotipo de Planloop" width={36} height={36} className="h-9 w-9" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm md:text-4xl">Planloop HQ</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Search + CTA */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <form
                onSubmit={handleSearchSubmit}
                className="group relative"
                role="search"
                aria-label="Buscar en turnos"
              >
                <div
                  className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/60 via-indigo-500/60 to-sky-500/60 opacity-60 blur-sm transition duration-300 group-hover:opacity-90 group-focus-within:opacity-100"
                  aria-hidden
                />
                <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/85 px-4 py-2.5 shadow-lg shadow-sky-500/30 backdrop-blur">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg text-white">🔍</span>
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder="Buscar personas, turnos o notas..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSearchQuery("")
                      }
                    }}
                    aria-label="Buscar"
                  />
                  <span className="pointer-events-none text-xs font-medium text-white/50">
                    ⌘K
                  </span>
                </div>
              </form>

              {showResults && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-sky-500/25 backdrop-blur">
                  {searchResults.length > 0 ? (
                    <ul className="space-y-2">
                      {searchResults.map(({ shift, dateLabel, note, typeLabel }) => (
                        <li key={shift.id}>
                          <button
                            type="button"
                            onClick={() => handleResultClick(shift)}
                            className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-500/15 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-white">{dateLabel}</p>
                                {note ? (
                                  <p className="mt-1 text-xs text-white/70">{note}</p>
                                ) : (
                                  <p className="mt-1 text-xs text-white/50">Sin nota adicional</p>
                                )}
                              </div>
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                                {typeLabel}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/60">
                      No se encontraron resultados.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-r from-sky-500/40 via-blue-600/40 to-indigo-500/40 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400/50 hover:via-blue-500/45 hover:to-indigo-500/45 focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              ➕ Nuevo turno rápido
            </button>
          </div>
        </div>

        {/* Cards section */}
        <div className="grid gap-6 md:grid-cols-2">
          <NextShiftCard
            nextShift={nextShift}
            daysUntilNextShift={daysUntilNextShift}
            shiftTypeLabels={shiftTypeLabels}
          />
          <PlanningHealthCard
            currentMonthShiftCount={currentMonthShiftCount}
            totalShiftCount={totalShiftCount}
            activeShiftTypes={activeShiftTypes}
          />
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
