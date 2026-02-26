"use client"

import { useEffect, useState } from "react"
import NoCreditsModal, { NO_CREDITS_EVENT } from "./NoCreditsModal"

type NoCreditsDetail = { cost?: number }

export function openNoCreditsModal(detail?: NoCreditsDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(NO_CREDITS_EVENT, { detail: detail ?? {} }),
  )
}

export default function NoCreditsModalListener() {
  const [open, setOpen] = useState(false)
  const [cost, setCost] = useState<number | undefined>(undefined)

  useEffect(() => {
    const handler = (e: CustomEvent<NoCreditsDetail>) => {
      setCost(e.detail?.cost)
      setOpen(true)
    }
    window.addEventListener(NO_CREDITS_EVENT, handler as EventListener)
    return () => window.removeEventListener(NO_CREDITS_EVENT, handler as EventListener)
  }, [])

  return (
    <NoCreditsModal
      open={open}
      onClose={() => setOpen(false)}
      cost={cost}
    />
  )
}
