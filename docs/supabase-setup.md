# Importar la base de datos de Corp en Supabase

Este proyecto incluye un volcado SQL compatible con Supabase (MySQL). La base de datos conserva el identificador `supershift` y el archivo `supershift.sql` para mantener la compatibilidad con las integraciones existentes. Sigue los pasos para crear la base de datos y cargar la estructura junto con los datos de ejemplo.

## 1. Crear un proyecto en Supabase
1. Entra en [Supabase](https://supabase.com/) e inicia sesión.
2. Crea un nuevo proyecto seleccionando la opción **Database** con motor MySQL.
3. Copia las credenciales de conexión (host, puerto, usuario y contraseña) que muestra Supabase.

## 2. Descargar el script SQL
El volcado se encuentra en el repositorio en `database/supershift.sql`. Puedes abrir el archivo directamente desde GitHub o descargarlo usando Git.

## 3. Importar el SQL con la CLI de Supabase
Si tienes la CLI de Supabase instalada, puedes importar el archivo ejecutando:

```bash
supabase db push --db-url "mysql://USER:PASSWORD@HOST:PORT/supershift" --file database/supershift.sql
```

Sustituye `USER`, `PASSWORD`, `HOST` y `PORT` por los valores de tu proyecto. El comando creará la base de datos `supershift` (si no existe), todas las tablas y poblará los datos de ejemplo.

## 4. Importar usando un cliente MySQL
Si prefieres un cliente MySQL (como TablePlus, DBeaver o la CLI oficial):

```bash
mysql -h HOST -P PORT -u USER -p < database/supershift.sql
```

Introduce la contraseña cuando se solicite. El script incluye la creación de la base de datos, por lo que no necesitas crearla manualmente.

## 5. Verificar la importación
Tras ejecutar el script, verifica que las tablas `users`, `teams`, `calendars`, `shift_types`, entre otras, están disponibles y contienen los datos de ejemplo. De esta forma podrás comenzar a usar Corp en Supabase inmediatamente.

## 6. Usuarios y credenciales de ejemplo
El script crea un usuario administrador con el correo `admin@supershift.local` y una cuenta de ejemplo `esteban@example.com`. Puedes iniciar sesión con cualquiera de ellas después de configurar los hashes de contraseña que utilice tu implementación.

> **Nota:** Los hashes de contraseña incluidos son valores ficticios. Si tu aplicación usa un esquema distinto, actualiza las contraseñas una vez importado el script.

## 7. Configurar credenciales en la aplicación

Una vez creada la base de datos, añade las siguientes variables de entorno en tu `.env.local` para que la API de Corp se conecte directamente a Supabase:

- `SUPABASE_URL`: la URL del proyecto (aparece en la sección **Project Settings → API**).
- `SUPABASE_SERVICE_ROLE_KEY`: la clave *service role* con permisos de lectura/escritura.
- `SUPABASE_ANON_KEY`: opcional, para sobreescribir la clave pública en caso de que quieras usar otra.

También debes mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` si necesitas exponer la configuración en el cliente.
