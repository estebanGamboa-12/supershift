import Link from "next/link"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.planloop.app"

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Precios
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Crea tu cuenta y empieza a planificar turnos. El pago se gestiona dentro de la app cuando quieras contratar un plan.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">Empezar</h2>
          <p className="mt-2 text-slate-400">
            Regístrate gratis y prueba el calendario, los extras y los reportes. Sin tarjeta para empezar.
          </p>
          <a
            href={`${APP_URL}/auth/register`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 sm:w-auto"
          >
            Crear cuenta
          </a>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Los planes de pago (si los activas) se configuran y pagan dentro de la app en{" "}
          <a href={APP_URL} className="text-sky-400 hover:underline">
            app.planloop.app
          </a>
          .
        </p>
      </div>

      <div className="mt-16 text-center">
        <Link href="/" className="text-sky-400 hover:text-sky-300">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
