# Supershift

Aplicación Next.js que muestra la planificación de turnos y ahora obtiene los datos desde una base de datos MySQL alojada en un servidor local XAMPP a través de una API interna.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Entorno XAMPP con MySQL/MariaDB activo

## Configuración de la base de datos

1. Inicia el servidor MySQL de XAMPP.
2. Importa el fichero [`supershift.sql`](./supershift.sql) desde phpMyAdmin u otra herramienta para crear la base de datos y sus tablas.
3. Crea un usuario con permisos de lectura y escritura (por defecto se usa `root` sin contraseña, tal como viene en XAMPP).

## Variables de entorno

Copia el archivo [`\.env.example`](./.env.example) a `\.env.local` y ajusta los valores según tu instalación:

```bash
cp .env.example .env.local
```

Variables disponibles:

- `DB_HOST`: host de MySQL (normalmente `127.0.0.1`)
- `DB_PORT`: puerto de MySQL (por defecto `3306`)
- `DB_USER`: usuario con acceso a la base de datos
- `DB_PASSWORD`: contraseña del usuario
- `DB_NAME`: nombre de la base de datos importada (`supershift`)

## Instalación de dependencias

Instala las dependencias del proyecto (incluyendo `mysql2` para la conexión a la base de datos):

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

La API expone los turnos almacenados en la base de datos a través de `GET /api/shifts`. La ruta consulta la tabla `shifts` y devuelve los campos necesarios para la interfaz de usuario.

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
