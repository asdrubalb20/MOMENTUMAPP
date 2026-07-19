-- ════════════════════════════════════════════════════════
--  MOMENTUM — El paciente ya NO elige fisio; el fisio lo reclama
--  Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ════════════════════════════════════════════════════════

-- 1) Permitir pacientes SIN fisioterapeuta asignado (fisio_id NULL)
alter table patients alter column fisio_id drop not null;

-- 2) Cualquier fisio puede VER el pool de pacientes sin asignar
drop policy if exists "fisio reads unassigned patients" on patients;
create policy "fisio reads unassigned patients" on patients
  for select using (fisio_id is null and my_role() = 'fisio');

-- 3) Un fisio puede RECLAMAR (marcar que atiende) un paciente sin asignar,
--    poniéndose a sí mismo como su fisio_id.
drop policy if exists "fisio claims patient" on patients;
create policy "fisio claims patient" on patients
  for update using (fisio_id is null and my_role() = 'fisio')
  with check (fisio_id = auth.uid());

notify pgrst, 'reload schema';
