import type { Metadata } from "next"
import { Suspense } from "react"
import UpdatePasswordClient from "./UpdatePasswordClient"

export const metadata: Metadata = {
  title: "Actualiza tu contraseña | Planloop",
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={<p style={{ color: "#94a3b8", textAlign: "center" }}>Preparando formulario...</p>}
    >
      <UpdatePasswordClient />
    </Suspense>
  )
}
