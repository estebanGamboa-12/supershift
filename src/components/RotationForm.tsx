'use client'

import { useState } from "react"

export default function RotationForm({
  onGenerate,
}: {
  onGenerate: (shifts: { startDate: string; cycle: number[] }) => void
}) {
  const [start, setStart] = useState("")
  const [model, setModel] = useState("4x2")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!start) {
      setError("Por favor selecciona una fecha de inicio")
      return
    }

    const [work, rest] = model.split("x").map(Number)
    onGenerate({ startDate: start, cycle: [work, rest] })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 bg-white p-4 rounded shadow"
    >
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="form-input border p-2 rounded"
      />
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="form-select border p-2 rounded"
      >
        <option value="4x2">4x2</option>
        <option value="5x3">5x3</option>
        <option value="6x3">6x3</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Generar
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  )
}
