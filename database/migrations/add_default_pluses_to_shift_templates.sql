-- Extras por defecto en plantillas de turno (guardados en BBDD)
-- Ejecuta en Supabase SQL Editor para que los extras de cada plantilla se persistan en la base de datos.

begin;

alter table public.shift_template_presets
  add column if not exists plus_night integer not null default 0,
  add column if not exists plus_holiday integer not null default 0,
  add column if not exists plus_availability integer not null default 0,
  add column if not exists plus_other integer not null default 0;

comment on column public.shift_template_presets.plus_night is 'Extra nocturnidad por defecto (0 o 1)';
comment on column public.shift_template_presets.plus_holiday is 'Extra festivo por defecto (0 o 1)';
comment on column public.shift_template_presets.plus_availability is 'Extra disponibilidad por defecto (0 o 1)';
comment on column public.shift_template_presets.plus_other is 'Otro extra por defecto (0 o 1)';

commit;
