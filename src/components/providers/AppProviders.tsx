"use client"

import type { ReactNode } from "react"
import { ConfirmDeleteProvider } from "@/lib/ConfirmDeleteContext"
import { ToastProvider } from "@/lib/ToastContext"
import NoCreditsModalListener from "@/components/dashboard/NoCreditsModalListener"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmDeleteProvider>
      <ToastProvider>
        {children}
        <NoCreditsModalListener />
      </ToastProvider>
    </ConfirmDeleteProvider>
  )
}
