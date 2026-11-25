-- Ejecutar únicamente en gestion-trabajo-dev con sus datos de demostración.
-- Se revierten tanto las transiciones como los registros de prueba.
begin;
set local role service_role;

do $$
declare
  admin_id text;
  manager_id text;
  user_id text;
  demo_id constant text := 'dev-project-ventas';
  assigned_id text := 'archive-test-' || gen_random_uuid()::text;
  unassigned_id text := 'archive-test-' || gen_random_uuid()::text;
  history_before jsonb;
  history_after jsonb;
begin
  select id into strict admin_id from gestion_trabajo.profiles where role = 'admin' and active;
  select id into strict manager_id from gestion_trabajo.profiles where role = 'gestor' and active;
  select id into strict user_id from gestion_trabajo.profiles where role = 'usuario' and active;
  if not exists (select 1 from gestion_trabajo.projects where id=demo_id and active and name like '%(Demo)') then
    raise exception 'Se requiere el proyecto de desarrollo Ventas (Demo) activo';
  end if;

  create temporary view archive_test_history as
    select 'area' as kind, to_jsonb(a) as row from gestion_trabajo.areas a where a.project_id='dev-project-ventas'
    union all select 'initiative', to_jsonb(i) from gestion_trabajo.initiatives i where i.project_id='dev-project-ventas'
    union all select 'owner', to_jsonb(o) from gestion_trabajo.initiative_owners o join gestion_trabajo.initiatives i on i.id=o.initiative_id where i.project_id='dev-project-ventas'
    union all select 'version', to_jsonb(v) from gestion_trabajo.versions v join gestion_trabajo.initiatives i on i.id=v.initiative_id where i.project_id='dev-project-ventas'
    union all select 'task', to_jsonb(t) from gestion_trabajo.tasks t where t.project_id='dev-project-ventas'
    union all select 'subtask', to_jsonb(s) from gestion_trabajo.subtasks s join gestion_trabajo.tasks t on t.id=s.task_id where t.project_id='dev-project-ventas'
    union all select 'dependency', to_jsonb(d) from gestion_trabajo.task_dependencies d join gestion_trabajo.tasks t on t.id=d.task_id where t.project_id='dev-project-ventas'
    union all select 'schedule', to_jsonb(b) from gestion_trabajo.schedule_blocks b join gestion_trabajo.tasks t on t.id=b.task_id where t.project_id='dev-project-ventas'
    union all select 'member', to_jsonb(m) from gestion_trabajo.project_members m where m.project_id='dev-project-ventas';
  select jsonb_agg(row order by kind,row) into history_before from archive_test_history;

  perform gestion_trabajo.set_project_archive(demo_id,admin_id,'paused');
  if not exists (select 1 from gestion_trabajo.projects where id=demo_id and not active and archive_reason='paused' and archived_at is not null and archived_by=admin_id) then
    raise exception 'El administrador no archivó el proyecto como pausado';
  end if;
  begin
    update gestion_trabajo.projects set active=true where id=demo_id;
    raise exception 'La edición normal reactivó un proyecto';
  exception when sqlstate 'PT422' then null;
  end;
  begin
    update gestion_trabajo.tasks set title=title where project_id=demo_id;
    raise exception 'Una edición de tareas archivadas fue aceptada';
  exception when sqlstate 'PT422' then null;
  end;
  begin
    delete from gestion_trabajo.projects where id=demo_id;
    raise exception 'Se permitió eliminar un proyecto archivado';
  exception when sqlstate 'PT422' then null;
  end;
  begin
    perform gestion_trabajo.set_project_archive(demo_id,user_id,null);
    raise exception 'Un usuario pudo reactivar un proyecto';
  exception when sqlstate 'PT403' then null;
  end;
  perform gestion_trabajo.set_project_archive(demo_id,admin_id,null);
  if not exists (select 1 from gestion_trabajo.projects where id=demo_id and active and archive_reason is null and archived_at is null and archived_by is null) then
    raise exception 'El proyecto no volvió al listado de activos';
  end if;

  insert into gestion_trabajo.projects(id,name,color) values
    (assigned_id,'Prueba de archivado asignada (Demo)','#004f76'),
    (unassigned_id,'Prueba de archivado sin permiso (Demo)','#004f76');
  insert into gestion_trabajo.project_members(project_id,profile_id,access_level)
    values (assigned_id,manager_id,'edit'),(unassigned_id,manager_id,'view'),(assigned_id,user_id,'edit');
  begin
    perform gestion_trabajo.set_project_archive(unassigned_id,manager_id,'completed');
    raise exception 'Un gestor con solo lectura pudo archivar';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform gestion_trabajo.set_project_archive(assigned_id,user_id,'completed');
    raise exception 'Un usuario con permiso de edición pudo archivar';
  exception when sqlstate 'PT403' then null;
  end;
  perform gestion_trabajo.set_project_archive(assigned_id,manager_id,'completed');
  if not exists (select 1 from gestion_trabajo.projects where id=assigned_id and not active and archive_reason='completed' and archived_by=manager_id) then
    raise exception 'El gestor no archivó el proyecto asignado';
  end if;
  perform gestion_trabajo.set_project_archive(assigned_id,manager_id,null);

  select jsonb_agg(row order by kind,row) into history_after from archive_test_history;
  if history_after is distinct from history_before then
    raise exception 'Se modificaron datos o relaciones históricas';
  end if;
end;
$$;

rollback;
select 'ok' as archive_permissions_transitions_and_history;
