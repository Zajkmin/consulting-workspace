begin;

create schema if not exists gestion_trabajo;

-- Los enums preservan exactamente los valores funcionales actuales.
create type gestion_trabajo.app_role as enum ('admin', 'gestor', 'usuario');
create type gestion_trabajo.project_access_level as enum ('view', 'edit', 'admin');
create type gestion_trabajo.work_status as enum (
  'Pendiente', 'En curso', 'En revisión', 'Completada', 'Retrasada'
);
create type gestion_trabajo.priority_level as enum ('Alta', 'Media', 'Baja');
create type gestion_trabajo.impact_level as enum ('Alto', 'Medio', 'Bajo');
create type gestion_trabajo.schedule_source as enum ('manual', 'suggested');
create type gestion_trabajo.schedule_outcome as enum ('planned', 'advanced', 'completed');

create function gestion_trabajo.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table gestion_trabajo.clients (
  id text primary key default gen_random_uuid()::text,
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gestion_trabajo.profiles (
  id text primary key default gen_random_uuid()::text,
  -- Se completa después de migrar y vincular la cuenta con Supabase Auth.
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (btrim(name) <> ''),
  email text not null check (btrim(email) <> '' and email = lower(btrim(email))),
  initials text not null check (btrim(initials) <> ''),
  role gestion_trabajo.app_role not null default 'usuario',
  manage_users boolean not null default false,
  manage_projects boolean not null default false,
  manage_schedule boolean not null default true,
  active boolean not null default true,
  entra_object_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_normalized_uidx
  on gestion_trabajo.profiles (lower(btrim(email)));
create unique index profiles_entra_object_id_uidx
  on gestion_trabajo.profiles (entra_object_id)
  where entra_object_id is not null and btrim(entra_object_id) <> '';
create index profiles_role_active_idx
  on gestion_trabajo.profiles (role, active);

create table gestion_trabajo.projects (
  id text primary key default gen_random_uuid()::text,
  client_id text not null
    references gestion_trabajo.clients(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  -- Se agrega su FK después de crear areas para resolver la relación circular.
  -- Puede ser NULL únicamente durante una migración o alta transaccional.
  primary_area_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_client_id_idx on gestion_trabajo.projects (client_id);
create index projects_active_idx on gestion_trabajo.projects (active);
create index projects_name_idx on gestion_trabajo.projects (name);

create table gestion_trabajo.areas (
  id text primary key default gen_random_uuid()::text,
  project_id text not null
    references gestion_trabajo.projects(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_project_name_unique unique (project_id, name),
  constraint areas_project_id_id_unique unique (project_id, id)
);

create index areas_project_active_idx
  on gestion_trabajo.areas (project_id, active);

alter table gestion_trabajo.projects
  add constraint projects_primary_area_fk
  foreign key (id, primary_area_id)
  references gestion_trabajo.areas(project_id, id)
  on delete no action
  deferrable initially deferred;

create index projects_primary_area_id_idx
  on gestion_trabajo.projects (primary_area_id);

create table gestion_trabajo.project_members (
  id text primary key default gen_random_uuid()::text,
  project_id text not null
    references gestion_trabajo.projects(id) on delete cascade,
  profile_id text not null
    references gestion_trabajo.profiles(id) on delete cascade,
  access_level gestion_trabajo.project_access_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_members_project_profile_unique
    unique (project_id, profile_id)
);

create index project_members_profile_access_idx
  on gestion_trabajo.project_members (profile_id, access_level, project_id);
create index project_members_project_access_idx
  on gestion_trabajo.project_members (project_id, access_level, profile_id);

create table gestion_trabajo.initiatives (
  id text primary key default gen_random_uuid()::text,
  project_id text not null,
  area_id text not null,
  name text not null check (btrim(name) <> ''),
  description text,
  success_criteria text,
  status gestion_trabajo.work_status not null default 'Pendiente',
  start_date date not null,
  deadline date,
  impact gestion_trabajo.impact_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint initiatives_project_fk
    foreign key (project_id)
    references gestion_trabajo.projects(id) on delete cascade,
  constraint initiatives_area_in_project_fk
    foreign key (project_id, area_id)
    references gestion_trabajo.areas(project_id, id) on delete restrict,
  constraint initiatives_project_id_id_unique unique (project_id, id),
  constraint initiatives_dates_check
    check (deadline is null or deadline >= start_date)
);

create index initiatives_project_status_idx
  on gestion_trabajo.initiatives (project_id, status);
create index initiatives_project_area_idx
  on gestion_trabajo.initiatives (project_id, area_id);
create index initiatives_deadline_idx
  on gestion_trabajo.initiatives (deadline)
  where deadline is not null;
create index initiatives_start_date_idx
  on gestion_trabajo.initiatives (start_date);

-- Tabla adicional necesaria para normalizar los múltiples responsables actuales.
-- Reemplaza OwnerUserId + OwnerUserIds y evita arrays/CSV de IDs.
create table gestion_trabajo.initiative_owners (
  initiative_id text not null
    references gestion_trabajo.initiatives(id) on delete cascade,
  profile_id text not null
    references gestion_trabajo.profiles(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (initiative_id, profile_id)
);

create unique index initiative_owners_one_primary_uidx
  on gestion_trabajo.initiative_owners (initiative_id)
  where is_primary;
create index initiative_owners_profile_idx
  on gestion_trabajo.initiative_owners (profile_id, initiative_id);

create table gestion_trabajo.versions (
  id text primary key default gen_random_uuid()::text,
  initiative_id text not null
    references gestion_trabajo.initiatives(id) on delete cascade,
  -- Etiqueta visual editable; la identidad y las relaciones usan id/AppId.
  -- Puede repetirse dentro de una iniciativa, igual que en la aplicación actual.
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  status gestion_trabajo.work_status not null default 'Pendiente',
  owner_profile_id text not null
    references gestion_trabajo.profiles(id) on delete restrict,
  start_date date not null,
  deadline date not null,
  validated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint versions_initiative_id_id_unique unique (initiative_id, id),
  constraint versions_dates_check check (deadline >= start_date)
);

create index versions_initiative_status_idx
  on gestion_trabajo.versions (initiative_id, status);
create index versions_owner_status_idx
  on gestion_trabajo.versions (owner_profile_id, status);
create index versions_deadline_idx on gestion_trabajo.versions (deadline);
create index versions_start_date_idx on gestion_trabajo.versions (start_date);

create table gestion_trabajo.tasks (
  id text primary key default gen_random_uuid()::text,
  project_id text not null,
  initiative_id text not null,
  version_id text not null,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  priority gestion_trabajo.priority_level not null default 'Media',
  status gestion_trabajo.work_status not null default 'Pendiente',
  -- Se conservan por compatibilidad con los datos actuales, aunque hoy la UI
  -- normalmente deriva la fecha de la versión y ya no pide una estimación.
  deadline date not null,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  splittable boolean not null default true,
  progress smallint not null default 0 check (progress between 0 and 100),
  assigned_profile_id text not null
    references gestion_trabajo.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_project_initiative_fk
    foreign key (project_id, initiative_id)
    references gestion_trabajo.initiatives(project_id, id) on delete cascade,
  constraint tasks_initiative_version_fk
    foreign key (initiative_id, version_id)
    references gestion_trabajo.versions(initiative_id, id) on delete cascade
);

create index tasks_project_status_idx
  on gestion_trabajo.tasks (project_id, status);
create index tasks_initiative_status_idx
  on gestion_trabajo.tasks (initiative_id, status);
create index tasks_version_status_idx
  on gestion_trabajo.tasks (version_id, status);
create index tasks_assignee_status_idx
  on gestion_trabajo.tasks (assigned_profile_id, status);
create index tasks_priority_status_idx
  on gestion_trabajo.tasks (priority, status);
create index tasks_deadline_idx on gestion_trabajo.tasks (deadline);

create table gestion_trabajo.subtasks (
  id text primary key default gen_random_uuid()::text,
  task_id text not null
    references gestion_trabajo.tasks(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  completed boolean not null default false,
  assigned_profile_id text not null
    references gestion_trabajo.profiles(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subtasks_task_completed_idx
  on gestion_trabajo.subtasks (task_id, completed);
create index subtasks_assignee_completed_idx
  on gestion_trabajo.subtasks (assigned_profile_id, completed);

create table gestion_trabajo.task_dependencies (
  id text primary key default gen_random_uuid()::text,
  task_id text not null
    references gestion_trabajo.tasks(id) on delete cascade,
  depends_on_task_id text not null
    references gestion_trabajo.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint task_dependencies_pair_unique unique (task_id, depends_on_task_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id)
);

create index task_dependencies_required_task_idx
  on gestion_trabajo.task_dependencies (depends_on_task_id, task_id);

create table gestion_trabajo.schedule_blocks (
  id text primary key default gen_random_uuid()::text,
  profile_id text not null
    references gestion_trabajo.profiles(id) on delete cascade,
  task_id text not null
    references gestion_trabajo.tasks(id) on delete cascade,
  plan_date date not null,
  start_time time,
  end_time time,
  source gestion_trabajo.schedule_source not null default 'manual',
  outcome gestion_trabajo.schedule_outcome not null default 'planned',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_times_check check (
    start_time is null or end_time is null or end_time > start_time
  ),
  constraint schedule_blocks_completion_check check (
    (completed and outcome = 'completed')
    or (not completed and outcome <> 'completed')
  )
);

create index schedule_blocks_profile_date_idx
  on gestion_trabajo.schedule_blocks (profile_id, plan_date);
create index schedule_blocks_task_date_idx
  on gestion_trabajo.schedule_blocks (task_id, plan_date);
create index schedule_blocks_date_outcome_idx
  on gestion_trabajo.schedule_blocks (plan_date, outcome);

create table gestion_trabajo.work_preferences (
  id text primary key default gen_random_uuid()::text,
  profile_id text not null unique
    references gestion_trabajo.profiles(id) on delete cascade,
  day_start time not null,
  day_end time not null,
  working_days smallint[] not null,
  focus_block_minutes integer not null check (focus_block_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_preferences_hours_check check (day_end > day_start),
  constraint work_preferences_days_check check (
    cardinality(working_days) > 0
    and working_days <@ array[0,1,2,3,4,5,6]::smallint[]
  )
);

-- updated_at automático para las tablas mutables.
create trigger clients_set_updated_at before update on gestion_trabajo.clients
for each row execute function gestion_trabajo.set_updated_at();
create trigger profiles_set_updated_at before update on gestion_trabajo.profiles
for each row execute function gestion_trabajo.set_updated_at();
create trigger projects_set_updated_at before update on gestion_trabajo.projects
for each row execute function gestion_trabajo.set_updated_at();
create trigger areas_set_updated_at before update on gestion_trabajo.areas
for each row execute function gestion_trabajo.set_updated_at();
create trigger project_members_set_updated_at before update on gestion_trabajo.project_members
for each row execute function gestion_trabajo.set_updated_at();
create trigger initiatives_set_updated_at before update on gestion_trabajo.initiatives
for each row execute function gestion_trabajo.set_updated_at();
create trigger versions_set_updated_at before update on gestion_trabajo.versions
for each row execute function gestion_trabajo.set_updated_at();
create trigger tasks_set_updated_at before update on gestion_trabajo.tasks
for each row execute function gestion_trabajo.set_updated_at();
create trigger subtasks_set_updated_at before update on gestion_trabajo.subtasks
for each row execute function gestion_trabajo.set_updated_at();
create trigger schedule_blocks_set_updated_at before update on gestion_trabajo.schedule_blocks
for each row execute function gestion_trabajo.set_updated_at();
create trigger work_preferences_set_updated_at before update on gestion_trabajo.work_preferences
for each row execute function gestion_trabajo.set_updated_at();

commit;
