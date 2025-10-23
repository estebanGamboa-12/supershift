"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Flame,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  Timer,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react"

type DashboardView = "overview" | "history" | "hours" | "reports" | "settings"

type MenuItem = {
  id: DashboardView
  label: string
  description: string
  icon: LucideIcon
}

type ChangeDetail = {
  label: string
  before: string
  after: string
  note?: string
}

type ChangeEvent = {
  id: string
  timestamp: string
  author: string
  role: string
  summary: string
  impact: "positivo" | "negativo" | "neutro"
  comment?: string
  details: ChangeDetail[]
}

type DailyRecord = {
  id: string
  date: string
  label: string
  start: string
  end: string
  breakMinutes: number
  totalHours: number
  project: string
  comparison: string
}

type WeeklyTotal = {
  day: string
  logged: number
  planned: number
  difference: number
}

type Snapshot = {
  id: string
  title: string
  description: string
  highlights: string[]
  createdAt: string
}

type FocusTask = {
  id: string
  title: string
  owner: string
  schedule: string
  status: string
}

type Adjustment = {
  id: string
  title: string
  status: string
  requestedBy: string
  requestedAt: string
  appliedAt: string
  difference: string
  justification: string
}

type ProductivityIndicator = {
  id: string
  title: string
  value: string
  trend: "up" | "down" | "stable"
  description: string
}

type QuickLink = {
  id: string
  label: string
  description: string
  actionLabel: string
  icon: LucideIcon
}

type LogFormState = {
  date: string
  start: string
  end: string
  breakMinutes: number
  project: string
  notes: string
}

const menuItems: MenuItem[] = [
  {
    id: "overview",
    label: "Resumen",
    description: "Situación general y acciones rápidas",
    icon: LayoutDashboard,
  },
  {
    id: "history",
    label: "Historial de cambios",
    description: "Versiones, trazabilidad y comparativas",
    icon: History,
  },
  {
    id: "hours",
    label: "Control horario",
    description: "Registra jornadas y revisa totales diarios",
    icon: Clock,
  },
  {
    id: "reports",
    label: "Reportes y métricas",
    description: "Tendencias, objetivos y exportaciones",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Preferencias",
    description: "Alertas, plantillas y automatizaciones",
    icon: Settings,
  },
]

const changeHistory: ChangeEvent[] = [
  {
    id: "chg-1",
    timestamp: "12 feb 2024 · 09:24",
    author: "Laura Sánchez",
    role: "Coordinadora de equipo",
    summary: "Ajustó la salida del turno y recalculó horas extra",
    impact: "positivo",
    comment: "El cliente aprobó la extensión para cerrar el sprint 14.",
    details: [
      { label: "Hora de salida", before: "16:00", after: "17:45", note: "+1h 45m" },
      { label: "Horas totales", before: "8h 00m", after: "9h 45m", note: "+1h 45m" },
      { label: "Proyecto", before: "Soporte Premium", after: "Implementación API" },
    ],
  },
  {
    id: "chg-2",
    timestamp: "11 feb 2024 · 18:12",
    author: "Diego Rivas",
    role: "RRHH",
    summary: "Aplicó permiso personal y reprogramó salida",
    impact: "neutro",
    comment: "Se compensará con tiempo adicional el viernes 14.",
    details: [
      { label: "Entrada", before: "08:00", after: "09:30", note: "+1h 30m" },
      { label: "Salida", before: "17:00", after: "18:30" },
      { label: "Horas totales", before: "8h 00m", after: "8h 30m", note: "+0h 30m" },
    ],
  },
  {
    id: "chg-3",
    timestamp: "10 feb 2024 · 10:05",
    author: "Marina López",
    role: "PM Oficina Madrid",
    summary: "Reasignó jornada a tareas de discovery",
    impact: "negativo",
    comment: "Se redujo la capacidad en incidencias críticas.",
    details: [
      { label: "Proyecto", before: "Incidencias Nivel 1", after: "Discovery producto" },
      { label: "Horas facturables", before: "6h 30m", after: "4h 00m", note: "-2h 30m" },
      { label: "Objetivo diario", before: "100%", after: "85%" },
    ],
  },
]

const dailyRecords: DailyRecord[] = [
  {
    id: "log-1",
    date: "Lunes 10 feb",
    label: "Sprint Integraciones",
    start: "08:05",
    end: "17:10",
    breakMinutes: 45,
    totalHours: 8.33,
    project: "Integraciones",
    comparison: "+0h 33m vs plan",
  },
  {
    id: "log-2",
    date: "Martes 11 feb",
    label: "Soporte Premium",
    start: "09:30",
    end: "18:30",
    breakMinutes: 60,
    totalHours: 8,
    project: "Soporte",
    comparison: "±0h 00m vs plan",
  },
  {
    id: "log-3",
    date: "Miércoles 12 feb",
    label: "QA Automatizado",
    start: "07:55",
    end: "17:45",
    breakMinutes: 45,
    totalHours: 8.75,
    project: "QA",
    comparison: "+0h 45m vs plan",
  },
  {
    id: "log-4",
    date: "Jueves 13 feb",
    label: "Discovery producto",
    start: "08:15",
    end: "17:00",
    breakMinutes: 45,
    totalHours: 8,
    project: "Producto",
    comparison: "±0h 00m vs plan",
  },
  {
    id: "log-5",
    date: "Viernes 14 feb",
    label: "Documentación final",
    start: "08:45",
    end: "16:30",
    breakMinutes: 30,
    totalHours: 7.25,
    project: "Documentación",
    comparison: "-0h 45m vs plan",
  },
]

const weeklyTotals: WeeklyTotal[] = [
  { day: "L", logged: 8.33, planned: 8, difference: 0.33 },
  { day: "M", logged: 8, planned: 8, difference: 0 },
  { day: "X", logged: 8.75, planned: 8, difference: 0.75 },
  { day: "J", logged: 8, planned: 8, difference: 0 },
  { day: "V", logged: 7.25, planned: 7.5, difference: -0.25 },
]

const snapshots: Snapshot[] = [
  {
    id: "snap-1",
    title: "Semana 7 · Ajustada",
    description: "Consolidó la entrada tardía del martes y la extensión del miércoles.",
    highlights: [
      "39h 50m registradas",
      "2h 30m extras aprobadas",
      "0 incidencias abiertas",
    ],
    createdAt: "12 feb 2024 · 19:40",
  },
  {
    id: "snap-2",
    title: "Semana 6 · Base",
    description: "Referencia sin incidencias ni cambios aprobados.",
    highlights: [
      "37h 20m registradas",
      "Horas extras 0h",
      "1 solicitud pendiente",
    ],
    createdAt: "02 feb 2024 · 18:10",
  },
]

const focusTasks: FocusTask[] = [
  {
    id: "task-1",
    title: "Validar comparativa de horas con nómina",
    owner: "Marina López",
    schedule: "12 feb · 17:30",
    status: "En curso",
  },
  {
    id: "task-2",
    title: "Confirmar ajustes de permisos",
    owner: "Diego Rivas",
    schedule: "13 feb · 09:00",
    status: "Pendiente",
  },
  {
    id: "task-3",
    title: "Preparar versión para auditoría",
    owner: "Laura Sánchez",
    schedule: "14 feb · 11:15",
    status: "Planificada",
  },
]

const adjustments: Adjustment[] = [
  {
    id: "adj-1",
    title: "Cambio turno tarde",
    status: "Aprobado",
    requestedBy: "Laura Sánchez",
    requestedAt: "11 feb · 18:00",
    appliedAt: "12 feb · 09:00",
    difference: "+1h 45m",
    justification: "Entrega sprint 14",
  },
  {
    id: "adj-2",
    title: "Permiso médico",
    status: "Pendiente",
    requestedBy: "Diego Rivas",
    requestedAt: "13 feb · 14:15",
    appliedAt: "—",
    difference: "-2h 00m",
    justification: "Cita médica 20 feb",
  },
]

const productivityIndicators: ProductivityIndicator[] = [
  {
    id: "ind-1",
    title: "Horas registradas",
    value: "40h 18m",
    trend: "up",
    description: "+5% vs semana anterior",
  },
  {
    id: "ind-2",
    title: "Horas facturables",
    value: "32h 10m",
    trend: "up",
    description: "+2h en proyectos cliente",
  },
  {
    id: "ind-3",
    title: "Tiempo en incidencias",
    value: "6h 45m",
    trend: "down",
    description: "-1h 20m respecto a la media",
  },
  {
    id: "ind-4",
    title: "Cambios aplicados",
    value: "14 ajustes",
    trend: "stable",
    description: "7 aprobados · 5 pendientes · 2 rechazados",
  },
]

const quickLinks: QuickLink[] = [
  {
    id: "ql-1",
    label: "Registrar jornada",
    description: "Añade entrada y salida manual para hoy",
    actionLabel: "Nuevo registro",
    icon: Clock,
  },
  {
    id: "ql-2",
    label: "Comparar versiones",
    description: "Visualiza diferencias entre cambios",
    actionLabel: "Abrir historial",
    icon: History,
  },
  {
    id: "ql-3",
    label: "Exportar reporte",
    description: "Descarga resumen semanal en CSV",
    actionLabel: "Descargar",
    icon: Download,
  },
]

const weeklyGoalHours = 40

const todayOverview = {
  dateLabel: "Miércoles, 12 feb 2024",
  plannedStart: "08:00",
  actualStart: "08:10",
  plannedEnd: "17:30",
  actualEnd: "17:45",
  breakMinutes: 45,
  totalHours: 8.92,
  overtime: 0.42,
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ")
}

function calculateDurationInHours(start: string, end: string, breakMinutes: number): number {
  const [startHours, startMinutes] = start.split(":").map(Number)
  const [endHours, endMinutes] = end.split(":").map(Number)

  if (
    Number.isNaN(startHours) ||
    Number.isNaN(startMinutes) ||
    Number.isNaN(endHours) ||
    Number.isNaN(endMinutes)
  ) {
    return 0
  }

  let diff = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
  if (diff < 0) {
    diff += 24 * 60
  }

  const netMinutes = Math.max(diff - breakMinutes, 0)
  return netMinutes / 60
}

function formatHours(value: number): string {
  const totalMinutes = Math.round(Math.abs(value) * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`
}

function formatHoursWithSign(value: number): string {
  if (value === 0) {
    return "±0h 00m"
  }
  const sign = value > 0 ? "+" : "-"
  return `${sign}${formatHours(value)}`
}

function formatBreak(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) {
    return `${remainingMinutes} min`
  }
  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}`
}

function ImpactBadge({ impact }: { impact: ChangeEvent["impact"] }) {
  const config: Record<ChangeEvent["impact"], { label: string; className: string }> = {
    positivo: {
      label: "Impacto positivo",
      className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    },
    neutro: {
      label: "Impacto neutro",
      className: "border-slate-500/50 bg-slate-500/10 text-slate-200",
    },
    negativo: {
      label: "Impacto a vigilar",
      className: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    },
  }

  const option = config[impact]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        option.className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {option.label}
    </span>
  )
}

function TrendPill({ trend }: { trend: ProductivityIndicator["trend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-200">
        <ArrowUpRight className="h-3 w-3" />
        Mejora
      </span>
    )
  }

  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200">
        <ArrowDownRight className="h-3 w-3" />
        Reduciendo
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-600/10 px-2 py-1 text-xs font-medium text-slate-200">
      <Timer className="h-3 w-3" />
      Estable
    </span>
  )
}

export default function TimeTrackingPage(): JSX.Element {
  const [activeView, setActiveView] = useState<DashboardView>("overview")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [logForm, setLogForm] = useState<LogFormState>({
    date: "2024-02-12",
    start: "08:00",
    end: "17:00",
    breakMinutes: 60,
    project: "Sprint Integraciones",
    notes: "",
  })

  const computedDuration = useMemo(
    () => calculateDurationInHours(logForm.start, logForm.end, logForm.breakMinutes),
    [logForm.start, logForm.end, logForm.breakMinutes],
  )

  const weeklyLoggedHours = useMemo(
    () => dailyRecords.reduce((total, record) => total + record.totalHours, 0),
    [],
  )

  const weeklyDifference = weeklyLoggedHours - weeklyGoalHours

  const handleNavigate = (view: DashboardView) => {
    setActiveView(view)
    setIsMenuOpen(false)
  }

  const handleLogFormChange = (field: keyof LogFormState, value: string | number) => {
    setLogForm((current) => ({
      ...current,
      [field]: field === "breakMinutes" && typeof value === "number" ? value : value,
    }))
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,_rgba(14,165,233,0.08),_transparent_55%),linear-gradient(200deg,_rgba(99,102,241,0.08),_transparent_60%)]" />

      {isMenuOpen ? (
        <div className="md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-800/70 bg-slate-900/95 px-4 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Panel de control</p>
                <p className="text-lg font-semibold text-white">Supershift</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/70 p-2 text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar navegación</span>
              </button>
            </div>
            <nav className="mt-6 space-y-4">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      isActive
                        ? "border-sky-400/60 bg-sky-500/10 text-white shadow-lg"
                        : "border-slate-700/60 bg-slate-900/70 text-slate-300 hover:border-slate-500/70 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-slate-800/80 p-2 text-slate-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col md:flex-row">
        <aside className="hidden w-full max-w-xs flex-col border-r border-slate-800/60 bg-slate-950/60 px-6 py-8 md:flex">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Panel de control</p>
            <p className="text-2xl font-semibold text-white">Supershift</p>
            <p className="mt-1 text-sm text-slate-400">
              Gestiona jornadas, versiones de cambios y horas facturables desde un único espacio.
            </p>
          </div>
          <nav className="mt-8 space-y-3">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full rounded-3xl border px-5 py-4 text-left transition",
                    isActive
                      ? "border-sky-400/70 bg-sky-500/10 text-white shadow-xl shadow-sky-500/20"
                      : "border-slate-800/70 bg-slate-900/70 text-slate-300 hover:border-slate-600/70 hover:text-white",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        "rounded-2xl p-2 text-slate-200",
                        isActive ? "bg-sky-500/20" : "bg-slate-800/80",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
          <div className="mt-auto space-y-4 pt-8">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">Última sincronización</p>
              <p className="mt-1 text-xs text-slate-400">12 feb 2024 · 19:45 · Backoffice Madrid</p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                <CalendarClock className="h-4 w-4" />
                Ver agenda semanal
              </button>
            </div>
            <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-transparent p-5">
              <p className="text-sm font-semibold text-white">Modo auditoría</p>
              <p className="mt-1 text-xs text-slate-300">
                Bloquea ediciones y genera un snapshot con toda la evidencia de cambios.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-500/20"
              >
                <ClipboardList className="h-4 w-4" />
                Activar snapshot
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/80 px-4 py-4 backdrop-blur-md sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/70 text-slate-200 transition hover:border-slate-500 hover:text-white md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir navegación</span>
                </button>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Planificador de jornadas</p>
                  <h1 className="text-xl font-semibold text-white md:text-2xl">
                    Panel de control de tiempo y cambios
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500/70 hover:text-white md:inline-flex"
                >
                  <Download className="h-4 w-4" />
                  Exportar semana
                </button>
                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/70 text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Ver notificaciones</span>
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-sky-500 px-1 text-[0.65rem] font-semibold text-white">
                    3
                  </span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {activeView === "overview" ? (
              <OverviewView
                onNavigate={handleNavigate}
                weeklyDifference={weeklyDifference}
                weeklyGoalHours={weeklyGoalHours}
                weeklyLoggedHours={weeklyLoggedHours}
                weeklyTotals={weeklyTotals}
                changeHistory={changeHistory}
                productivityIndicators={productivityIndicators}
                quickLinks={quickLinks}
                focusTasks={focusTasks}
              />
            ) : null}

            {activeView === "history" ? (
              <HistoryView
                changeHistory={changeHistory}
                snapshots={snapshots}
                adjustments={adjustments}
              />
            ) : null}

            {activeView === "hours" ? (
              <HoursView
                logForm={logForm}
                computedDuration={computedDuration}
                onLogFormChange={handleLogFormChange}
                dailyRecords={dailyRecords}
              />
            ) : null}

            {activeView === "reports" ? (
              <ReportsView
                productivityIndicators={productivityIndicators}
                weeklyGoalHours={weeklyGoalHours}
                weeklyLoggedHours={weeklyLoggedHours}
                dailyRecords={dailyRecords}
              />
            ) : null}

            {activeView === "settings" ? <SettingsView /> : null}
          </main>
        </div>
      </div>
    </div>
  )
}


type OverviewViewProps = {
  onNavigate: (view: DashboardView) => void
  weeklyLoggedHours: number
  weeklyGoalHours: number
  weeklyDifference: number
  weeklyTotals: WeeklyTotal[]
  changeHistory: ChangeEvent[]
  productivityIndicators: ProductivityIndicator[]
  quickLinks: QuickLink[]
  focusTasks: FocusTask[]
}

function OverviewView({
  onNavigate,
  weeklyDifference,
  weeklyGoalHours,
  weeklyLoggedHours,
  weeklyTotals,
  changeHistory,
  productivityIndicators,
  quickLinks,
  focusTasks,
}: OverviewViewProps): JSX.Element {
  const weeklyProgress = Math.min(100, Math.max(0, (weeklyLoggedHours / weeklyGoalHours) * 100))
  const quickLinkTargets: Record<string, DashboardView> = {
    "ql-1": "hours",
    "ql-2": "history",
    "ql-3": "reports",
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Resumen diario</p>
              <h2 className="text-2xl font-semibold text-white">{todayOverview.dateLabel}</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
              <Flame className="h-4 w-4" />
              Jornada saludable
            </span>
          </div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <dt className="text-slate-400">Entrada</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{todayOverview.actualStart}</dd>
              <p className="mt-1 text-xs text-slate-500">Planificado {todayOverview.plannedStart}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <dt className="text-slate-400">Salida</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{todayOverview.actualEnd}</dd>
              <p className="mt-1 text-xs text-slate-500">Previsto {todayOverview.plannedEnd}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <dt className="text-slate-400">Descanso</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{formatBreak(todayOverview.breakMinutes)}</dd>
              <p className="mt-1 text-xs text-slate-500">Incluye comida y pausas</p>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <dt className="text-slate-400">Horas del día</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{formatHours(todayOverview.totalHours)}</dd>
              <p className="mt-1 text-xs text-slate-500">Extra {formatHoursWithSign(todayOverview.overtime)}</p>
            </div>
          </dl>
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Progreso semanal</p>
                <p className="text-lg font-semibold text-white">{formatHours(weeklyLoggedHours)} registrados</p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  weeklyDifference === 0
                    ? "border-slate-600/60 bg-slate-700/20 text-slate-200"
                    : weeklyDifference > 0
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/50 bg-rose-500/10 text-rose-200",
                )}
              >
                <TrendingUp className="h-3 w-3" />
                {formatHoursWithSign(weeklyDifference)} vs objetivo
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-5">
            {weeklyTotals.map((day) => {
              const trendClass =
                day.difference === 0
                  ? "text-slate-300"
                  : day.difference > 0
                    ? "text-emerald-300"
                    : "text-rose-300"
              return (
                <li
                  key={day.day}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-inner shadow-slate-900/40"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">{day.day}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatHours(day.logged)}</p>
                  <p className="text-xs text-slate-500">Plan {formatHours(day.planned)}</p>
                  <p className={cn("mt-2 text-xs font-semibold", trendClass)}>
                    {formatHoursWithSign(day.difference)}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Accesos directos</h3>
                <p className="text-sm text-slate-400">Lanza acciones frecuentes en segundos.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {quickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => onNavigate(quickLinkTargets[link.id] ?? "overview")}
                    className="flex w-full items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-left transition hover:border-sky-500/60 hover:text-white"
                  >
                    <span className="rounded-xl bg-slate-800/70 p-2 text-slate-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="text-sm font-semibold text-white">{link.label}</span>
                      <span className="block text-xs text-slate-400">{link.description}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-300">
                        {link.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Próximas acciones</h3>
            <p className="text-sm text-slate-400">Coordina entregas y validaciones clave.</p>
            <ul className="mt-4 space-y-3">
              {focusTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                >
                  <p className="text-sm font-semibold text-white">{task.title}</p>
                  <p className="text-xs text-slate-400">{task.schedule}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
                    <UserCheck className="h-4 w-4 text-sky-300" />
                    {task.owner}
                    <span className="ml-2 rounded-full border border-slate-700/60 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-slate-300">
                      {task.status}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Cambios recientes</h3>
              <p className="text-sm text-slate-400">
                Repasa qué se modificó frente a la versión anterior y quién lo aprobó.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("history")}
              className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-100 transition hover:bg-sky-500/20"
            >
              Ver historial completo
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {changeHistory.slice(0, 3).map((change) => (
              <article
                key={change.id}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{change.summary}</p>
                    <p className="text-xs text-slate-400">
                      {change.timestamp} · {change.author}
                    </p>
                  </div>
                  <ImpactBadge impact={change.impact} />
                </div>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                  {change.details.slice(0, 3).map((detail, index) => (
                    <div
                      key={`${change.id}-${index}`}
                      className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3"
                    >
                      <dt className="text-[0.7rem] uppercase tracking-wide text-slate-400">{detail.label}</dt>
                      <dd className="mt-1 text-sm font-medium text-white">{detail.after}</dd>
                      <p className="text-[0.7rem] text-slate-500">Antes {detail.before}</p>
                      {detail.note ? (
                        <p className="mt-1 text-[0.7rem] text-sky-300">{detail.note}</p>
                      ) : null}
                    </div>
                  ))}
                </dl>
                {change.comment ? (
                  <p className="mt-3 text-xs text-slate-400">{change.comment}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <h3 className="text-xl font-semibold text-white">Indicadores clave</h3>
          <p className="text-sm text-slate-400">
            Seguimiento de carga, facturación y foco operativo en tiempo real.
          </p>
          <div className="mt-6 space-y-4">
            {productivityIndicators.slice(0, 2).map((indicator) => (
              <div
                key={indicator.id}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{indicator.title}</p>
                  <TrendPill trend={indicator.trend} />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{indicator.value}</p>
                <p className="mt-1 text-xs text-slate-400">{indicator.description}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
            >
              Abrir reportes
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {productivityIndicators.map((indicator) => (
          <article
            key={indicator.id}
            className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{indicator.title}</p>
              <TrendPill trend={indicator.trend} />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">{indicator.value}</p>
            <p className="mt-2 text-sm text-slate-400">{indicator.description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}


type HistoryViewProps = {
  changeHistory: ChangeEvent[]
  snapshots: Snapshot[]
  adjustments: Adjustment[]
}

function HistoryView({ changeHistory, snapshots, adjustments }: HistoryViewProps): JSX.Element {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Historial detallado</h2>
              <p className="text-sm text-slate-400">
                Cada modificación queda registrada con los valores anteriores y los nuevos.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Exportar evidencia
            </button>
          </div>
          <div className="relative mt-6">
            <div
              className="absolute left-5 top-2 hidden h-[calc(100%-1rem)] border-l border-slate-800/60 md:block"
              aria-hidden="true"
            />
            <div className="space-y-6">
              {changeHistory.map((change) => (
                <article
                  key={change.id}
                  className="relative rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6"
                >
                  <span className="absolute -left-[0.4rem] top-7 hidden h-3 w-3 rounded-full border-2 border-sky-400 bg-slate-950 md:block" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{change.summary}</p>
                      <p className="text-xs text-slate-400">
                        {change.timestamp} · {change.author} · {change.role}
                      </p>
                    </div>
                    <ImpactBadge impact={change.impact} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    {change.details.map((detail, index) => (
                      <div
                        key={`${change.id}-detail-${index}`}
                        className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3"
                      >
                        <dt className="text-[0.7rem] uppercase tracking-wide text-slate-400">{detail.label}</dt>
                        <dd className="mt-1 text-sm font-semibold text-white">{detail.after}</dd>
                        <p className="text-[0.7rem] text-slate-500">Antes {detail.before}</p>
                        {detail.note ? (
                          <p className="mt-1 text-[0.7rem] text-sky-300">{detail.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </dl>
                  {change.comment ? (
                    <p className="mt-4 text-xs text-slate-400">{change.comment}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Versiones guardadas</h3>
            <p className="text-sm text-slate-400">Compara instantáneas completas de la planificación.</p>
            <div className="mt-4 space-y-4">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{snapshot.title}</p>
                      <p className="text-xs text-slate-400">{snapshot.createdAt}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-100"
                    >
                      <Download className="h-3 w-3" />
                      Exportar
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-300">
                    {snapshot.highlights.map((highlight, index) => (
                      <li key={`${snapshot.id}-highlight-${index}`} className="flex items-center gap-2">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Solicitudes y ajustes</h3>
            <p className="text-sm text-slate-400">Estado actualizado de permisos y cambios manuales.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {adjustments.map((adjustment) => {
                const statusClass =
                  adjustment.status === "Aprobado"
                    ? "text-emerald-300"
                    : adjustment.status === "Rechazado"
                      ? "text-rose-300"
                      : "text-amber-300"
                return (
                  <li
                    key={adjustment.id}
                    className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                  >
                    <p className="text-sm font-semibold text-white">{adjustment.title}</p>
                    <p className="text-xs text-slate-400">
                      Solicitado por {adjustment.requestedBy} · {adjustment.requestedAt}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className={cn("rounded-full border px-2 py-0.5", statusClass, "border-current")}>{adjustment.status}</span>
                      <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                        Diferencia {adjustment.difference}
                      </span>
                      <span className="text-slate-400">Aplicación {adjustment.appliedAt}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{adjustment.justification}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}


type HoursViewProps = {
  logForm: LogFormState
  computedDuration: number
  onLogFormChange: (field: keyof LogFormState, value: string | number) => void
  dailyRecords: DailyRecord[]
}

function HoursView({
  logForm,
  computedDuration,
  onLogFormChange,
  dailyRecords,
}: HoursViewProps): JSX.Element {
  const handleNumberChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Registrar jornada</h2>
            <p className="text-sm text-slate-400">
              Captura entrada, salida y notas de tu turno para mantener totales al día.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200">
            <Clock className="h-4 w-4" />
            {formatHours(computedDuration)} previstos
          </span>
        </div>
        <form className="mt-6 space-y-6" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Fecha</span>
              <input
                type="date"
                value={logForm.date}
                onChange={(event) => onLogFormChange("date", event.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Hora de entrada</span>
              <input
                type="time"
                value={logForm.start}
                onChange={(event) => onLogFormChange("start", event.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Hora de salida</span>
              <input
                type="time"
                value={logForm.end}
                onChange={(event) => onLogFormChange("end", event.target.value)}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Descanso (min)</span>
              <input
                type="number"
                min={0}
                value={logForm.breakMinutes}
                onChange={(event) => onLogFormChange("breakMinutes", handleNumberChange(event.target.value))}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <span className="text-sm text-slate-400">Proyecto o contexto</span>
              <input
                type="text"
                value={logForm.project}
                onChange={(event) => onLogFormChange("project", event.target.value)}
                placeholder="Ej. Integraciones API cliente"
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <span className="text-sm text-slate-400">Notas</span>
              <textarea
                value={logForm.notes}
                onChange={(event) => onLogFormChange("notes", event.target.value)}
                rows={3}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                placeholder="Añade incidencias, entregables o motivos de cambios."
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm text-slate-400">Horas calculadas</p>
              <p className="text-2xl font-semibold text-white">{formatHours(computedDuration)}</p>
              <p className="text-xs text-slate-500">Incluye {formatBreak(logForm.breakMinutes)} de descanso</p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-6 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20"
            >
              <Clock className="h-4 w-4" />
              Guardar registro
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Jornadas de la semana</h2>
            <p className="text-sm text-slate-400">Revisa entradas, salidas y totales diarios en un vistazo.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800/70">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Día
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Entrada
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Salida
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Descanso
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Proyecto
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Comparativa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {dailyRecords.map((record) => {
                const comparisonClass = record.comparison.startsWith("+")
                  ? "text-emerald-300"
                  : record.comparison.startsWith("-")
                    ? "text-rose-300"
                    : "text-slate-300"
                return (
                  <tr key={record.id} className="transition hover:bg-slate-900/60">
                    <td className="px-4 py-4 font-medium text-white">{record.date}</td>
                    <td className="px-4 py-4 text-slate-300">{record.start}</td>
                    <td className="px-4 py-4 text-slate-300">{record.end}</td>
                    <td className="px-4 py-4 text-slate-300">{formatBreak(record.breakMinutes)}</td>
                    <td className="px-4 py-4 text-slate-200">{formatHours(record.totalHours)}</td>
                    <td className="px-4 py-4 text-slate-300">{record.project}</td>
                    <td className={cn("px-4 py-4 font-medium", comparisonClass)}>{record.comparison}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}


type ReportsViewProps = {
  productivityIndicators: ProductivityIndicator[]
  weeklyGoalHours: number
  weeklyLoggedHours: number
  dailyRecords: DailyRecord[]
}

function ReportsView({
  productivityIndicators,
  weeklyGoalHours,
  weeklyLoggedHours,
  dailyRecords,
}: ReportsViewProps): JSX.Element {
  const totalBreakMinutes = dailyRecords.reduce((total, record) => total + record.breakMinutes, 0)
  const averageDailyHours = weeklyLoggedHours / dailyRecords.length
  const monthlyProjectionHours = weeklyLoggedHours * 4
  const projectedOvertime = Math.max(weeklyLoggedHours - weeklyGoalHours, 0) * 4
  const utilization = Math.min(150, Math.max(0, (weeklyLoggedHours / weeklyGoalHours) * 100))

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {productivityIndicators.map((indicator) => (
          <article
            key={indicator.id}
            className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{indicator.title}</p>
              <TrendPill trend={indicator.trend} />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">{indicator.value}</p>
            <p className="mt-2 text-sm text-slate-400">{indicator.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Comparativa diaria</h2>
              <p className="text-sm text-slate-400">Visualiza horarios reales frente a lo planificado.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200">
              <CalendarDays className="h-4 w-4" />
              {formatHours(weeklyLoggedHours)} semanales
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {dailyRecords.map((record) => {
              const comparisonClass = record.comparison.startsWith("+")
                ? "text-emerald-300"
                : record.comparison.startsWith("-")
                  ? "text-rose-300"
                  : "text-slate-300"
              const loadPercentage = Math.min(100, Math.max(0, (record.totalHours / 10) * 100))
              return (
                <article
                  key={record.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{record.date}</p>
                      <p className="text-xs text-slate-400">{record.label} · {record.project}</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", comparisonClass, "border-current")}>{record.comparison}</span>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">Horario</p>
                      <p className="text-sm text-white">{record.start} – {record.end}</p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">Descanso</p>
                      <p className="text-sm text-white">{formatBreak(record.breakMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">Horas totales</p>
                      <p className="text-sm text-white">{formatHours(record.totalHours)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500"
                      style={{ width: `${loadPercentage}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Objetivo semanal</h3>
            <p className="text-sm text-slate-400">Controla el avance frente al objetivo planificado.</p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Horas registradas</p>
                <p className="text-xl font-semibold text-white">{formatHours(weeklyLoggedHours)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Objetivo</p>
                <p className="text-xl font-semibold text-white">{formatHours(weeklyGoalHours)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Diferencia</p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    weeklyLoggedHours >= weeklyGoalHours ? "text-emerald-300" : "text-amber-300",
                  )}
                >
                  {formatHoursWithSign(weeklyLoggedHours - weeklyGoalHours)}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500"
                style={{ width: `${utilization}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Tiempo de descanso acumulado {formatBreak(totalBreakMinutes)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Proyección mensual</h3>
            <p className="text-sm text-slate-400">Planifica disponibilidad y carga estimada.</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Horas proyectadas</p>
                <p className="text-lg font-semibold text-white">{formatHours(monthlyProjectionHours)}</p>
                <p className="text-xs text-slate-500">Basado en las últimas 4 semanas</p>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Horas extra estimadas</p>
                <p className="text-lg font-semibold text-white">{formatHours(projectedOvertime)}</p>
                <p className="text-xs text-slate-500">Si se mantiene la tendencia actual</p>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Promedio diario</p>
                <p className="text-lg font-semibold text-white">{formatHours(averageDailyHours)}</p>
                <p className="text-xs text-slate-500">Incluye descansos registrados</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


function SettingsView(): JSX.Element {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-semibold text-white">Alertas y recordatorios</h2>
        <p className="text-sm text-slate-400">Configura cómo recibir avisos sobre fichajes y cambios.</p>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Recordarme fichar entrada</p>
              <p className="text-xs text-slate-400">Envío push si no hay registro tras 10 minutos.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 text-sky-400 focus:ring-0"
              defaultChecked
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Aviso de horas extra</p>
              <p className="text-xs text-slate-400">Notifica cuando supere el 120% del objetivo diario.</p>
            </div>
            <input type="checkbox" className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 focus:ring-0" defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Resumen semanal por correo</p>
              <p className="text-xs text-slate-400">Incluye comparativa con la semana anterior.</p>
            </div>
            <input type="checkbox" className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 focus:ring-0" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white">Plantillas de jornada</h3>
          <p className="text-sm text-slate-400">Define horarios base para aplicarlos en bloque.</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <p className="font-semibold text-white">Turno estándar · 8h</p>
              <p className="text-xs text-slate-400">08:00 – 17:00 · Descanso 60 min</p>
            </li>
            <li className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <p className="font-semibold text-white">Turno intensivo · 6h</p>
              <p className="text-xs text-slate-400">07:00 – 13:30 · Descanso 30 min</p>
            </li>
          </ul>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20"
          >
            <ClipboardList className="h-4 w-4" />
            Crear nueva plantilla
          </button>
        </div>
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white">Automatizaciones</h3>
          <p className="text-sm text-slate-400">Aplica reglas para aprobar cambios repetitivos.</p>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <span>
                <span className="block font-semibold text-white">Aprobar permisos menores a 2h</span>
                <span className="text-xs text-slate-400">Solo con justificante adjunto.</span>
              </span>
              <input type="checkbox" className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 focus:ring-0" defaultChecked />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <span>
                <span className="block font-semibold text-white">Notificar cambios críticos</span>
                <span className="text-xs text-slate-400">Alertar a coordinación si impacta facturación.</span>
              </span>
              <input type="checkbox" className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 focus:ring-0" defaultChecked />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <span>
                <span className="block font-semibold text-white">Auto-generar snapshot semanal</span>
                <span className="text-xs text-slate-400">Cada viernes a las 17:00.</span>
              </span>
              <input type="checkbox" className="h-5 w-9 rounded-full border-2 border-slate-600 bg-slate-800 focus:ring-0" />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-white">Preferencias de historial</h3>
        <p className="text-sm text-slate-400">Elige la información que se incluirá en cada versión guardada.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-900" defaultChecked />
            <span>Comparativa de horas por proyecto</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-900" defaultChecked />
            <span>Detalle de permisos y ausencias</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
            <span>Registro de comentarios internos</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
            <span>Adjuntar archivos de soporte</span>
          </label>
        </div>
      </section>
    </div>
  )
}

