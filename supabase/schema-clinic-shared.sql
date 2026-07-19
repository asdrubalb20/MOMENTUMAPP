-- ════════════════════════════════════════════════════════
--  MOMENTUM — Clínica compartida: todos los fisios atienden a
--  todos los pacientes + registro de asistencia por día.
--  Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ════════════════════════════════════════════════════════

create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- 1) Cualquier fisio (o admin) ve y gestiona TODO
drop policy if exists "fisio all patients" on patients;
create policy "fisio all patients" on patients for all using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all assignments2" on assignments;
create policy "fisio all assignments2" on assignments for all using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all evaluations" on evaluations;
create policy "fisio all evaluations" on evaluations for all using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all weekassign2" on week_assignments;
create policy "fisio all weekassign2" on week_assignments for all using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all logs read2" on completion_logs;
create policy "fisio all logs read2" on completion_logs for select using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all weeklogs read2" on week_logs;
create policy "fisio all weeklogs read2" on week_logs for select using (my_role() in ('fisio','admin'));

drop policy if exists "fisio all sessions2" on sessions;
create policy "fisio all sessions2" on sessions for all using (my_role() in ('fisio','admin'));

-- 2) Tabla de ASISTENCIA: quién atendió a quién y qué día
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  fisio_id uuid not null references auth.users,
  date date not null,
  created_at timestamptz default now(),
  unique (patient_id, fisio_id, date)
);
alter table attendance enable row level security;

drop policy if exists "fisio manages attendance" on attendance;
create policy "fisio manages attendance" on attendance
  for all using (my_role() in ('fisio','admin'));

drop policy if exists "patient reads own attendance" on attendance;
create policy "patient reads own attendance" on attendance
  for select using (is_me_patient(patient_id));

notify pgrst, 'reload schema';
