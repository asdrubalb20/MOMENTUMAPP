-- ════════════════════════════════════════════════════════
--  MOMENTUM — FIX de seguridad + selector de fisioterapeuta
--  Ejecutar en: SQL Editor de tu proyecto Supabase
--  Seguro de re-ejecutar (idempotente).
-- ════════════════════════════════════════════════════════

-- 1) ACTIVAR Row Level Security en TODAS las tablas.
--    (El bug detectado: una petición anónima podía leer perfiles
--     completos — nombre, cédula, teléfono. Eso pasa cuando las
--     policies existen pero RLS quedó DESACTIVADO en la tabla.)
alter table profiles            enable row level security;
alter table patients            enable row level security;
alter table sessions            enable row level security;
alter table evaluations         enable row level security;
alter table assignments         enable row level security;
alter table assignment_history  enable row level security;
alter table completion_logs     enable row level security;
alter table week_assignments    enable row level security;
alter table week_logs           enable row level security;
alter table questionnaires      enable row level security;
alter table notifications       enable row level security;
alter table videos              enable row level security;

-- 2) Función para el SELECTOR de fisioterapeuta en el registro.
--    Devuelve SOLO id + nombre de los fisios (no cédula ni teléfono).
--    Es SECURITY DEFINER: funciona aunque el que registra aún no
--    tenga sesión (anónimo), sin abrir la tabla profiles completa.
create or replace function list_fisios()
returns table (id uuid, name text)
language sql
security definer
stable
as $$
  select id, name from profiles where role = 'fisio' order by name
$$;

grant execute on function list_fisios() to anon, authenticated;

-- 3) REPARAR las policies de `profiles`.
--    Diagnóstico: un anónimo aún podía leer perfiles aunque RLS
--    estaba ON → existe una policy PERMISIVA de lectura pública
--    (típica de plantillas: "Public profiles are viewable by
--    everyone", using (true)). Aquí borramos TODAS las policies de
--    profiles y dejamos solo el acceso al propio perfil. Los fisios
--    se exponen únicamente por la función list_fisios() de arriba.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4) Recargar el caché de PostgREST para que exponga list_fisios()
--    (si la función existe en la BD pero el RPC da 404/PGRST202,
--     es porque el caché estaba viejo).
notify pgrst, 'reload schema';

-- Nota: el resto de policies por rol (fisio manages patients, etc.)
-- ya están en supabase/schema.sql y funcionan correctamente.
