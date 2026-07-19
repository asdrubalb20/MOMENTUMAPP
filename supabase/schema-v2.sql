-- ══ MOMENTUM v3.1: roles, ejercicios propios, citas ══
-- Ejecutar DESPUÉS de schema.sql

-- 1. Nuevos roles
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('fisio','paciente','admin','secretaria'));

create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- 2. ADMIN: acceso total
create policy "admin all patients" on patients for all using (my_role()='admin');
create policy "admin all sessions" on sessions for all using (my_role()='admin');
create policy "admin all assignments" on assignments for all using (my_role()='admin');
create policy "admin all logs" on completion_logs for select using (my_role()='admin');
create policy "admin all profiles" on profiles for select using (my_role()='admin');

-- 3. Ejercicios propios del fisio
create table custom_exercises (
  id uuid primary key default gen_random_uuid(),
  fisio_id uuid not null references auth.users,
  section_id text not null,
  name text not null,
  zone text default 'Fuerza',
  sets text not null,
  level text default 'Básico',
  intent text,
  steps jsonb default '[]',
  created_at timestamptz default now()
);
alter table custom_exercises enable row level security;
create policy "fisio manages own exercises" on custom_exercises for all using (fisio_id = auth.uid());
create policy "all read custom exercises" on custom_exercises for select using (auth.uid() is not null);

-- 4. Citas (secretaria + fisio gestionan; paciente ve las suyas)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  fisio_id uuid not null references auth.users,
  patient_id uuid references patients on delete cascade,
  patient_name text,
  date date not null,
  time time not null,
  notes text,
  status text default 'agendada' check (status in ('agendada','completada','cancelada')),
  created_at timestamptz default now()
);
alter table appointments enable row level security;
create policy "fisio manages appointments" on appointments for all using (fisio_id = auth.uid());
create policy "secretaria manages appointments" on appointments for all using (my_role() in ('secretaria','admin'));
create policy "patient reads own appointments" on appointments for select using (is_me_patient(patient_id));
