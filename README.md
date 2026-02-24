# Planloop

Aplicación Next.js que muestra la planificación de turnos bajo la marca Planloop y obtiene los datos desde una base de datos MySQL alojada en Supabase a través de una API interna. La base de datos mantiene el nombre original (`supershift`) y el volcado incluido en el repositorio para conservar compatibilidad.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Proyecto Supabase con base de datos MySQL activa

## Configuración de la base de datos

1. Crea un nuevo proyecto MySQL en Supabase.
2. Importa el fichero [`supershift.sql`](./supershift.sql) (o el situado en [`database/supershift.sql`](./database/supershift.sql)) usando la CLI de Supabase o cualquier cliente MySQL apuntando al proyecto.
3. Copia las credenciales del proyecto (URL y claves) para configurarlas en la aplicación.

## Variables de entorno

Copia el archivo [`\.env.example`](./.env.example) a `\.env.local` y ajusta los valores según tu instalación:

```bash
cp .env.example .env.local
```

Variables disponibles:

- `SUPABASE_URL`: URL base de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: clave de servicio (server role) con permisos para las operaciones de escritura
- `SUPABASE_ANON_KEY`: clave pública opcional si deseas sobreescribir la proporcionada por defecto
- `DEFAULT_CALENDAR_ID`: identificador del calendario por defecto al crear turnos (usa `2` para el calendario de Esteban incluido en la base de datos de ejemplo)
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase si deseas habilitar integraciones desde el cliente
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública (anon) del proyecto Supabase
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: (opcional) clave pública VAPID para notificaciones push. Genera un par con `npx web-push generate-vapid-keys` y pon la clave pública aquí
- `NEXT_PUBLIC_SITE_URL` o `SITE_URL`: (recomendado para recuperación de contraseña) URL base de la app (ej. `https://tudominio.com` o `http://localhost:3000`). El correo de recuperación enviará un enlace a `{SITE_URL}/auth/callback`. En el dashboard de Supabase (Authentication → URL Configuration) añade esa URL en **Redirect URLs** (ej. `https://tudominio.com/auth/callback`).

### Usuarios de ejemplo

La importación crea dos cuentas listas para iniciar sesión en la aplicación:

- **Admin Supershift** → correo `admin@supershift.local` y contraseña `admin123` (nombre heredado de la base de datos original).
- **Esteban** → correo `esteban@example.com` y contraseña `supershift`.

## Funcionalidades principales

- **Calendario mensual y semanal interactivo**. Visualiza los turnos por colores para identificar rápidamente la carga de trabajo y los tipos de jornada.
- **Panel del propietario**. Permite ver al equipo completo, asignar turnos y gestionar los roles disponibles.
- **Modo de vista individual**. Cada usuario accede únicamente a sus turnos y al total de horas trabajadas.
- **Plantillas de turnos y repetición automática (opcional)**. Acelera la creación de horarios recurrentes partiendo de configuraciones predefinidas.
- **Historial de horas trabajadas y registro de asistencia diario**. Mantiene un seguimiento detallado de la actividad por empleado y facilita auditorías posteriores.

## Instalación de dependencias

Instala las dependencias del proyecto (incluyendo `@supabase/supabase-js` para la conexión con Supabase):

```bash
npm install
```

Si el registro de npm no está accesible desde tu entorno, instala el paquete manualmente cuando tengas conexión:

```bash
npm install mysql2
```

## Ejecución en desarrollo

Inicia el servidor de desarrollo de Next.js:

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## API interna

La API expone los turnos almacenados en la base de datos a través de rutas REST bajo `/api/shifts`:

- `GET /api/shifts`: devuelve todos los turnos ordenados por fecha.
- `POST /api/shifts`: crea un nuevo turno en el calendario indicado por `DEFAULT_CALENDAR_ID`.
- `PATCH /api/shifts/:id`: actualiza la fecha, el tipo y/o la nota de un turno existente.
- `DELETE /api/shifts/:id`: elimina un turno y sus notas asociadas.

Ejemplo de respuesta para `GET /api/shifts`:

```json
{
  "shifts": [
    {
      "id": 1,
      "date": "2025-10-01",
      "type": "WORK",
      "note": "Entrega de reporte mensual"
    }
  ]
}
```

En caso de error de conexión, la API responde con un código 500 y un mensaje descriptivo en formato JSON.

## Notas

- El archivo `src/data/shifts.json` se mantiene como respaldo y como ejemplo de estructura de datos.
- Después de modificar dependencias en `package.json`, ejecuta `npm install` para sincronizar `package-lock.json`.
