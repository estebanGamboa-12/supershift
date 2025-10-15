import type { Metadata } from "next"
import AuthCallbackClient from "./AuthCallbackClient"

export const metadata: Metadata = {
  title: "Procesando acceso | Corp",
}

export default function AuthCallbackPage() {
  return <AuthCallbackClient />
}
