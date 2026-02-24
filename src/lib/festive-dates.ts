/**
 * Días festivos (España – festivos nacionales de fecha fija).
 * Formato MM-DD para aplicar a cualquier año.
 */
const FIXED_FESTIVE_MMDD = [
  "01-01", // Año Nuevo
  "01-06", // Reyes
  "05-01", // Día del Trabajo
  "08-15", // Asunción
  "10-12", // Fiesta Nacional
  "11-01", // Todos los Santos
  "12-06", // Constitución
  "12-08", // Inmaculada
  "12-25", // Navidad
] as const

function toMMDD(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Indica si la fecha es un día festivo (nacional, España).
 */
export function isFestiveDate(date: Date): boolean {
  const mmdd = toMMDD(date)
  return FIXED_FESTIVE_MMDD.includes(mmdd as (typeof FIXED_FESTIVE_MMDD)[number])
}
