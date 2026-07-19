-- ════════════════════════════════════════════════════════
--  MOMENTUM — Asegurar rol ADMIN + sus policies (idempotente)
--  Ejecutar en: SQL Editor de Supabase. Seguro de re-ejecutar.
--  Necesario porque schema-fix.sql borró todas las policies de
--  profiles (incluida "admin all profiles") al reparar la fuga.
-- ════════════════════════════════════════════════════════

-- 1) El rol admin/secretaria debe estar permitido en profiles.role
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('fisio','paciente','admin','secretaria'));

-- 2) Función helper: rol del usuario actual (security definer)
create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- 3) Policies de acceso total del admin (drop+create = idempotente)
drop policy if exists "admin all patients"     on patients;
create policy "admin all patients"     on patients     for all    using (my_role()='admin');

drop policy if exists "admin all sessions"     on sessions;
create policy "admin all sessions"     on sessions     for all    using (my_role()='admin');

drop policy if exists "admin all assignments"  on assignments;
create policy "admin all assignments"  on assignments  for all    using (my_role()='admin');

drop policy if exists "admin all logs"         on completion_logs;
create policy "admin all logs"         on completion_logs for select using (my_role()='admin');

-- Re-agregar el acceso del admin a profiles (lo borró schema-fix.sql)
drop policy if exists "admin all profiles"     on profiles;
create policy "admin all profiles"     on profiles     for select using (my_role()='admin');

-- Citas: secretaria y admin gestionan
drop policy if exists "secretaria manages appointments" on appointments;
create policy "secretaria manages appointments" on appointments for all using (my_role() in ('secretaria','admin'));

notify pgrst, 'reload schema';
