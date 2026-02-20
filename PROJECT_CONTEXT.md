# Contexto del proyecto — Planloop (SaaS)

Documento de contexto para dar a GPT, Gemini u otro asistente y que entienda el producto y el código sin ambigüedades.

---

## 1. Qué es el producto

- **Nombre comercial:** Planloop  
- **Nombre interno del repo / DB:** supershift (legacy, se mantiene en código y base de datos).  
- **Una frase:** SaaS para planificar y gestionar turnos de equipos (guardias, clínicas, barberías, etc.) con calendario, plantillas reutilizables y rotaciones circulares.

---

## 2. Stack técnico

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, @dnd-kit (drag and drop).  
- **Backend / datos:** Supabase (PostgreSQL + Auth). La documentación antigua menciona MySQL; en la práctica el proyecto usa Supabase.  
- **Idioma de la UI:** español.  
- **PWA:** instalable, con service worker y soporte offline básico.

---

## 3. Conceptos clave del dominio

- **Turno (shift):** bloque de trabajo en una fecha con hora inicio/fin (o todo el día). Tiene tipo (WORK, REST, NIGHT, VACATION, CUSTOM), nota, etiqueta, color y “pluses” (nocturnidad, festivo, etc.).  
- **Plantilla de turno (shift template):** modelo reutilizable (título, icono, color, hora inicio/fin, ubicación). El usuario crea plantillas y luego las usa para crear turnos o asignarlas en rotaciones.  
- **Rotación (rotation template):** ciclo de N días (p. ej. 7 o 31) donde cada día se asigna una plantilla de turno (o “sin turno”). Se visualiza como un círculo de días; se usa para guardias, ciclos 4+2, etc.  
- **Calendario:** agrupación de turnos; hay calendarios por equipo o usuario.  
- **Usuario:** identificado por Supabase Auth (UUID). Tiene resumen (nombre, email, avatar, timezone, calendarId) usado en toda la app.

---

## 4. Flujos de usuario principales

1. **Autenticación:** login con Supabase; opcionalmente “usuarios de ejemplo” (admin@supershift.local, esteban@example.com) en entornos de desarrollo.  
2. **Panel principal (home):** calendario (vista día o mes), resumen de horas, próximos turnos, pestañas móviles (Calendario, Horas, Historial, Estadísticas, Equipo, Ajustes).  
3. **Crear/editar turnos:** en el calendario (clic o arrastrar en la vista día); máximo 2 turnos por día; drag & drop con long-press en móvil (dnd-kit).  
4. **Plantillas:** en `/templates` pestaña “Plantillas de turnos”: crear/editar plantillas (título, ubicación, icono, color, hora inicio/fin). Sin descanso programado ni recordatorios en la UI actual.  
5. **Rotaciones:** en `/templates` pestaña “Rotaciones”: crear/editar rotaciones (nombre, descripción, número de días, asignación por día con plantillas). Modal con círculo de días a la izquierda y formulario a la derecha.  
6. **Equipo:** ver miembros, asignar turnos; invitación por enlace (`/teams/join/[token]`).  
7. **Perfil y preferencias:** zona horaria, preferencias de visualización, etc.

---

## 5. Modelo de datos (resumen)

- **users:** id (UUID), nombre, email, avatar, timezone, calendar_id (Supabase Auth + perfil).  
- **calendars:** id, name, team_id, owner_user_id, timezone, color.  
- **shifts:** id, calendar_id, assignee_user_id, tipo, start_at, end_at, all_day, note, label, color, pluses (night, holiday, etc.).  
- **shift_template_presets:** id, user_id, title, icon, **color**, start_time, end_time, location (break_minutes, alert_minutes en DB pero no usados en UI).  
- **rotation_template_presets:** id, user_id, title, icon, description, days_count.  
- **rotation_template_preset_assignments:** template_id, day_index, shift_template_id (qué plantilla toca cada día del ciclo).

La columna `color` en plantillas de turno se añade con `database/add_color_to_shift_templates.sql` si no existe.

---

## 6. Rutas y páginas importantes

- `/` — Panel principal (calendario, resumen, pestañas).  
- `/templates` — Biblioteca: pestaña “Plantillas de turnos” y “Rotaciones”.  
- `/profile` — Perfil de usuario.  
- `/auth`, `/auth/callback`, `/reset-password` — Login y flujo de contraseña.  
- `/onboarding` — Onboarding de nuevos usuarios.  
- `/teams/join/[token]` — Unirse a equipo por enlace.  
- `/custom-cycle-builder` — Constructor de ciclos personalizados.  
- `/productos` — Página de productos (si aplica).

---

## 7. Componentes clave (referencia rápida)

- **Calendario:** `DayView.tsx` (vista día, drag & drop de turnos, redimensionar), `MiniCalendar.tsx` (selector de fecha).  
- **Modales:** `EditShiftModal.tsx` (editar turno), `ShiftTemplateModal.tsx` (crear/editar plantilla de turno, con color e icono), `EditRotationModal.tsx` (crear/editar rotación, círculo de días + formulario).  
- **Dashboard:** `DashboardHeader`, `MobileNavigation`, `MobileSideMenu`, `MobileAddShiftSheet`; pestañas en `dashboard/mobile-tabs/`.  
- **Tarjetas:** `ShiftTemplateCard.tsx` (muestra plantilla con color en icono), `TeamSpotlight`, `NextShiftCard`, etc.  
- **Hooks/datos:** `useShiftTemplates`, `useRotationTemplates` (Supabase); lógica de turnos en `page.tsx` y APIs bajo `/api/`.

---

## 8. Convenciones y detalles útiles

- **Idioma:** textos de interfaz y mensajes en español.  
- **Responsive:** primera experiencia móvil (nav abajo, menú lateral derecho, calendario día por defecto en móvil).  
- **Turnos por día:** máximo 2 por día en la validación de la UI.  
- **Horario del día en vista día:** 00:00–23:59.  
- **Colores:** plantillas tienen `color` (hex); se usa en tarjetas y en el modal de rotación para diferenciar turnos.  
- **Supabase:** RLS habilitado; políticas por `user_id` en plantillas y rotaciones.

---

## 9. Cómo usar este contexto

- Pegar este documento (o las secciones relevantes) en el primer mensaje a GPT o Gemini cuando hables del proyecto.  
- Para tareas concretas, añadir: ruta o nombre del componente, tipo de cambio (nueva feature, bug, refactor) y si toca solo frontend, solo backend o ambos.

Ejemplo de prompt inicial:  
“Estoy trabajando en el proyecto Planloop (SaaS de turnos). Aquí tienes el contexto: [pegar PROJECT_CONTEXT.md]. Necesito que …”
