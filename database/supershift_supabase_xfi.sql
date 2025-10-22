-- Supershift database bootstrap para Supabase X-FI (PostgreSQL)
-- Ejecuta este script en tu proyecto Supabase con base de datos PostgreSQL 15
-- para crear la estructura inicial y poblarla con datos de demostración sin
-- eliminar la información ya existente.

BEGIN;

-- Función utilitaria para mantener los campos updated_at --------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tipos personalizados ------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'team_member_role'
  ) THEN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END;
$$;

-- Tablas -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_types (
  code            varchar(32) PRIMARY KEY,
  label           varchar(100) NOT NULL,
  color           varchar(16) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           varchar(190) NOT NULL UNIQUE,
  name            varchar(190) NOT NULL,
  password_hash   varchar(255),
  timezone        varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profile_history (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by_user_id   bigint REFERENCES users(id) ON DELETE SET NULL,
  previous_name        varchar(190),
  previous_timezone    varchar(64),
  previous_avatar_url  text,
  new_name             varchar(190),
  new_timezone         varchar(64),
  new_avatar_url       text,
  changed_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uph_user ON user_profile_history (user_id);
CREATE INDEX IF NOT EXISTS idx_uph_changed_by ON user_profile_history (changed_by_user_id);

CREATE TABLE IF NOT EXISTS teams (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            varchar(190) NOT NULL,
  owner_user_id   bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams (owner_user_id);

CREATE TABLE IF NOT EXISTS calendars (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            varchar(190) NOT NULL,
  team_id         bigint REFERENCES teams(id) ON DELETE CASCADE,
  owner_user_id   bigint REFERENCES users(id) ON DELETE SET NULL,
  timezone        varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
  color           varchar(16),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cal_team ON calendars (team_id);
CREATE INDEX IF NOT EXISTS idx_cal_owner ON calendars (owner_user_id);

CREATE TABLE IF NOT EXISTS team_members (
  team_id         bigint NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id         bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            team_member_role NOT NULL DEFAULT 'member',
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members (user_id);

CREATE TABLE IF NOT EXISTS rotation_templates (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  calendar_id     bigint NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  name            varchar(190) NOT NULL,
  description     varchar(255),
  start_date      date NOT NULL,
  days_horizon    integer NOT NULL DEFAULT 60,
  created_by      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rt_calendar ON rotation_templates (calendar_id);
CREATE INDEX IF NOT EXISTS idx_rt_creator ON rotation_templates (created_by);

CREATE TABLE IF NOT EXISTS rotation_steps (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id     bigint NOT NULL REFERENCES rotation_templates(id) ON DELETE CASCADE,
  day_offset      integer NOT NULL,
  shift_type_code varchar(32) NOT NULL REFERENCES shift_types(code),
  UNIQUE (template_id, day_offset)
);
CREATE INDEX IF NOT EXISTS idx_rs_type ON rotation_steps (shift_type_code);

CREATE TABLE IF NOT EXISTS rotation_runs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id     bigint NOT NULL REFERENCES rotation_templates(id) ON DELETE CASCADE,
  run_at          timestamptz NOT NULL DEFAULT now(),
  generated_from  date NOT NULL,
  generated_to    date NOT NULL,
  total_shifts    integer NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rr_template ON rotation_runs (template_id);

CREATE TABLE IF NOT EXISTS shifts (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  calendar_id          bigint NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  assignee_user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
  shift_type_code      varchar(32) NOT NULL REFERENCES shift_types(code),
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
CREATE INDEX IF NOT EXISTS idx_shifts_cal_start ON shifts (calendar_id, start_at);
CREATE INDEX IF NOT EXISTS idx_shifts_assignee ON shifts (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_type ON shifts (shift_type_code);

CREATE TABLE IF NOT EXISTS shift_notes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id        bigint NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  author_id       bigint REFERENCES users(id) ON DELETE SET NULL,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sn_shift ON shift_notes (shift_id);
CREATE INDEX IF NOT EXISTS idx_sn_author ON shift_notes (author_id);

-- Triggers updated_at ------------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;
CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_calendars_updated_at ON calendars;
CREATE TRIGGER trg_calendars_updated_at
BEFORE UPDATE ON calendars
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rotation_templates_updated_at ON rotation_templates;
CREATE TRIGGER trg_rotation_templates_updated_at
BEFORE UPDATE ON rotation_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shifts_updated_at ON shifts;
CREATE TRIGGER trg_shifts_updated_at
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Datos de referencia ------------------------------------------------------
INSERT INTO shift_types (code, label, color) VALUES
  ('CUSTOM', 'Personalizado', '#0ea5e9'),
  ('NIGHT', 'Nocturno', '#7c3aed'),
  ('REST', 'Descanso', '#64748b'),
  ('VACATION', 'Vacaciones', '#f97316'),
  ('WORK', 'Trabajo', '#2563eb')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (id, email, name, password_hash, timezone, avatar_url) VALUES
  (
    1,
    'admin@supershift.local',
    'Admin Supershift',
    '5f9a5c284860337f0b8fc4031b6c9d4a:b358197ed87accd54c26b1d7a63cac198639c6c7a5bb24e7b71b5d9a34ea43ab97c830608c5512413c9fdce0fe61d118c459826dffb63dfe0e5c448bba81f216',
    'Europe/Madrid',
    'https://avatars.githubusercontent.com/u/0000001?v=4'
  ),
  (
    2,
    'esteban@example.com',
    'Esteban',
    '6e1b968c1df42190bef0ad9b35addcab:887582b2888acff2c62ee11857a1ebbbf10b8e04e418f2d2829f9eea8874ea039d5df13492208b0e97a12fd94598ce6814e0a0d48fef211d6084366081eef84f',
    'Europe/Madrid',
    'https://avatars.githubusercontent.com/u/0000002?v=4'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO teams (id, name, owner_user_id, created_at, updated_at) VALUES
  (1, 'Equipo Demo', 1, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES
  (1, 1, 'owner', now()),
  (1, 2, 'member', now())
ON CONFLICT DO NOTHING;

INSERT INTO calendars (id, name, team_id, owner_user_id, timezone, color, created_at, updated_at) VALUES
  (1, 'Calendario Equipo', 1, NULL, 'Europe/Madrid', '#1e40af', now(), now()),
  (2, 'Calendario de Esteban', NULL, 2, 'Europe/Madrid', '#0ea5e9', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO rotation_templates (id, calendar_id, name, description, start_date, days_horizon, created_by, created_at, updated_at) VALUES
  (1, 1, 'Ciclo 4x2', '4 días trabajo, 2 descanso', '2025-10-01', 60, 1, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO rotation_steps (id, template_id, day_offset, shift_type_code) VALUES
  (1, 1, 0, 'WORK'),
  (2, 1, 1, 'WORK'),
  (3, 1, 2, 'WORK'),
  (4, 1, 3, 'WORK'),
  (5, 1, 4, 'REST'),
  (6, 1, 5, 'REST')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shifts (
  id,
  calendar_id,
  assignee_user_id,
  shift_type_code,
  start_at,
  end_at,
  all_day,
  note,
  label,
  color,
  plus_night,
  plus_holiday,
  plus_availability,
  plus_other,
  created_at,
  updated_at
) VALUES
  (1, 2, 2, 'WORK', '2025-10-01 00:00:00+00', '2025-10-01 23:59:59+00', true, 'Entrega de reporte mensual', 'Trabajo', '#2563eb', 0, 1, 0, 0, now(), now()),
  (2, 2, 2, 'REST', '2025-10-02 00:00:00+00', '2025-10-02 23:59:59+00', true, 'Recuperar horas de sueño', 'Descanso', '#64748b', 0, 0, 0, 0, now(), now()),
  (3, 2, 2, 'NIGHT', '2025-10-03 00:00:00+00', '2025-10-03 23:59:59+00', true, 'Cobertura guardia', 'Nocturno', '#7c3aed', 2, 0, 1, 0, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Ajuste de secuencias -----------------------------------------------------
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('users', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM users), 2), true);
  END IF;
END;
$$;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('teams', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM teams), 1), true);
  END IF;
END;
$$;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('calendars', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM calendars), 2), true);
  END IF;
END;
$$;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('rotation_templates', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM rotation_templates), 1), true);
  END IF;
END;
$$;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('rotation_steps', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM rotation_steps), 6), true);
  END IF;
END;
$$;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('shifts', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, GREATEST((SELECT COALESCE(MAX(id), 0) FROM shifts), 3), true);
  END IF;
END;
$$;

COMMIT;
