import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Actualiza tu contraseña | Planloop",
}

export const dynamic = "force-dynamic"

export default function UpdatePasswordPage() {
  redirect("/reset-password")
}
