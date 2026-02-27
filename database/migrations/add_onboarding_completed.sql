-- Onboarding tour: estado por usuario (usa auth.users, no requiere public.users).
-- Ejecutar en Supabase SQL Editor.

-- Tabla para marcar si el usuario ya completó o saltó el tour de bienvenida
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed   boolean NOT NULL DEFAULT false,
  onboarding_version     integer NOT NULL DEFAULT 1,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON public.user_onboarding (user_id);

COMMENT ON TABLE public.user_onboarding IS 'Estado del tour de bienvenida por usuario (auth.users).';
COMMENT ON COLUMN public.user_onboarding.onboarding_completed IS 'True cuando el usuario completó o saltó el tour.';
COMMENT ON COLUMN public.user_onboarding.onboarding_version IS 'Versión del tour vista; para re-lanzar tours en el futuro.';

-- RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Políticas: solo el propio usuario (service role puede leer/escribir para la API)
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
