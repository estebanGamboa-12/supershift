export const POPULAR_TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Caracas",
  "America/Sao_Paulo",
  "America/New_York",
] as const

export type PopularTimezone = (typeof POPULAR_TIMEZONES)[number]
