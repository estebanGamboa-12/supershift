import { format } from "date-fns"
import { es } from "date-fns/locale"

function capitalizeFirst(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

type FormatCompactDateOptions = {
  includeYear?: boolean
}

export function formatCompactDate(
  date: Date,
  options: FormatCompactDateOptions = {},
): string {
  const dayLabel = capitalizeFirst(format(date, "EEE", { locale: es }))
  const dayNumber = format(date, "d", { locale: es })
  const monthLabel = capitalizeFirst(format(date, "MMM", { locale: es }))

  const base = `${dayLabel} ${dayNumber} de ${monthLabel}`

  if (options.includeYear) {
    const year = format(date, "yyyy", { locale: es })
    return `${base} ${year}`
  }

  return base
}

export function formatCompactMonth(date: Date): string {
  const monthLabel = capitalizeFirst(format(date, "MMM", { locale: es }))
  const year = format(date, "yyyy", { locale: es })
  return `${monthLabel} ${year}`
}
