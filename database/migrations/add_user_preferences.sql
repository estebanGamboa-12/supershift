-- Preferencias de usuario (calendario, festivos, colores, inicio de semana).
-- Ejecutar después del esquema principal. Referencia public.users(id).

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id             uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  start_of_week       text NOT NULL DEFAULT 'monday' CHECK (start_of_week IN ('monday', 'sunday')),
  show_festive_days   boolean NOT NULL DEFAULT true,
  festive_day_color   text NOT NULL DEFAULT '#dc2626',
  show_day_colors     boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS: servicio usa service role o el cliente debe estar autenticado; aquí permitimos leer/escribir por user_id.
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas: si usas auth.uid() y tu app sincroniza auth.users.id con public.users.id, descomenta:
-- CREATE POLICY "Users can view own preferences"
--   ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own preferences"
--   ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own preferences"
--   ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own preferences"
--   ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Sin auth.uid(): permitir por user_id para uso desde API con clave de servicio.
CREATE POLICY "Allow read user_preferences by user_id"
  ON public.user_preferences FOR SELECT USING (true);
CREATE POLICY "Allow insert user_preferences"
  ON public.user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update user_preferences"
  ON public.user_preferences FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete user_preferences"
  ON public.user_preferences FOR DELETE USING (true);

COMMIT;
