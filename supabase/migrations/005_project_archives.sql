begin;

alter table gestion_trabajo.projects
  add column archive_reason text,
  add column archived_at timestamptz,
  add column archived_by text,
  add constraint projects_archive_metadata_check check (
    (archive_reason is null and archived_at is null and archived_by is null)
    or (
      not active and archive_reason is not null
      and archive_reason in ('paused', 'completed')
      and archived_at is not null and archived_by is not null
    )
  );

-- Legacy inactive projects keep their missing metadata. The profile identifier
-- remains available for attribution even if that profile is later deleted.
create function gestion_trabajo.guard_project_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not old.active then
      raise sqlstate 'PT422' using message = 'project_archived';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not new.active then
      raise sqlstate 'PT422' using message = 'project_archive_transition_required';
    end if;
    return new;
  end if;

  if old.active is distinct from new.active
      or old.archive_reason is distinct from new.archive_reason
      or old.archived_at is distinct from new.archived_at
      or old.archived_by is distinct from new.archived_by then
    if current_setting('gestion_trabajo.archive_project_id', true) is distinct from old.id then
      raise sqlstate 'PT422' using message = 'project_archive_transition_required';
    end if;
  elsif not old.active then
    raise sqlstate 'PT422' using message = 'project_archived';
  end if;
  return new;
end;
$$;

create trigger guard_project_archive
before insert or update or delete on gestion_trabajo.projects
for each row execute function gestion_trabajo.guard_project_archive();

-- Lock the owning projects when writing. The lock conflicts with a transition
-- on the same project, so a stale editor cannot write after archival.
create function gestion_trabajo.guard_archived_project_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  before_row jsonb;
  after_row jsonb;
  project_row record;
begin
  if tg_op <> 'INSERT' then before_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then after_row := to_jsonb(new); end if;

  for project_row in
    select p.active
    from gestion_trabajo.projects p
    where p.id in (
      select state->>'project_id'
      from (values (before_row), (after_row)) as rows(state)
      where tg_argv[0] = 'project'
      union
      select i.project_id
      from gestion_trabajo.initiatives i
      join (values (before_row), (after_row)) as rows(state) on i.id = state->>'initiative_id'
      where tg_argv[0] = 'initiative'
      union
      select t.project_id
      from gestion_trabajo.tasks t
      join (values (before_row), (after_row)) as rows(state)
        on t.id = state->>'task_id'
          or (tg_argv[0] = 'dependency' and t.id = state->>'depends_on_task_id')
      where tg_argv[0] in ('task', 'dependency')
    )
    order by p.id
    for share of p
  loop
    if not project_row.active then
      raise sqlstate 'PT422' using message = 'project_archived';
    end if;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.areas
for each row execute function gestion_trabajo.guard_archived_project_content('project');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.initiatives
for each row execute function gestion_trabajo.guard_archived_project_content('project');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.tasks
for each row execute function gestion_trabajo.guard_archived_project_content('project');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.initiative_owners
for each row execute function gestion_trabajo.guard_archived_project_content('initiative');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.versions
for each row execute function gestion_trabajo.guard_archived_project_content('initiative');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.subtasks
for each row execute function gestion_trabajo.guard_archived_project_content('task');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.task_dependencies
for each row execute function gestion_trabajo.guard_archived_project_content('dependency');
create trigger guard_archived_project_content before insert or update or delete on gestion_trabajo.schedule_blocks
for each row execute function gestion_trabajo.guard_archived_project_content('task');

create function gestion_trabajo.set_project_archive(
  p_project_id text,
  p_actor_id text,
  p_archive_reason text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  project_active boolean;
begin
  if p_archive_reason is not null and p_archive_reason not in ('paused', 'completed') then
    raise sqlstate 'PT422' using message = 'invalid_project_archive_reason';
  end if;

  if not exists (
    select 1 from gestion_trabajo.profiles actor
    where actor.id = p_actor_id and actor.active
      and (
        actor.role = 'admin'
        or (actor.role = 'gestor' and exists (
          select 1 from gestion_trabajo.project_members member
          where member.project_id = p_project_id and member.profile_id = actor.id
            and member.access_level in ('edit', 'admin')
        ))
      )
  ) then
    raise sqlstate 'PT403' using message = 'project_archive_forbidden';
  end if;

  select p.active into project_active
  from gestion_trabajo.projects p
  where p.id = p_project_id
  for update;
  if not found then
    raise sqlstate 'PT404' using message = 'project_not_found';
  end if;

  if project_active = (p_archive_reason is null) then
    raise sqlstate 'PT409' using message = 'project_archive_state_conflict';
  end if;

  perform set_config('gestion_trabajo.archive_project_id', p_project_id, true);
  update gestion_trabajo.projects
  set active = p_archive_reason is null,
      archive_reason = p_archive_reason,
      archived_at = case when p_archive_reason is not null then now() end,
      archived_by = case when p_archive_reason is not null then p_actor_id end
  where id = p_project_id;
  perform set_config('gestion_trabajo.archive_project_id', '', true);
end;
$$;

revoke execute on function gestion_trabajo.guard_project_archive() from public, anon, authenticated;
revoke execute on function gestion_trabajo.guard_archived_project_content() from public, anon, authenticated;
revoke execute on function gestion_trabajo.set_project_archive(text, text, text) from public, anon, authenticated;
grant execute on function gestion_trabajo.set_project_archive(text, text, text) to service_role;

commit;
