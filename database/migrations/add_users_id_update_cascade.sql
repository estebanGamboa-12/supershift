-- Permite actualizar public.users.id al sincronizar con auth (ej. usuario entró "por email").
-- Así créditos y plantillas guardan bien. Añade ON UPDATE CASCADE a las FKs a public.users(id).
-- Ejecutar en Supabase SQL Editor. Si alguna tabla no existe, comenta o borra ese bloque.

-- shift_template_presets
ALTER TABLE public.shift_template_presets
  DROP CONSTRAINT IF EXISTS shift_template_presets_user_id_fkey;
ALTER TABLE public.shift_template_presets
  ADD CONSTRAINT shift_template_presets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- rotation_template_presets
ALTER TABLE public.rotation_template_presets
  DROP CONSTRAINT IF EXISTS rotation_template_presets_user_id_fkey;
ALTER TABLE public.rotation_template_presets
  ADD CONSTRAINT rotation_template_presets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- credit_transactions
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- user_preferences
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- user_patterns (si existe)
ALTER TABLE public.user_patterns
  DROP CONSTRAINT IF EXISTS user_patterns_user_id_fkey;
ALTER TABLE public.user_patterns
  ADD CONSTRAINT user_patterns_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- calendars (owner)
ALTER TABLE public.calendars
  DROP CONSTRAINT IF EXISTS calendars_owner_user_id_fkey;
ALTER TABLE public.calendars
  ADD CONSTRAINT calendars_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- teams
ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_owner_user_id_fkey;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- team_members
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- user_api_keys
ALTER TABLE public.user_api_keys
  DROP CONSTRAINT IF EXISTS user_api_keys_user_id_fkey;
ALTER TABLE public.user_api_keys
  ADD CONSTRAINT user_api_keys_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- user_profile_history
ALTER TABLE public.user_profile_history
  DROP CONSTRAINT IF EXISTS user_profile_history_user_id_fkey;
ALTER TABLE public.user_profile_history
  ADD CONSTRAINT user_profile_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.user_profile_history
  DROP CONSTRAINT IF EXISTS user_profile_history_changed_by_user_id_fkey;
ALTER TABLE public.user_profile_history
  ADD CONSTRAINT user_profile_history_changed_by_user_id_fkey
  FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- push_subscriptions
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- team_invites
ALTER TABLE public.team_invites
  DROP CONSTRAINT IF EXISTS team_invites_created_by_user_id_fkey;
ALTER TABLE public.team_invites
  ADD CONSTRAINT team_invites_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- rotation_templates
ALTER TABLE public.rotation_templates
  DROP CONSTRAINT IF EXISTS rotation_templates_created_by_fkey;
ALTER TABLE public.rotation_templates
  ADD CONSTRAINT rotation_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- shifts
ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_assignee_user_id_fkey;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_assignee_user_id_fkey
  FOREIGN KEY (assignee_user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- shift_notes
ALTER TABLE public.shift_notes
  DROP CONSTRAINT IF EXISTS shift_notes_author_id_fkey;
ALTER TABLE public.shift_notes
  ADD CONSTRAINT shift_notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
