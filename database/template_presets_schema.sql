-- Supershift template presets schema for Supabase
-- Ejecuta este script en tu proyecto Supabase para habilitar las nuevas tablas
-- de plantillas de turnos y rotaciones usadas en la interfaz.

begin;

-- Aseguramos que exista la función utilitaria para mantener updated_at
create or replace function set_updated_at()
returns trigger as
$$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.shift_template_presets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  icon text,
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  break_minutes integer,
  alert_minutes integer,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_shift_template_presets_updated_at
before update on public.shift_template_presets
for each row execute procedure set_updated_at();

create index if not exists idx_shift_template_presets_user
  on public.shift_template_presets(user_id, created_at desc);

alter table public.shift_template_presets enable row level security;

create policy "Shift template presets are readable by owners"
  on public.shift_template_presets
  for select using (auth.uid() = user_id);

create policy "Shift template presets are insertable by owners"
  on public.shift_template_presets
  for insert with check (auth.uid() = user_id);

create policy "Shift template presets are updatable by owners"
  on public.shift_template_presets
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Shift template presets are deletable by owners"
  on public.shift_template_presets
  for delete using (auth.uid() = user_id);

create table if not exists public.rotation_template_presets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  icon text,
  description text,
  days_count integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_rotation_template_presets_updated_at
before update on public.rotation_template_presets
for each row execute procedure set_updated_at();

create index if not exists idx_rotation_template_presets_user
  on public.rotation_template_presets(user_id, created_at desc);

alter table public.rotation_template_presets enable row level security;

create policy "Rotation template presets are readable by owners"
  on public.rotation_template_presets
  for select using (auth.uid() = user_id);

create policy "Rotation template presets are insertable by owners"
  on public.rotation_template_presets
  for insert with check (auth.uid() = user_id);

create policy "Rotation template presets are updatable by owners"
  on public.rotation_template_presets
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Rotation template presets are deletable by owners"
  on public.rotation_template_presets
  for delete using (auth.uid() = user_id);

create table if not exists public.rotation_template_preset_assignments (
  id bigint generated always as identity primary key,
  template_id bigint not null references public.rotation_template_presets(id) on delete cascade,
  day_index integer not null,
  shift_template_id bigint references public.shift_template_presets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, day_index)
);

create trigger set_rotation_template_preset_assignments_updated_at
before update on public.rotation_template_preset_assignments
for each row execute procedure set_updated_at();

create index if not exists idx_rotation_template_assignments_template
  on public.rotation_template_preset_assignments(template_id, day_index);

alter table public.rotation_template_preset_assignments enable row level security;

create policy "Rotation template assignments are readable by owners"
  on public.rotation_template_preset_assignments
  for select using (
    exists (
      select 1
      from public.rotation_template_presets rtp
      where rtp.id = template_id and rtp.user_id = auth.uid()
    )
  );

create policy "Rotation template assignments are insertable by owners"
  on public.rotation_template_preset_assignments
  for insert with check (
    exists (
      select 1
      from public.rotation_template_presets rtp
      where rtp.id = template_id and rtp.user_id = auth.uid()
    )
  );

create policy "Rotation template assignments are updatable by owners"
  on public.rotation_template_preset_assignments
  for update using (
    exists (
      select 1
      from public.rotation_template_presets rtp
      where rtp.id = template_id and rtp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.rotation_template_presets rtp
      where rtp.id = template_id and rtp.user_id = auth.uid()
    )
  );

create policy "Rotation template assignments are deletable by owners"
  on public.rotation_template_preset_assignments
  for delete using (
    exists (
      select 1
      from public.rotation_template_presets rtp
      where rtp.id = template_id and rtp.user_id = auth.uid()
    )
  );

commit;
