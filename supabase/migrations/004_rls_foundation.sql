-- Foundation para RLS futuro.
-- NO activa RLS ni crea policies ejecutables en esta migración.
-- Se usa como base segura para una segunda fase de políticas y enablement.

begin;

create schema if not exists gestion_trabajo_private;

-- La capa privada existe para encapsular helpers que derivan identidad desde auth.uid()
-- y evitar que existan policies con lógica duplicada o con profile_id enviado por cliente.
revoke all on schema gestion_trabajo_private from public;
revoke all on all functions in schema gestion_trabajo_private from public, anon, authenticated;

create or replace function gestion_trabajo_private.current_profile_id()
returns text
language sql
security definer
set search_path = ''
as $$
  select p.id
  from gestion_trabajo.profiles p
  where p.auth_user_id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function gestion_trabajo_private.current_profile_role()
returns gestion_trabajo.app_role
language sql
security definer
set search_path = ''
as $$
  select p.role
  from gestion_trabajo.profiles p
  where p.auth_user_id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function gestion_trabajo_private.is_global_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.profiles p
    where p.auth_user_id = auth.uid()
      and p.active = true
      and p.role = 'admin'
  );
$$;

-- Contrato de autorización que debe replicar esta capa:
-- authorization.ts define "view" como assignedProjectIds OR editableProjectIds,
-- "edit" como editableProjectIds, y "manage" como admin OR gestor con edit/admin membership.
-- No se inventan accesos cuando no existe project_members; los miembros no autenticados
-- no reciben acceso implícito. El admin global sigue teniendo acceso sin membership.
create or replace function gestion_trabajo_private.current_profile_has_project_access(p_project_id text, p_required_access text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.profiles p
    where p.auth_user_id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or (
          p_required_access = 'view'
          and exists (
            select 1
            from gestion_trabajo.project_members pm
            where pm.profile_id = p.id
              and pm.project_id = p_project_id
              and pm.access_level in ('view', 'edit', 'admin')
          )
        )
        or (
          p_required_access = 'edit'
          and exists (
            select 1
            from gestion_trabajo.project_members pm
            where pm.profile_id = p.id
              and pm.project_id = p_project_id
              and pm.access_level in ('edit', 'admin')
          )
        )
        or (
          p_required_access = 'admin'
          and exists (
            select 1
            from gestion_trabajo.project_members pm
            where pm.profile_id = p.id
              and pm.project_id = p_project_id
              and pm.access_level = 'admin'
          )
        )
      )
  );
$$;

create or replace function gestion_trabajo_private.can_view_project(p_project_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select gestion_trabajo_private.current_profile_has_project_access(p_project_id, 'view');
$$;

create or replace function gestion_trabajo_private.can_edit_project(p_project_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select gestion_trabajo_private.current_profile_has_project_access(p_project_id, 'edit');
$$;

create or replace function gestion_trabajo_private.can_manage_project(p_project_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.profiles p
    where p.auth_user_id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or (
          p.role = 'gestor'
          and exists (
            select 1
            from gestion_trabajo.project_members pm
            where pm.profile_id = p.id
              and pm.project_id = p_project_id
              and pm.access_level in ('edit', 'admin')
          )
        )
      )
  );
$$;

create or replace function gestion_trabajo_private.can_control_task(p_task_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.profiles p
    where p.auth_user_id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or (
          p.role = 'gestor'
          and exists (
            select 1
            from gestion_trabajo.tasks t
            join gestion_trabajo.project_members pm
              on pm.profile_id = p.id
             and pm.project_id = t.project_id
            where t.id = p_task_id
              and pm.access_level in ('edit', 'admin')
          )
        )
        or (
          p.role = 'usuario'
          and exists (
            select 1
            from gestion_trabajo.tasks t
            join gestion_trabajo.project_members pm
              on pm.profile_id = p.id
             and pm.project_id = t.project_id
            where t.id = p_task_id
              and pm.access_level in ('edit', 'admin')
              and t.assigned_profile_id = p.id
          )
        )
      )
  );
$$;

create or replace function gestion_trabajo_private.current_profile_owns_task(p_task_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.tasks t
    join gestion_trabajo.profiles p
      on p.id = t.assigned_profile_id
    where t.id = p_task_id
      and p.auth_user_id = auth.uid()
      and p.active = true
  );
$$;

create or replace function gestion_trabajo_private.current_profile_matches(p_profile_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from gestion_trabajo.profiles p
    where p.id = p_profile_id
      and p.auth_user_id = auth.uid()
      and p.active = true
  );
$$;

-- No se otorgan derechos a authenticated todavía.
-- Las policies de producción se construirán en una siguiente migración y se revisarán
-- en conjunto con la matriz de permisos real de la app.
revoke all on function gestion_trabajo_private.current_profile_id() from public, anon, authenticated;
revoke all on function gestion_trabajo_private.current_profile_role() from public, anon, authenticated;
revoke all on function gestion_trabajo_private.is_global_admin() from public, anon, authenticated;
revoke all on function gestion_trabajo_private.current_profile_has_project_access(text, text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.can_view_project(text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.can_edit_project(text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.can_manage_project(text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.can_control_task(text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.current_profile_owns_task(text) from public, anon, authenticated;
revoke all on function gestion_trabajo_private.current_profile_matches(text) from public, anon, authenticated;

-- FUTURO: cuando se creen policies ejecutadas por authenticated, será necesario:
-- grant usage on schema gestion_trabajo_private to authenticated;
-- grant execute on function gestion_trabajo_private.current_profile_id() to authenticated;
-- grant execute on function gestion_trabajo_private.current_profile_role() to authenticated;
-- grant execute on function gestion_trabajo_private.is_global_admin() to authenticated;
-- grant execute on function gestion_trabajo_private.current_profile_has_project_access(text, text) to authenticated;
-- grant execute on function gestion_trabajo_private.can_view_project(text) to authenticated;
-- grant execute on function gestion_trabajo_private.can_edit_project(text) to authenticated;
-- grant execute on function gestion_trabajo_private.can_manage_project(text) to authenticated;
-- grant execute on function gestion_trabajo_private.can_control_task(text) to authenticated;
-- grant execute on function gestion_trabajo_private.current_profile_owns_task(text) to authenticated;
-- grant execute on function gestion_trabajo_private.current_profile_matches(text) to authenticated;
-- Estos grants no se aplican en esta migración.

-- Grant mínimo para servicio interno revisor/tester, sin activar RLS.
grant usage on schema gestion_trabajo_private to service_role;
grant execute on all functions in schema gestion_trabajo_private to service_role;

-- En esta migración no se habilita RLS ni se aplica ninguna policy.
-- La activación real se dejará para la fase posterior, con pruebas de matrix y recursion.

commit;
