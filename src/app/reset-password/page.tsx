import type { Metadata } from "next"
import { Suspense } from "react"
import ResetPasswordClient from "./ResetPasswordClient"

export const metadata: Metadata = {
  title: "Restablece tu contraseña | Planloop",
}

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p style={{ color: "#94a3b8", textAlign: "center" }}>Preparando formulario...</p>}>
      <ResetPasswordClient />
    </Suspense>
  )
}
