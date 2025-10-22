-- Schema for rotation-related tables
CREATE TABLE public.calendars (
  id bigint NOT NULL DEFAULT nextval('calendars_id_seq'::regclass),
  name character varying NOT NULL,
  team_id bigint,
  owner_user_id uuid,
  timezone character varying NOT NULL DEFAULT 'Europe/Madrid'::character varying,
  color character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT calendars_pkey PRIMARY KEY (id),
  CONSTRAINT calendars_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.rotation_runs (
  id bigint NOT NULL DEFAULT nextval('rotation_runs_id_seq'::regclass),
  template_id bigint NOT NULL,
  run_at timestamp without time zone NOT NULL DEFAULT now(),
  generated_from date NOT NULL,
  generated_to date NOT NULL,
  total_shifts integer NOT NULL,
  CONSTRAINT rotation_runs_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_runs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.rotation_templates(id)
);
CREATE TABLE public.rotation_steps (
  id bigint NOT NULL DEFAULT nextval('rotation_steps_id_seq'::regclass),
  template_id bigint NOT NULL,
  day_offset integer NOT NULL,
  shift_type_code character varying NOT NULL,
  CONSTRAINT rotation_steps_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_steps_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.rotation_templates(id),
  CONSTRAINT rotation_steps_shift_type_code_fkey FOREIGN KEY (shift_type_code) REFERENCES public.shift_types(code)
);
CREATE TABLE public.rotation_templates (
  id bigint NOT NULL DEFAULT nextval('rotation_templates_id_seq'::regclass),
  calendar_id bigint NOT NULL,
  name character varying NOT NULL,
  description character varying,
  start_date date NOT NULL,
  days_horizon integer NOT NULL DEFAULT 60,
  created_by uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotation_templates_pkey PRIMARY KEY (id),
  CONSTRAINT rotation_templates_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.calendars(id)
);
CREATE TABLE public.shift_notes (
  id bigint NOT NULL DEFAULT nextval('shift_notes_id_seq'::regclass),
  shift_id bigint NOT NULL,
  author_id uuid,
  body text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT shift_notes_pkey PRIMARY KEY (id),
  CONSTRAINT shift_notes_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.shift_types (
  code character varying NOT NULL,
  label character varying NOT NULL,
  color character varying NOT NULL,
  CONSTRAINT shift_types_pkey PRIMARY KEY (code)
);
CREATE TABLE public.shifts (
  id bigint NOT NULL DEFAULT nextval('shifts_id_seq'::regclass),
  calendar_id bigint NOT NULL,
  assignee_user_id uuid,
  shift_type_code character varying NOT NULL,
  start_at timestamp without time zone NOT NULL,
  end_at timestamp without time zone NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  note text,
  label character varying,
  color character varying,
  plus_night smallint NOT NULL DEFAULT 0,
  plus_holiday smallint NOT NULL DEFAULT 0,
  plus_availability smallint NOT NULL DEFAULT 0,
  plus_other smallint NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.calendars(id),
  CONSTRAINT shifts_shift_type_code_fkey FOREIGN KEY (shift_type_code) REFERENCES public.shift_types(code)
);
CREATE TABLE public.team_members (
  team_id bigint NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'member'::team_role,
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.teams (
  id bigint NOT NULL DEFAULT nextval('teams_id_seq'::regclass),
  name character varying NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  password_hash text,
  timezone character varying NOT NULL DEFAULT 'Europe/Madrid'::character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
