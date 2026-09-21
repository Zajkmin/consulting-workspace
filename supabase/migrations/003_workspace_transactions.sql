begin;

-- RPCs cerradas: aceptan únicamente estructuras conocidas por el dominio.
-- Cada llamada se ejecuta en una única transacción PostgreSQL.

create or replace function gestion_trabajo.save_project_with_areas(
  p_record jsonb,p_areas jsonb,p_manager_profile_id text default null,p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_row gestion_trabajo.projects;v_primary_id text;
begin
  if p_record->>'client_id' is not null and p_record->>'client_id' <> '' and not exists(select 1 from clients where id=p_record->>'client_id') then raise exception 'client_not_found'; end if;
  if p_expected_updated_at is null then
    insert into projects(id,client_id,name,color,active,primary_area_id) values(p_record->>'id',nullif(p_record->>'client_id',''),p_record->>'name',p_record->>'color',(p_record->>'active')::boolean,null) returning * into v_row;
  else
    update projects set client_id=nullif(p_record->>'client_id',''),name=p_record->>'name',color=p_record->>'color',active=(p_record->>'active')::boolean where id=p_record->>'id' and updated_at=p_expected_updated_at returning * into v_row;
    if not found then raise exception using errcode='PT409',message='project_concurrency_conflict'; end if;
  end if;
  insert into areas(id,project_id,name,active) select x.id,v_row.id,x.name,true from jsonb_to_recordset(p_areas) as x(id text,name text) on conflict(project_id,name) do update set active=true;
  update areas set active=false where project_id=v_row.id and name<>(p_record->>'primary_area') and not exists(select 1 from jsonb_to_recordset(p_areas) as x(name text) where x.name=areas.name);
  select id into v_primary_id from areas where project_id=v_row.id and name=p_record->>'primary_area';
  if v_primary_id is null then raise exception 'primary_area_not_found'; end if;
  update projects set primary_area_id=v_primary_id where id=v_row.id returning * into v_row;
  if p_expected_updated_at is null and p_manager_profile_id is not null then insert into project_members(id,project_id,profile_id,access_level) values(gen_random_uuid()::text,v_row.id,p_manager_profile_id,'edit');end if;
  return to_jsonb(v_row);
end $$;

create or replace function gestion_trabajo.save_initiative_with_owners(
  p_record jsonb, p_owners jsonb, p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_row gestion_trabajo.initiatives;
begin
  if p_expected_updated_at is null then
    insert into initiatives(id,project_id,area_id,name,description,success_criteria,status,start_date,deadline,impact)
    values(p_record->>'id',p_record->>'project_id',p_record->>'area_id',p_record->>'name',p_record->>'description',p_record->>'success_criteria',(p_record->>'status')::work_status,(p_record->>'start_date')::date,nullif(p_record->>'deadline','')::date,(p_record->>'impact')::impact_level)
    returning * into v_row;
  else
    update initiatives set project_id=p_record->>'project_id',area_id=p_record->>'area_id',name=p_record->>'name',description=p_record->>'description',success_criteria=p_record->>'success_criteria',status=(p_record->>'status')::work_status,start_date=(p_record->>'start_date')::date,deadline=nullif(p_record->>'deadline','')::date,impact=(p_record->>'impact')::impact_level
    where id=p_record->>'id' and updated_at=p_expected_updated_at returning * into v_row;
    if not found then raise exception using errcode='PT409',message='initiative_concurrency_conflict'; end if;
  end if;
  delete from initiative_owners where initiative_id=v_row.id;
  insert into initiative_owners(initiative_id,profile_id,is_primary)
  select v_row.id,x.profile_id,x.is_primary from jsonb_to_recordset(p_owners) as x(profile_id text,is_primary boolean);
  return to_jsonb(v_row);
end $$;

create or replace function gestion_trabajo.save_profile_with_members(
  p_record jsonb, p_members jsonb, p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_row gestion_trabajo.profiles;
begin
  if p_expected_updated_at is null then
    insert into profiles(id,name,email,initials,role,manage_users,manage_projects,manage_schedule,active,entra_object_id)
    values(p_record->>'id',p_record->>'name',p_record->>'email',p_record->>'initials',(p_record->>'role')::app_role,(p_record->>'manage_users')::boolean,(p_record->>'manage_projects')::boolean,(p_record->>'manage_schedule')::boolean,(p_record->>'active')::boolean,nullif(p_record->>'entra_object_id','')) returning * into v_row;
  else
    update profiles set name=p_record->>'name',email=p_record->>'email',initials=p_record->>'initials',role=(p_record->>'role')::app_role,manage_users=(p_record->>'manage_users')::boolean,manage_projects=(p_record->>'manage_projects')::boolean,manage_schedule=(p_record->>'manage_schedule')::boolean,active=(p_record->>'active')::boolean
    where id=p_record->>'id' and updated_at=p_expected_updated_at returning * into v_row;
    if not found then raise exception using errcode='PT409',message='profile_concurrency_conflict'; end if;
  end if;
  delete from project_members where profile_id=v_row.id;
  insert into project_members(id,project_id,profile_id,access_level)
  select x.id,x.project_id,v_row.id,x.access_level::project_access_level from jsonb_to_recordset(p_members) as x(id text,project_id text,access_level text);
  return to_jsonb(v_row);
end $$;

create or replace function gestion_trabajo.save_task_with_relations(
  p_record jsonb, p_subtasks jsonb, p_dependencies jsonb, p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_row gestion_trabajo.tasks;
begin
  if p_expected_updated_at is null then
    insert into tasks(id,project_id,initiative_id,version_id,title,description,priority,status,deadline,estimated_minutes,splittable,progress,assigned_profile_id)
    values(p_record->>'id',p_record->>'project_id',p_record->>'initiative_id',p_record->>'version_id',p_record->>'title',coalesce(p_record->>'description',''),(p_record->>'priority')::priority_level,(p_record->>'status')::work_status,(p_record->>'deadline')::date,(p_record->>'estimated_minutes')::integer,(p_record->>'splittable')::boolean,(p_record->>'progress')::smallint,p_record->>'assigned_profile_id') returning * into v_row;
  else
    update tasks set project_id=p_record->>'project_id',initiative_id=p_record->>'initiative_id',version_id=p_record->>'version_id',title=p_record->>'title',description=coalesce(p_record->>'description',''),priority=(p_record->>'priority')::priority_level,status=(p_record->>'status')::work_status,deadline=(p_record->>'deadline')::date,estimated_minutes=(p_record->>'estimated_minutes')::integer,splittable=(p_record->>'splittable')::boolean,progress=(p_record->>'progress')::smallint,assigned_profile_id=p_record->>'assigned_profile_id'
    where id=p_record->>'id' and updated_at=p_expected_updated_at returning * into v_row;
    if not found then raise exception using errcode='PT409',message='task_concurrency_conflict'; end if;
  end if;
  insert into subtasks(id,task_id,title,completed,assigned_profile_id,completed_at)
  select x.id,v_row.id,x.title,x.completed,x.assigned_profile_id,x.completed_at from jsonb_to_recordset(p_subtasks) as x(id text,title text,completed boolean,assigned_profile_id text,completed_at timestamptz)
  on conflict(id) do update set title=excluded.title,completed=excluded.completed,assigned_profile_id=excluded.assigned_profile_id,completed_at=excluded.completed_at;
  delete from subtasks s where s.task_id=v_row.id and not exists(select 1 from jsonb_to_recordset(p_subtasks) as x(id text) where x.id=s.id);
  delete from task_dependencies where task_id=v_row.id;
  insert into task_dependencies(id,task_id,depends_on_task_id)
  select x.id,v_row.id,x.depends_on_task_id from jsonb_to_recordset(p_dependencies) as x(id text,depends_on_task_id text);
  return to_jsonb(v_row);
end $$;

create or replace function gestion_trabajo.create_initiative_bundle(
  p_initiative jsonb, p_owners jsonb, p_version jsonb, p_tasks jsonb
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_initiative gestion_trabajo.initiatives;v_version gestion_trabajo.versions;t jsonb;
begin
  insert into initiatives(id,project_id,area_id,name,description,success_criteria,status,start_date,deadline,impact)
  values(p_initiative->>'id',p_initiative->>'project_id',p_initiative->>'area_id',p_initiative->>'name',p_initiative->>'description',p_initiative->>'success_criteria',(p_initiative->>'status')::work_status,(p_initiative->>'start_date')::date,nullif(p_initiative->>'deadline','')::date,(p_initiative->>'impact')::impact_level) returning * into v_initiative;
  insert into initiative_owners(initiative_id,profile_id,is_primary) select v_initiative.id,x.profile_id,x.is_primary from jsonb_to_recordset(p_owners) as x(profile_id text,is_primary boolean);
  if p_version is not null and p_version <> 'null'::jsonb then
    insert into versions(id,initiative_id,code,name,status,owner_profile_id,start_date,deadline,validated)
    values(p_version->>'id',v_initiative.id,p_version->>'code',p_version->>'name',(p_version->>'status')::work_status,p_version->>'owner_profile_id',(p_version->>'start_date')::date,(p_version->>'deadline')::date,(p_version->>'validated')::boolean) returning * into v_version;
    for t in select value from jsonb_array_elements(p_tasks) loop
      insert into tasks(id,project_id,initiative_id,version_id,title,description,priority,status,deadline,estimated_minutes,splittable,progress,assigned_profile_id)
      values(t->>'id',t->>'project_id',v_initiative.id,v_version.id,t->>'title',coalesce(t->>'description',''),(t->>'priority')::priority_level,(t->>'status')::work_status,(t->>'deadline')::date,(t->>'estimated_minutes')::integer,(t->>'splittable')::boolean,(t->>'progress')::smallint,t->>'assigned_profile_id');
      insert into subtasks(id,task_id,title,completed,assigned_profile_id,completed_at) select x.id,t->>'id',x.title,x.completed,x.assigned_profile_id,x.completed_at from jsonb_to_recordset(coalesce(t->'subtasks','[]'::jsonb)) as x(id text,title text,completed boolean,assigned_profile_id text,completed_at timestamptz);
      insert into task_dependencies(id,task_id,depends_on_task_id) select x.id,t->>'id',x.depends_on_task_id from jsonb_to_recordset(coalesce(t->'dependencies','[]'::jsonb)) as x(id text,depends_on_task_id text);
    end loop;
  end if;
  return to_jsonb(v_initiative);
end $$;

create or replace function gestion_trabajo.set_block_outcome(
  p_id text,p_profile_id text,p_outcome gestion_trabajo.schedule_outcome,p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path = gestion_trabajo, pg_temp as $$
declare v_block gestion_trabajo.schedule_blocks;v_completed boolean:=p_outcome='completed';
begin
  update schedule_blocks set outcome=p_outcome,completed=v_completed,completed_at=case when v_completed then now() else null end where id=p_id and profile_id=p_profile_id and updated_at=p_expected_updated_at returning * into v_block;
  if not found then raise exception using errcode='PT409',message='schedule_block_concurrency_conflict'; end if;
  if p_outcome='advanced' then update tasks set status='En curso' where id=v_block.task_id and status='Pendiente'; end if;
  if v_completed then update tasks set status='Completada',progress=100 where id=v_block.task_id;delete from schedule_blocks where profile_id=p_profile_id and task_id=v_block.task_id and plan_date>v_block.plan_date;end if;
  return to_jsonb(v_block);
end $$;

revoke all on function gestion_trabajo.save_initiative_with_owners(jsonb,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function gestion_trabajo.save_project_with_areas(jsonb,jsonb,text,timestamptz) from public, anon, authenticated;
revoke all on function gestion_trabajo.save_profile_with_members(jsonb,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function gestion_trabajo.save_task_with_relations(jsonb,jsonb,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function gestion_trabajo.create_initiative_bundle(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function gestion_trabajo.set_block_outcome(text,text,gestion_trabajo.schedule_outcome,timestamptz) from public, anon, authenticated;
grant execute on function gestion_trabajo.save_initiative_with_owners(jsonb,jsonb,timestamptz) to service_role;
grant execute on function gestion_trabajo.save_project_with_areas(jsonb,jsonb,text,timestamptz) to service_role;
grant execute on function gestion_trabajo.save_profile_with_members(jsonb,jsonb,timestamptz) to service_role;
grant execute on function gestion_trabajo.save_task_with_relations(jsonb,jsonb,jsonb,timestamptz) to service_role;
grant execute on function gestion_trabajo.create_initiative_bundle(jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function gestion_trabajo.set_block_outcome(text,text,gestion_trabajo.schedule_outcome,timestamptz) to service_role;

commit;
