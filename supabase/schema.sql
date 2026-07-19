-- ════════════════════════════════════════════
--  MOMENTUM — Esquema Supabase
--  Ejecutar en: SQL Editor de tu proyecto Supabase
-- ════════════════════════════════════════════

-- Perfiles (extiende auth.users de Supabase)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('fisio','paciente')),
  name text not null,
  cedula text,
  dob date,
  phone text,
  created_at timestamptz default now()
);

-- Pacientes (ficha clínica; user_id enlaza con su cuenta si tiene)
create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  fisio_id uuid not null references auth.users,
  name text not null,
  age int,
  phone text,
  email text,
  diagnosis text default 'Pendiente de evaluación',
  section text default '',
  anamnesis jsonb,
  created_at timestamptz default now()
);

-- Sesiones clínicas
create table sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  fisio_id uuid not null references auth.users,
  title text not null,
  date date not null,
  notes text,
  progress text,
  created_at timestamptz default now()
);

-- Evaluación fisioterapéutica + diagnóstico (un registro por paciente)
create table evaluations (
  patient_id uuid primary key references patients on delete cascade,
  eval_data jsonb default '{}',
  diagnosis jsonb default '{}',
  updated_at timestamptz default now()
);

-- Ejercicios asignados (programa activo, un registro por paciente)
create table assignments (
  patient_id uuid primary key references patients on delete cascade,
  exercises jsonb not null default '[]',
  frequency text,
  assigned_by uuid references auth.users,
  assigned_at timestamptz default now()
);

-- Historial de programas archivados
create table assignment_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  exercises jsonb not null,
  frequency text,
  assigned_at timestamptz,
  archived_at timestamptz default now()
);

-- Registros de cumplimiento (complogs)
create table completion_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  ex_id int not null,
  section_id text not null,
  date date not null,
  feeling text,
  note text,
  pain int check (pain between 0 and 10),
  created_at timestamptz default now()
);

-- Programa semanal asignado
create table week_assignments (
  patient_id uuid primary key references patients on delete cascade,
  program_id text not null,
  start_date date not null,
  assigned_by uuid references auth.users,
  assigned_at timestamptz default now()
);

-- Entrenamientos semanales completados
create table week_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  program_id text not null,
  week int not null,
  workout_idx int not null,
  date date not null,
  unique (patient_id, program_id, week, workout_idx)
);

-- Cuestionarios funcionales (PSFS + Escala Momentum)
create table questionnaires (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  type text not null check (type in ('psfs','momentum')),
  date date not null,
  items jsonb,
  answers jsonb,
  avg numeric,
  pct int,
  created_at timestamptz default now()
);

-- Notificaciones in-app
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  sub text,
  kind text default 'general',
  read boolean default false,
  created_at timestamptz default now()
);

-- Videos (metadatos; el archivo va en Supabase Storage bucket 'videos')
create table videos (
  id uuid primary key default gen_random_uuid(),
  fisio_id uuid not null references auth.users,
  title text not null,
  description text,
  storage_path text not null,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ════════════════════════════════════════════
alter table profiles enable row level security;
alter table patients enable row level security;
alter table sessions enable row level security;
alter table evaluations enable row level security;
alter table assignments enable row level security;
alter table assignment_history enable row level security;
alter table completion_logs enable row level security;
alter table week_assignments enable row level security;
alter table week_logs enable row level security;
alter table questionnaires enable row level security;
alter table notifications enable row level security;
alter table videos enable row level security;

-- helper: es fisio del paciente
create or replace function is_my_patient(pid uuid) returns boolean as $$
  select exists(select 1 from patients where id = pid and fisio_id = auth.uid());
$$ language sql security definer;

-- helper: soy el paciente
create or replace function is_me_patient(pid uuid) returns boolean as $$
  select exists(select 1 from patients where id = pid and user_id = auth.uid());
$$ language sql security definer;

-- PROFILES: cada quien ve/edita el suyo; fisios pueden leer perfiles de sus pacientes
create policy "own profile" on profiles for all using (id = auth.uid());

-- PATIENTS: fisio dueño total; paciente lee y actualiza su anamnesis
create policy "fisio manages patients" on patients for all using (fisio_id = auth.uid());
create policy "patient reads self" on patients for select using (user_id = auth.uid());
create policy "patient updates self" on patients for update using (user_id = auth.uid());
create policy "patient creates own record" on patients for insert with check (user_id = auth.uid());

-- SESSIONS: fisio dueño; paciente lee las suyas
create policy "fisio manages sessions" on sessions for all using (fisio_id = auth.uid());
create policy "patient reads own sessions" on sessions for select using (is_me_patient(patient_id));

-- EVALUATIONS: fisio total; paciente lee
create policy "fisio manages evals" on evaluations for all using (is_my_patient(patient_id));
create policy "patient reads eval" on evaluations for select using (is_me_patient(patient_id));

-- ASSIGNMENTS: fisio total; paciente lee
create policy "fisio manages assignments" on assignments for all using (is_my_patient(patient_id));
create policy "patient reads assignment" on assignments for select using (is_me_patient(patient_id));

create policy "fisio manages history" on assignment_history for all using (is_my_patient(patient_id));

-- COMPLETION LOGS: paciente crea/lee los suyos; fisio lee
create policy "patient manages own logs" on completion_logs for all using (is_me_patient(patient_id));
create policy "fisio reads logs" on completion_logs for select using (is_my_patient(patient_id));

-- WEEK: fisio asigna; paciente lee y registra
create policy "fisio manages weekassign" on week_assignments for all using (is_my_patient(patient_id));
create policy "patient reads weekassign" on week_assignments for select using (is_me_patient(patient_id));
create policy "patient manages weeklogs" on week_logs for all using (is_me_patient(patient_id));
create policy "fisio reads weeklogs" on week_logs for select using (is_my_patient(patient_id));

-- QUESTIONNAIRES: paciente crea/lee; fisio lee
create policy "patient manages quests" on questionnaires for all using (is_me_patient(patient_id));
create policy "fisio reads quests" on questionnaires for select using (is_my_patient(patient_id));

-- NOTIFICATIONS: cada quien las suyas; cualquiera autenticado puede insertar (para notificar al otro rol)
create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "update own notifications" on notifications for update using (user_id = auth.uid());
create policy "insert notifications" on notifications for insert with check (auth.uid() is not null);

-- VIDEOS: fisio gestiona los suyos; pacientes del fisio los ven
create policy "fisio manages videos" on videos for all using (fisio_id = auth.uid());
create policy "patients view fisio videos" on videos for select using (
  exists(select 1 from patients where user_id = auth.uid() and fisio_id = videos.fisio_id)
);

-- ════════════════════════════════════════════
--  TRIGGER: crear perfil automático al registrarse
--  (el rol y nombre llegan en raw_user_meta_data)
-- ════════════════════════════════════════════
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, role, name, cedula, dob, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'paciente'),
    coalesce(new.raw_user_meta_data->>'name', 'Usuario'),
    new.raw_user_meta_data->>'cedula',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
