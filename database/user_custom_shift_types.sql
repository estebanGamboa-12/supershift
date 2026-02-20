-- Tabla para tipos de turnos personalizados por usuario en Supabase
-- Ejecuta este script en Supabase SQL Editor

begin;

-- Crear tabla para tipos de turnos personalizados por usuario
create table if not exists public.user_custom_shift_types (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  icon text,
  default_start_time text,
  default_end_time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_custom_shift_types_user_id_name_unique unique (user_id, name)
);

-- Migración: añadir columnas de horario por defecto si la tabla ya existía
alter table public.user_custom_shift_types add column if not exists default_start_time text;
alter table public.user_custom_shift_types add column if not exists default_end_time text;

-- Índices
create index if not exists idx_user_custom_shift_types_user_id on public.user_custom_shift_types(user_id);

-- RLS (Row Level Security)
alter table public.user_custom_shift_types enable row level security;

-- Eliminar políticas si existen (para poder re-ejecutar el script)
drop policy if exists "Users can view their own custom shift types" on public.user_custom_shift_types;
drop policy if exists "Users can insert their own custom shift types" on public.user_custom_shift_types;
drop policy if exists "Users can update their own custom shift types" on public.user_custom_shift_types;
drop policy if exists "Users can delete their own custom shift types" on public.user_custom_shift_types;

-- Política: Los usuarios solo pueden ver/editar sus propios tipos de turnos
create policy "Users can view their own custom shift types"
  on public.user_custom_shift_types
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom shift types"
  on public.user_custom_shift_types
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom shift types"
  on public.user_custom_shift_types
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own custom shift types"
  on public.user_custom_shift_types
  for delete
  using (auth.uid() = user_id);

-- Función para actualizar updated_at (crear si no existe, p. ej. si no ejecutaste user_shift_extras.sql antes)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger para updated_at
drop trigger if exists update_user_custom_shift_types_updated_at on public.user_custom_shift_types;
create trigger update_user_custom_shift_types_updated_at
  before update on public.user_custom_shift_types
  for each row
  execute function public.update_updated_at_column();

commit;

-- Comentarios
comment on table public.user_custom_shift_types is 'Tipos de turnos personalizados por usuario';
comment on column public.user_custom_shift_types.name is 'Nombre del tipo de turno (ej: "Mañana", "Tarde", "Guardia")';
comment on column public.user_custom_shift_types.color is 'Color hexadecimal para visualización';
comment on column public.user_custom_shift_types.icon is 'Emoji o icono opcional para el tipo de turno';
comment on column public.user_custom_shift_types.default_start_time is 'Hora de inicio por defecto (HH:mm) para turnos de este tipo';
comment on column public.user_custom_shift_types.default_end_time is 'Hora de fin por defecto (HH:mm) para turnos de este tipo';
