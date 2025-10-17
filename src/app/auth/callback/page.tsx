import type { Metadata } from "next"
import { Suspense } from "react"
import AuthCallbackClient from "./AuthCallbackClient"

export const metadata: Metadata = {
  title: "Procesando acceso | Planloop",
}

// evita el prerender estático en Vercel
export const dynamic = "force-dynamic"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p style={{ color: "#94a3b8", textAlign: "center" }}>Procesando acceso...</p>}>
      <AuthCallbackClient />
    </Suspense>
  )
}
