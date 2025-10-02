import "./globals.css"
import { ReactNode } from "react"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-100 min-h-screen text-gray-900">
        <header className="bg-blue-600 text-white p-4 shadow">
          <h1 className="text-xl font-bold">Supershift Local</h1>
        </header>
        <main className="max-w-3xl mx-auto mt-6">{children}</main>
      </body>
    </html>
  )
}
