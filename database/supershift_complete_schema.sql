-- =============================================================================
-- Supershift - Esquema completo para Supabase (PostgreSQL 15+)
-- Un único script con todas las tablas, índices, RLS y datos esenciales.
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
--
-- Tablas usadas por la app:
--   shift_types, users, user_api_keys, password_reset_codes, user_profile_history,
--   teams, calendars, team_members, push_subscriptions, team_invites,
--   rotation_templates, rotation_steps, rotation_runs, shifts, shift_notes,
--   shift_template_presets, rotation_template_presets, rotation_template_preset_assignments,
--   user_custom_shift_types, user_shift_extras, user_hourly_rates, user_patterns.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Limpieza (orden inverso por dependencias)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.rotation_template_preset_assignments CASCADE;
DROP TABLE IF EXISTS public.rotation_template_presets CASCADE;
DROP TABLE IF EXISTS public.shift_template_presets CASCADE;
DROP TABLE IF EXISTS public.user_patterns CASCADE;
DROP TABLE IF EXISTS public.user_hourly_rates CASCADE;
DROP TABLE IF EXISTS public.user_shift_extras CASCADE;
DROP TABLE IF EXISTS public.user_custom_shift_types CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_api_keys CASCADE;
DROP TABLE IF EXISTS public.shift_notes CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.rotation_runs CASCADE;
DROP TABLE IF EXISTS public.rotation_steps CASCADE;
DROP TABLE IF EXISTS public.rotation_templates CASCADE;
DROP TABLE IF EXISTS public.team_invites CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.calendars CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.password_reset_codes CASCADE;
DROP TABLE IF EXISTS public.user_profile_history CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.shift_types CASCADE;

DROP TYPE IF EXISTS team_member_role CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- -----------------------------------------------------------------------------
-- Función para updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');

-- -----------------------------------------------------------------------------
-- Tablas base
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_types (
  code            varchar(32) PRIMARY KEY,
  label           varchar(100) NOT NULL,
  color           varchar(16) NOT NULL
);

CREATE TABLE public.users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           varchar(190) NOT NULL UNIQUE,
  name            varchar(190) NOT NULL,
  password_hash   varchar(255),
  timezone        varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_api_keys (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token           char(64) NOT NULL UNIQUE,
  label           varchar(190),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);
CREATE INDEX idx_user_api_keys_user ON public.user_api_keys (user_id);

CREATE TABLE public.password_reset_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  code        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes (email);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes (expires_at);

CREATE TABLE public.user_profile_history (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  previous_name        varchar(190),
  previous_timezone    varchar(64),
  previous_avatar_url  text,
  new_name             varchar(190),
  new_timezone         varchar(64),
  new_avatar_url       text,
  changed_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uph_user ON public.user_profile_history (user_id);
CREATE INDEX idx_uph_changed_by ON public.user_profile_history (changed_by_user_id);

CREATE TABLE public.teams (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            varchar(190) NOT NULL,
  owner_user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_owner ON public.teams (owner_user_id);

CREATE TABLE public.calendars (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            varchar(190) NOT NULL,
  team_id         bigint REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  timezone        varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  color           varchar(16),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cal_team ON public.calendars (team_id);
CREATE INDEX idx_cal_owner ON public.calendars (owner_user_id);

CREATE TABLE public.team_members (
  team_id         bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            team_member_role NOT NULL DEFAULT 'member',
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_tm_user ON public.team_members (user_id);

CREATE TABLE public.push_subscriptions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  endpoint          text NOT NULL UNIQUE,
  expiration_time   timestamptz,
  p256dh            text,
  auth              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON public.push_subscriptions (user_id);

CREATE TABLE public.team_invites (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id           bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token             uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  max_uses          integer NOT NULL DEFAULT 5,
  uses              integer NOT NULL DEFAULT 0,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_used_at      timestamptz
);
CREATE UNIQUE INDEX uq_team_invites_token ON public.team_invites (token);
CREATE INDEX idx_team_invites_team ON public.team_invites (team_id);
CREATE INDEX idx_team_invites_creator ON public.team_invites (created_by_user_id);

-- -----------------------------------------------------------------------------
-- Rotaciones y turnos
-- -----------------------------------------------------------------------------
CREATE TABLE public.rotation_templates (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  calendar_id     bigint NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  name            varchar(190) NOT NULL,
  description     varchar(255),
  start_date      date NOT NULL,
  days_horizon    integer NOT NULL DEFAULT 60,
  created_by      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rt_calendar ON public.rotation_templates (calendar_id);
CREATE INDEX idx_rt_creator ON public.rotation_templates (created_by);

CREATE TABLE public.rotation_steps (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id     bigint NOT NULL REFERENCES public.rotation_templates(id) ON DELETE CASCADE,
  day_offset      integer NOT NULL,
  shift_type_code varchar(32) NOT NULL REFERENCES public.shift_types(code),
  UNIQUE (template_id, day_offset)
);
CREATE INDEX idx_rs_type ON public.rotation_steps (shift_type_code);
CREATE INDEX idx_rs_template ON public.rotation_steps (template_id);

CREATE TABLE public.rotation_runs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id     bigint NOT NULL REFERENCES public.rotation_templates(id) ON DELETE CASCADE,
  run_at          timestamptz NOT NULL DEFAULT now(),
  generated_from  date NOT NULL,
  generated_to    date NOT NULL,
  total_shifts    integer NOT NULL
);
CREATE INDEX idx_rr_template ON public.rotation_runs (template_id);

CREATE TABLE public.shifts (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  calendar_id          bigint NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  assignee_user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  shift_type_code      varchar(32) NOT NULL REFERENCES public.shift_types(code),
  start_at             timestamptz NOT NULL,
  end_at               timestamptz NOT NULL,
  all_day              boolean NOT NULL DEFAULT true,
  note                 text,
  label                varchar(100),
  color                varchar(16),
  plus_night           smallint NOT NULL DEFAULT 0,
  plus_holiday         smallint NOT NULL DEFAULT 0,
  plus_availability    smallint NOT NULL DEFAULT 0,
  plus_other           smallint NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shifts_cal_start ON public.shifts (calendar_id, start_at);
CREATE INDEX idx_shifts_assignee ON public.shifts (assignee_user_id);
CREATE INDEX idx_shifts_type ON public.shifts (shift_type_code);
CREATE INDEX idx_shifts_cal_end ON public.shifts (calendar_id, end_at);

CREATE TABLE public.shift_notes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id        bigint NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sn_shift ON public.shift_notes (shift_id);
CREATE INDEX idx_sn_author ON public.shift_notes (author_id);

-- -----------------------------------------------------------------------------
-- Plantillas de turnos (presets) - con color incluido
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_template_presets (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  icon            text,
  color           text DEFAULT '#3b82f6',
  start_time      time NOT NULL DEFAULT '09:00',
  end_time        time NOT NULL DEFAULT '17:00',
  break_minutes   integer,
  alert_minutes   integer,
  location        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shift_template_presets_user ON public.shift_template_presets (user_id, created_at DESC);
CREATE INDEX idx_shift_template_presets_color ON public.shift_template_presets (user_id, color);

CREATE TABLE public.rotation_template_presets (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  icon            text,
  description     text,
  days_count      integer NOT NULL DEFAULT 7,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rotation_template_presets_user ON public.rotation_template_presets (user_id, created_at DESC);

CREATE TABLE public.rotation_template_preset_assignments (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id       bigint NOT NULL REFERENCES public.rotation_template_presets(id) ON DELETE CASCADE,
  day_index         integer NOT NULL,
  shift_template_id bigint REFERENCES public.shift_template_presets(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, day_index)
);
CREATE INDEX idx_rotation_template_assignments_template ON public.rotation_template_preset_assignments (template_id, day_index);

-- -----------------------------------------------------------------------------
-- Patrones personales (CustomCycleBuilder guarda aquí cuando selectedTable = user_patterns)
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_patterns (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern         jsonb NOT NULL,
  cycle_length    integer NOT NULL,
  start_date      date NOT NULL,
  custom_labels   jsonb,
  preferences_snapshot jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_patterns_user ON public.user_patterns (user_id);
CREATE INDEX idx_user_patterns_start_date ON public.user_patterns (user_id, start_date DESC);

-- -----------------------------------------------------------------------------
-- Tablas por usuario (Supabase Auth: auth.users) - RLS
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_custom_shift_types (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  color               text NOT NULL DEFAULT '#3b82f6',
  icon                text,
  default_start_time  text,
  default_end_time    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_user_custom_shift_types_user_id ON public.user_custom_shift_types (user_id);

CREATE TABLE public.user_shift_extras (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  value       decimal(10, 2) NOT NULL DEFAULT 0,
  color       text DEFAULT '#3b82f6',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_user_shift_extras_user_id ON public.user_shift_extras (user_id);

CREATE TABLE public.user_hourly_rates (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate   decimal(10, 2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_hourly_rates_user_id ON public.user_hourly_rates (user_id);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calendars_updated_at
  BEFORE UPDATE ON public.calendars FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_rotation_templates_updated_at
  BEFORE UPDATE ON public.rotation_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_shift_template_presets_updated_at
  BEFORE UPDATE ON public.shift_template_presets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_rotation_template_presets_updated_at
  BEFORE UPDATE ON public.rotation_template_presets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_rotation_template_preset_assignments_updated_at
  BEFORE UPDATE ON public.rotation_template_preset_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_user_patterns_updated_at
  BEFORE UPDATE ON public.user_patterns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_user_custom_shift_types_updated_at
  BEFORE UPDATE ON public.user_custom_shift_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_user_shift_extras_updated_at
  BEFORE UPDATE ON public.user_shift_extras FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_user_hourly_rates_updated_at
  BEFORE UPDATE ON public.user_hourly_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS y políticas (presets y tablas por usuario)
-- -----------------------------------------------------------------------------
ALTER TABLE public.shift_template_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shift template presets are readable by owners"
  ON public.shift_template_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shift template presets are insertable by owners"
  ON public.shift_template_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shift template presets are updatable by owners"
  ON public.shift_template_presets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shift template presets are deletable by owners"
  ON public.shift_template_presets FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.rotation_template_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rotation template presets are readable by owners"
  ON public.rotation_template_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Rotation template presets are insertable by owners"
  ON public.rotation_template_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rotation template presets are updatable by owners"
  ON public.rotation_template_presets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rotation template presets are deletable by owners"
  ON public.rotation_template_presets FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.rotation_template_preset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rotation template assignments are readable by owners"
  ON public.rotation_template_preset_assignments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rotation_template_presets rtp WHERE rtp.id = template_id AND rtp.user_id = auth.uid())
  );
CREATE POLICY "Rotation template assignments are insertable by owners"
  ON public.rotation_template_preset_assignments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.rotation_template_presets rtp WHERE rtp.id = template_id AND rtp.user_id = auth.uid())
  );
CREATE POLICY "Rotation template assignments are updatable by owners"
  ON public.rotation_template_preset_assignments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.rotation_template_presets rtp WHERE rtp.id = template_id AND rtp.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rotation_template_presets rtp WHERE rtp.id = template_id AND rtp.user_id = auth.uid())
  );
CREATE POLICY "Rotation template assignments are deletable by owners"
  ON public.rotation_template_preset_assignments FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.rotation_template_presets rtp WHERE rtp.id = template_id AND rtp.user_id = auth.uid())
  );

ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own patterns"
  ON public.user_patterns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_custom_shift_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own custom shift types"
  ON public.user_custom_shift_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own custom shift types"
  ON public.user_custom_shift_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom shift types"
  ON public.user_custom_shift_types FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom shift types"
  ON public.user_custom_shift_types FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.user_shift_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own extras"
  ON public.user_shift_extras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own extras"
  ON public.user_shift_extras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own extras"
  ON public.user_shift_extras FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own extras"
  ON public.user_shift_extras FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.user_hourly_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own hourly rate"
  ON public.user_hourly_rates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own hourly rate"
  ON public.user_hourly_rates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own hourly rate"
  ON public.user_hourly_rates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Datos de referencia y demo
-- -----------------------------------------------------------------------------
INSERT INTO public.shift_types (code, label, color) VALUES
  ('CUSTOM', 'Personalizado', '#0ea5e9'),
  ('NIGHT', 'Nocturno', '#7c3aed'),
  ('REST', 'Descanso', '#64748b'),
  ('VACATION', 'Vacaciones', '#f97316'),
  ('WORK', 'Trabajo', '#2563eb');

INSERT INTO public.users (id, email, name, password_hash, timezone, avatar_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@supershift.local', 'Admin Supershift',
   '5f9a5c284860337f0b8fc4031b6c9d4a:b358197ed87accd54c26b1d7a63cac198639c6c7a5bb24e7b71b5d9a34ea43ab97c830608c5512413c9fdce0fe61d118c459826dffb63dfe0e5c448bba81f216',
   'Europe/Madrid', 'https://avatars.githubusercontent.com/u/0000001?v=4'),
  ('00000000-0000-0000-0000-000000000002', 'esteban@example.com', 'Esteban',
   '6e1b968c1df42190bef0ad9b35addcab:887582b2888acff2c62ee11857a1ebbbf10b8e04e418f2d2829f9eea8874ea039d5df13492208b0e97a12fd94598ce6814e0a0d48fef211d6084366081eef84f',
   'Europe/Madrid', 'https://avatars.githubusercontent.com/u/0000002?v=4');

INSERT INTO public.teams (id, name, owner_user_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Equipo Demo', '00000000-0000-0000-0000-000000000001', now(), now());
SELECT setval(pg_get_serial_sequence('public.teams', 'id'), 1, true);

INSERT INTO public.team_members (team_id, user_id, role, joined_at) VALUES
  (1, '00000000-0000-0000-0000-000000000001', 'owner', now()),
  (1, '00000000-0000-0000-0000-000000000002', 'member', now());

INSERT INTO public.calendars (id, name, team_id, owner_user_id, timezone, color, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Calendario Equipo', 1, NULL, 'Europe/Madrid', '#1e40af', now(), now()),
  (2, 'Calendario de Esteban', NULL, '00000000-0000-0000-0000-000000000002', 'Europe/Madrid', '#0ea5e9', now(), now());
SELECT setval(pg_get_serial_sequence('public.calendars', 'id'), 2, true);

INSERT INTO public.rotation_templates (id, calendar_id, name, description, start_date, days_horizon, created_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'Ciclo 4x2', '4 días trabajo, 2 descanso', '2025-10-01', 60, '00000000-0000-0000-0000-000000000001', now(), now());
SELECT setval(pg_get_serial_sequence('public.rotation_templates', 'id'), 1, true);

INSERT INTO public.rotation_steps (id, template_id, day_offset, shift_type_code) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 0, 'WORK'), (2, 1, 1, 'WORK'), (3, 1, 2, 'WORK'), (4, 1, 3, 'WORK'), (5, 1, 4, 'REST'), (6, 1, 5, 'REST');
SELECT setval(pg_get_serial_sequence('public.rotation_steps', 'id'), 6, true);

INSERT INTO public.shifts (id, calendar_id, assignee_user_id, shift_type_code, start_at, end_at, all_day, note, label, color, plus_night, plus_holiday, plus_availability, plus_other, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 2, '00000000-0000-0000-0000-000000000002', 'WORK', '2025-10-01 00:00:00+00', '2025-10-01 23:59:59+00', true, 'Entrega de reporte mensual', 'Trabajo', '#2563eb', 0, 1, 0, 0, now(), now()),
  (2, 2, '00000000-0000-0000-0000-000000000002', 'REST', '2025-10-02 00:00:00+00', '2025-10-02 23:59:59+00', true, 'Recuperar horas de sueño', 'Descanso', '#64748b', 0, 0, 0, 0, now(), now()),
  (3, 2, '00000000-0000-0000-0000-000000000002', 'NIGHT', '2025-10-03 00:00:00+00', '2025-10-03 23:59:59+00', true, 'Cobertura guardia', 'Nocturno', '#7c3aed', 2, 0, 1, 0, now(), now());
SELECT setval(pg_get_serial_sequence('public.shifts', 'id'), 3, true);

COMMIT;
