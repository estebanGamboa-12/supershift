-- Sistema de créditos: saldo por usuario y registro de consumo.
-- Plan gratis: 100 créditos. Acciones consumen 10–20 según tipo.
-- Ejecutar en Supabase SQL Editor.

-- Saldo en users (por usuario)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credit_balance integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.users.credit_balance IS 'Créditos disponibles. Plan gratis: 100. Se descuenta por crear turnos, plantillas, etc.';

-- Historial de movimientos (para auditoría y soporte)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount            integer NOT NULL,
  action_type       text NOT NULL,
  reference_id      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON public.credit_transactions (created_at DESC);

COMMENT ON TABLE public.credit_transactions IS 'Cada fila: amount negativo = gasto (ej. -10 por crear turno). action_type: create_shift, create_shift_template, create_rotation_template, add_extra, etc.';

-- Opcional: dar 100 créditos a usuarios existentes que tengan NULL (por si se añadió la columna sin DEFAULT)
-- UPDATE public.users SET credit_balance = 100 WHERE credit_balance IS NULL;
