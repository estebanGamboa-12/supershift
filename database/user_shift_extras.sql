-- Tabla opcional para guardar extras de turnos en Supabase
-- Por ahora el sistema funciona con localStorage, pero puedes usar esta tabla si prefieres
-- Ejecuta este script en Supabase SQL Editor si quieres guardar los extras en la base de datos

begin;

-- Crear tabla para extras de turnos por usuario
create table if not exists public.user_shift_extras (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value decimal(10, 2) not null default 0,
  color text default '#3b82f6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_shift_extras_user_id_name_unique unique (user_id, name)
);

-- Índices
create index if not exists idx_user_shift_extras_user_id on public.user_shift_extras(user_id);

-- RLS (Row Level Security)
alter table public.user_shift_extras enable row level security;

-- Política: Los usuarios solo pueden ver/editar sus propios extras
create policy "Users can view their own extras"
  on public.user_shift_extras
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own extras"
  on public.user_shift_extras
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own extras"
  on public.user_shift_extras
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own extras"
  on public.user_shift_extras
  for delete
  using (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger para updated_at
drop trigger if exists update_user_shift_extras_updated_at on public.user_shift_extras;
create trigger update_user_shift_extras_updated_at
  before update on public.user_shift_extras
  for each row
  execute function update_updated_at_column();

-- Tabla para tarifa por hora del usuario
create table if not exists public.user_hourly_rates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hourly_rate decimal(10, 2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices
create index if not exists idx_user_hourly_rates_user_id on public.user_hourly_rates(user_id);

-- RLS
alter table public.user_hourly_rates enable row level security;

-- Políticas
create policy "Users can view their own hourly rate"
  on public.user_hourly_rates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own hourly rate"
  on public.user_hourly_rates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own hourly rate"
  on public.user_hourly_rates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para updated_at
drop trigger if exists update_user_hourly_rates_updated_at on public.user_hourly_rates;
create trigger update_user_hourly_rates_updated_at
  before update on public.user_hourly_rates
  for each row
  execute function update_updated_at_column();

commit;

-- Comentarios
comment on table public.user_shift_extras is 'Extras personalizados de turnos por usuario';
comment on column public.user_shift_extras.name is 'Nombre del extra (ej: "Extra nocturno", "Domingo/Festivo")';
comment on column public.user_shift_extras.value is 'Valor monetario del extra en euros';
comment on column public.user_shift_extras.color is 'Color hexadecimal para visualización';

comment on table public.user_hourly_rates is 'Tarifa por hora de cada usuario';
comment on column public.user_hourly_rates.hourly_rate is 'Tarifa por hora en euros';
