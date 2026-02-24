-- Tabla para códigos de recuperación de contraseña (flujo sin enlace mágico).
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (public schema).

CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email
  ON public.password_reset_codes (email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at
  ON public.password_reset_codes (expires_at);

-- Opcional: limpiar códigos expirados periódicamente (o hazlo desde la API al verificar).
-- DELETE FROM public.password_reset_codes WHERE expires_at < now();
