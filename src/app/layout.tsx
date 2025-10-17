import "./globals.css"

import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"
import { InstallPromptBanner } from "@/components/pwa/install-prompt"

export const metadata: Metadata = {
  title: {
    default: "Corp",
    template: "%s | Corp"
  },
  description: "Planificador de turnos optimizado para equipos de Supershift.",
  manifest: "/manifest.webmanifest",
  applicationName: "Corp",
  themeColor: "#0f172a",
  icons: {
    icon: [{ url: "/corp-logo.svg", sizes: "any", type: "image/svg+xml" }],
    apple: [{ url: "/corp-logo.svg", sizes: "any", type: "image/svg+xml" }]
  },
  appleWebApp: {
    capable: true,
    title: "Corp",
    statusBarStyle: "black-translucent"
  }
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
        <InstallPromptBanner />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
