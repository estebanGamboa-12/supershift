import Link from "next/link"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.planloop.app"

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Planifica turnos.
          <br />
          <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
            Sin líos.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Calendario de turnos, extras y reportes en un solo sitio. Crea tu cuenta y empieza en un minuto.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={`${APP_URL}/auth/register`}
            className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 sm:w-auto"
          >
            Crear cuenta gratis
          </a>
          <a
            href={`${APP_URL}/auth`}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Entrar
          </a>
        </div>
      </div>

      <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="text-2xl">📅</div>
          <h2 className="mt-4 text-lg font-semibold text-white">Calendario de turnos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Vista mensual, tipos personalizados, días festivos y sincronización con Google Calendar.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="text-2xl">💰</div>
          <h2 className="mt-4 text-lg font-semibold text-white">Extras y reportes</h2>
          <p className="mt-2 text-sm text-slate-400">
            Nocturnidad, festivos, disponibilidad. Informe mensual en HTML o PDF con totales y días trabajados.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="text-2xl">⚙️</div>
          <h2 className="mt-4 text-lg font-semibold text-white">A tu medida</h2>
          <p className="mt-2 text-sm text-slate-400">
            Inicio de semana (lunes/domingo), colores y preferencias guardadas en tu cuenta.
          </p>
        </div>
      </div>

      <div className="mt-24 text-center">
        <p className="text-slate-500">¿Listo para probarlo?</p>
        <Link
          href={`${APP_URL}/auth/register`}
          className="mt-4 inline-block font-semibold text-sky-400 hover:text-sky-300"
        >
          Crear cuenta en app.planloop.app →
        </Link>
      </div>
    </div>
  )
}
