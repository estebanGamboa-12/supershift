import type { Metadata } from "next"
import UpdatePasswordClient from "./UpdatePasswordClient"

export const metadata: Metadata = {
  title: "Actualiza tu contraseña | Planloop",
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />
}
