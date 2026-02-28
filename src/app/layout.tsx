import "./globals.css"

import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import dynamic from "next/dynamic"

const AppProviders = dynamic(
  () => import("@/components/providers/AppProviders").then((m) => ({ default: m.AppProviders })),
  { ssr: true },
)
const InstallPromptBanner = dynamic(
  () => import("@/components/pwa/install-prompt").then((m) => ({ default: m.InstallPromptBanner })),
  { ssr: true },
)
const ServiceWorkerRegistration = dynamic(
  () => import("@/components/pwa/service-worker-registration").then((m) => ({ default: m.ServiceWorkerRegistration })),
  { ssr: true },
)

export const metadata: Metadata = {
  title: {
    default: "Planloop",
    template: "%s | Planloop"
  },
  description: "Planificador de turnos optimizado para equipos de Planloop.",
  manifest: "/manifest.webmanifest",
  applicationName: "Planloop",
  icons: {
    icon: [{ url: "/planloop-logo.svg", sizes: "any", type: "image/svg+xml" }],
    apple: [{ url: "/planloop-logo.svg", sizes: "any", type: "image/svg+xml" }]
  },
  appleWebApp: {
    capable: true,
    title: "Planloop",
    statusBarStyle: "black-translucent"
  }
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full dark" data-theme="dark">
      <body className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
        <AppProviders>
          {children}
          <InstallPromptBanner />
          <ServiceWorkerRegistration />
        </AppProviders>
      </body>
    </html>
  )
}
