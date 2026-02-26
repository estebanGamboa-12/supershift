-- Añade columna para marcar si ya se envió el correo de bienvenida al usuario.
-- Ejecutar en Supabase SQL Editor si usas public.users.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

COMMENT ON COLUMN public.users.welcome_email_sent_at IS 'Fecha en que se envió el primer correo de bienvenida (una sola vez por usuario).';
