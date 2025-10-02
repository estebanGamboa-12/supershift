import { format } from "date-fns"

export function generateRotation(
  startDate: string,
  cycle: number[],
  length: number = 30
) {
  const result = []
  let current = new Date(startDate)
  let cycleIndex = 0
  let work = true

  for (let i = 0; i < length; i++) {
    const type = work ? "WORK" : "REST"
    result.push({
      id: i + 1,
      date: format(current, "yyyy-MM-dd"), // ✅ fecha segura
      type,
    })

    current.setDate(current.getDate() + 1)
    cycleIndex++

    if (cycleIndex >= cycle[work ? 0 : 1]) {
      work = !work
      cycleIndex = 0
    }
  }

  return result
}
