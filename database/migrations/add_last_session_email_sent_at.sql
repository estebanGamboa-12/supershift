-- Evita enviar el correo "sesión iniciada" en cada llamada a /api/auth/login (máx. 1 por hora por usuario).
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_session_email_sent_at timestamptz;

COMMENT ON COLUMN public.users.last_session_email_sent_at IS 'Última vez que se envió el correo "Has iniciado sesión"; se usa para limitar a 1 cada 200 horas.';
