-- Agregar campo color a shift_template_presets
-- Ejecuta este script en Supabase SQL Editor para agregar soporte de colores a las plantillas de turnos
-- 
-- ¿Por qué queremos colores?
-- Porque las personas pueden diferenciarse y editar todo a su manera.
-- Super Shift necesita muchos colores e iconos para que la gente pueda diferenciar sus turnos.

begin;

-- Agregar columna color a shift_template_presets
alter table public.shift_template_presets
add column if not exists color text default '#3b82f6';

-- Crear índice para búsquedas por color (opcional pero útil)
create index if not exists idx_shift_template_presets_color
on public.shift_template_presets(user_id, color);

-- Comentario en la columna para documentación
comment on column public.shift_template_presets.color is 
'Color hexadecimal para personalizar visualmente el turno. Permite a los usuarios diferenciar y personalizar sus turnos.';

commit;
