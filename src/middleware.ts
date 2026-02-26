import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const LANDING_HOSTS = ["planloop.app", "www.planloop.app"]
const APP_HOST = "app.planloop.app"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.planloop.app"

function isLandingHost(host: string | null): boolean {
  if (!host) return false
  const h = host.split(":")[0].toLowerCase()
  return LANDING_HOSTS.includes(h)
}

function isAppHost(host: string | null): boolean {
  if (!host) return false
  const h = host.split(":")[0].toLowerCase()
  return h === APP_HOST || h === "localhost" || h.startsWith("127.0.0.1")
}

/** En local: usar NEXT_PUBLIC_SITE=landing para ver la landing; por defecto app */
function getSiteMode(host: string | null): "landing" | "app" {
  if (typeof process.env.NEXT_PUBLIC_SITE === "string") {
    const s = process.env.NEXT_PUBLIC_SITE.toLowerCase()
    if (s === "landing") return "landing"
  }
  if (isLandingHost(host)) return "landing"
  if (isAppHost(host)) return "app"
  return "app"
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? null
  const pathname = request.nextUrl.pathname
  const site = getSiteMode(host)

  // Rutas internas de la landing (solo accesibles por rewrite)
  const isLandingPath = pathname === "/landing" || pathname.startsWith("/landing/")

  if (site === "landing") {
    // Estamos en planloop.app (o en local con SITE=landing)
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", request.url))
    }
    if (pathname === "/pricing") {
      return NextResponse.rewrite(new URL("/landing/pricing", request.url))
    }
    if (isLandingPath) {
      return NextResponse.next()
    }
    // Cualquier otra ruta (auth, templates, etc.) → redirigir a la app
    const appOrigin = host && (host.includes("localhost") || host.includes("127.0.0.1"))
      ? request.nextUrl.origin
      : APP_URL
    return NextResponse.redirect(`${appOrigin}${pathname}${request.nextUrl.search}`)
  }

  // site === "app" (app.planloop.app o local por defecto)
  if (isLandingPath) {
    const landingOrigin = host && (host.includes("localhost") || host.includes("127.0.0.1"))
      ? request.nextUrl.origin
      : "https://planloop.app"
    const target = pathname === "/landing" || pathname === "/landing/" ? "/" : pathname.replace(/^\/landing/, "")
    return NextResponse.redirect(`${landingOrigin}${target}${request.nextUrl.search}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|api|manifest|.*\\.(?:ico|png|svg|webmanifest)).*)",
  ],
}
