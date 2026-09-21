import { listMappers } from "../src/services/sharepoint/mappers.ts";
import { getSupabaseAdminConfig, SupabaseAdminRestClient, SupabaseMigrationError } from "../src/services/supabase/admin-rest-client.ts";
import { prevalidateSharePointMigration, type RawMigrationLists } from "./prevalidate-sharepoint-migration.ts";

type Row = Record<string, unknown>;
type TargetTable =
  | "clients" | "profiles" | "projects" | "areas" | "project_members"
  | "initiatives" | "initiative_owners" | "versions" | "tasks" | "subtasks"
  | "task_dependencies" | "schedule_blocks" | "work_preferences";

interface MigrationPlan {
  clients:Row[];profiles:Row[];projectStages:Row[];projects:Row[];areas:Row[];
  project_members:Row[];initiatives:Row[];initiative_owners:Row[];versions:Row[];
  tasks:Row[];subtasks:Row[];task_dependencies:Row[];schedule_blocks:Row[];work_preferences:Row[];
}

interface Step { table:TargetTable;rows:Row[];conflict:string }

const BATCH_SIZE=200;
const text=(value:unknown):string=>typeof value==="string"?value:"";
const keyFor=(table:TargetTable,row:Row):string=>table==="initiative_owners"
  ?`${text(row.initiative_id)}\u0000${text(row.profile_id)}`
  :text(row.id);
const unique=<T>(values:T[]):T[]=>[...new Set(values)];

function mappedSource(raw:RawMigrationLists){
  const mapped={
    clients:listMappers.clients(raw.clients),projects:listMappers.projects(raw.projects),areas:listMappers.areas(raw.areas),
    initiatives:listMappers.initiatives(raw.initiatives),versions:listMappers.versions(raw.versions),tasks:listMappers.tasks(raw.tasks),
    subtasks:listMappers.subtasks(raw.subtasks),taskDependencies:listMappers.taskDependencies(raw.taskDependencies),
    scheduleBlocks:listMappers.scheduleBlocks(raw.scheduleBlocks),workPreferences:listMappers.workPreferences(raw.workPreferences),
    users:listMappers.users(raw.users),projectMembers:listMappers.projectMembers(raw.projectMembers),
  };
  const errors=Object.entries(mapped).flatMap(([entity,result])=>result.errors.map(message=>`${entity}: ${message}`));
  if(errors.length)throw new Error("Los mappers detectaron datos inválidos después de la prevalidación.");
  return Object.fromEntries(Object.entries(mapped).map(([key,result])=>[key,result.entities])) as {
    clients:ReturnType<typeof listMappers.clients>["entities"];
    projects:ReturnType<typeof listMappers.projects>["entities"];
    areas:ReturnType<typeof listMappers.areas>["entities"];
    initiatives:ReturnType<typeof listMappers.initiatives>["entities"];
    versions:ReturnType<typeof listMappers.versions>["entities"];
    tasks:ReturnType<typeof listMappers.tasks>["entities"];
    subtasks:ReturnType<typeof listMappers.subtasks>["entities"];
    taskDependencies:ReturnType<typeof listMappers.taskDependencies>["entities"];
    scheduleBlocks:ReturnType<typeof listMappers.scheduleBlocks>["entities"];
    workPreferences:ReturnType<typeof listMappers.workPreferences>["entities"];
    users:ReturnType<typeof listMappers.users>["entities"];
    projectMembers:ReturnType<typeof listMappers.projectMembers>["entities"];
  };
}

function buildPlan(raw:RawMigrationLists):MigrationPlan {
  const source=mappedSource(raw);
  const areaByProjectAndName=new Map(source.areas.map(area=>[`${area.projectId}\u0000${area.name}`,area.id]));
  const projectStages:Row[]=source.projects.map(project=>({
    id:project.id,client_id:project.clientId,name:project.name,color:project.color,active:project.active,
  }));
  const projects:Row[]=source.projects.map(project=>{
    const primaryAreaId=areaByProjectAndName.get(`${project.id}\u0000${project.area}`);
    if(!primaryAreaId)throw new Error(`El proyecto ${project.id} no tiene un área principal migrable.`);
    return {...projectStages.find(row=>row.id===project.id),primary_area_id:primaryAreaId};
  });
  const initiativeOwners:Row[]=[];
  for(const initiative of source.initiatives){
    for(const profileId of unique([initiative.ownerUserId,...(initiative.ownerUserIds??[])])){
      initiativeOwners.push({initiative_id:initiative.id,profile_id:profileId,is_primary:profileId===initiative.ownerUserId});
    }
  }
  return {
    clients:source.clients.map(client=>({id:client.id,name:client.name})),
    profiles:source.users.map(user=>({
      id:user.id,name:user.name,email:user.email.trim().toLowerCase(),initials:user.initials,role:user.role,
      manage_users:Boolean(user.permissions?.manageUsers),manage_projects:Boolean(user.permissions?.manageProjects),
      manage_schedule:Boolean(user.permissions?.manageSchedule),active:user.active,entra_object_id:user.entraObjectId?.trim()||null,
    })),
    projectStages,projects,
    areas:source.areas.map(area=>({id:area.id,project_id:area.projectId,name:area.name,active:area.active})),
    project_members:source.projectMembers.map(member=>({id:member.id,project_id:member.projectId,profile_id:member.userId,access_level:member.accessLevel})),
    initiatives:source.initiatives.map(item=>({
      id:item.id,project_id:item.projectId,area_id:item.areaId,name:item.name,description:item.description??null,
      success_criteria:item.successCriteria??null,status:item.status,start_date:item.startDate,deadline:item.deadline||null,impact:item.impact,
    })),
    initiative_owners:initiativeOwners,
    versions:source.versions.map(item=>({
      id:item.id,initiative_id:item.initiativeId,code:item.code,name:item.name,status:item.status,
      owner_profile_id:item.ownerUserId,start_date:item.startDate,deadline:item.deadline,validated:item.validated,
    })),
    tasks:source.tasks.map(item=>({
      id:item.id,project_id:item.projectId,initiative_id:item.initiativeId,version_id:item.versionId,title:item.title,
      description:item.description,priority:item.priority,status:item.status,deadline:item.deadline,
      estimated_minutes:item.estimatedMinutes,splittable:item.splittable,progress:item.progress,assigned_profile_id:item.assignedUserId,
    })),
    subtasks:source.subtasks.map(item=>({
      id:item.id,task_id:item.taskId,title:item.title,completed:item.completed,assigned_profile_id:item.assignedUserId,
      completed_at:item.completedAt??null,
    })),
    task_dependencies:source.taskDependencies.map(item=>({id:item.id,task_id:item.taskId,depends_on_task_id:item.dependsOnTaskId})),
    schedule_blocks:source.scheduleBlocks.map(item=>({
      id:item.id,profile_id:item.userId,task_id:item.taskId,plan_date:item.date,start_time:item.startTime||null,end_time:item.endTime||null,
      source:item.source,completed:item.completed,outcome:item.completed?"completed":item.outcome??"planned",
      completed_at:item.completed?item.completedAt??null:null,
    })),
    work_preferences:source.workPreferences.map(item=>({
      id:item.id,profile_id:item.userId,day_start:item.dayStart,day_end:item.dayEnd,
      working_days:item.workingDays,focus_block_minutes:item.focusBlockMinutes,
    })),
  };
}

function steps(plan:MigrationPlan):Step[]{return[
  {table:"clients",rows:plan.clients,conflict:"id"},
  {table:"profiles",rows:plan.profiles,conflict:"id"},
  {table:"projects",rows:plan.projectStages,conflict:"id"},
  {table:"areas",rows:plan.areas,conflict:"id"},
  {table:"projects",rows:plan.projects,conflict:"id"},
  {table:"project_members",rows:plan.project_members,conflict:"id"},
  {table:"initiatives",rows:plan.initiatives,conflict:"id"},
  {table:"initiative_owners",rows:plan.initiative_owners,conflict:"initiative_id,profile_id"},
  {table:"versions",rows:plan.versions,conflict:"id"},
  {table:"tasks",rows:plan.tasks,conflict:"id"},
  {table:"subtasks",rows:plan.subtasks,conflict:"id"},
  {table:"task_dependencies",rows:plan.task_dependencies,conflict:"id"},
  {table:"schedule_blocks",rows:plan.schedule_blocks,conflict:"id"},
  {table:"work_preferences",rows:plan.work_preferences,conflict:"id"},
]}

const targetEntries=(plan:MigrationPlan):Array<[TargetTable,Row[]]>=>[
  ["clients",plan.clients],["profiles",plan.profiles],["projects",plan.projects],["areas",plan.areas],
  ["project_members",plan.project_members],["initiatives",plan.initiatives],["initiative_owners",plan.initiative_owners],
  ["versions",plan.versions],["tasks",plan.tasks],["subtasks",plan.subtasks],["task_dependencies",plan.task_dependencies],
  ["schedule_blocks",plan.schedule_blocks],["work_preferences",plan.work_preferences],
];

async function assertSafeTarget(client:SupabaseAdminRestClient,plan:MigrationPlan):Promise<void>{
  for(const [table,expectedRows] of targetEntries(plan)){
    const columns=table==="initiative_owners"?"initiative_id,profile_id":"id";
    const existing=await client.select<Row>(table,columns);
    const expected=new Set(expectedRows.map(row=>keyFor(table,row)));
    const unexpected=existing.map(row=>keyFor(table,row)).filter(key=>!expected.has(key));
    if(unexpected.length)throw new Error(`Supabase contiene ${unexpected.length} registros ajenos a la migración en ${table}; se abortó sin sobrescribirlos.`);
  }
}

async function applyPlan(client:SupabaseAdminRestClient,plan:MigrationPlan):Promise<void>{
  for(const step of steps(plan)){
    for(let offset=0;offset<step.rows.length;offset+=BATCH_SIZE){
      await client.upsert(step.table,step.rows.slice(offset,offset+BATCH_SIZE),step.conflict);
    }
  }
}

function verifyReferences(target:Record<TargetTable,Row[]>):string[]{
  const errors:string[]=[];
  const ids=(table:TargetTable)=>new Set(target[table].map(row=>text(row.id)));
  const clients=ids("clients"),profiles=ids("profiles"),projects=ids("projects"),initiatives=ids("initiatives"),tasks=ids("tasks");
  const areaRows=new Map(target.areas.map(row=>[text(row.id),row]));
  const initiativeRows=new Map(target.initiatives.map(row=>[text(row.id),row]));
  const versionRows=new Map(target.versions.map(row=>[text(row.id),row]));
  for(const row of target.projects){const clientId=text(row.client_id);const area=areaRows.get(text(row.primary_area_id));if((clientId!==""&&clientId!==null&&clientId!==undefined&&!clients.has(clientId))||!area||text(area.project_id)!==text(row.id))errors.push(`projects:${text(row.id)}`)}
  for(const row of target.areas)if(!projects.has(text(row.project_id)))errors.push(`areas:${text(row.id)}`);
  for(const row of target.project_members)if(!projects.has(text(row.project_id))||!profiles.has(text(row.profile_id)))errors.push(`project_members:${text(row.id)}`);
  for(const row of target.initiatives){const area=areaRows.get(text(row.area_id));if(!projects.has(text(row.project_id))||!area||text(area.project_id)!==text(row.project_id))errors.push(`initiatives:${text(row.id)}`)}
  for(const row of target.initiative_owners)if(!initiatives.has(text(row.initiative_id))||!profiles.has(text(row.profile_id)))errors.push(`initiative_owners:${text(row.initiative_id)}`);
  for(const row of target.versions)if(!initiatives.has(text(row.initiative_id))||!profiles.has(text(row.owner_profile_id)))errors.push(`versions:${text(row.id)}`);
  for(const row of target.tasks){const initiative=initiativeRows.get(text(row.initiative_id)),version=versionRows.get(text(row.version_id));if(!projects.has(text(row.project_id))||!initiative||!version||text(initiative.project_id)!==text(row.project_id)||text(version.initiative_id)!==text(row.initiative_id)||!profiles.has(text(row.assigned_profile_id)))errors.push(`tasks:${text(row.id)}`)}
  for(const row of target.subtasks)if(!tasks.has(text(row.task_id))||!profiles.has(text(row.assigned_profile_id)))errors.push(`subtasks:${text(row.id)}`);
  for(const row of target.task_dependencies)if(!tasks.has(text(row.task_id))||!tasks.has(text(row.depends_on_task_id)))errors.push(`task_dependencies:${text(row.id)}`);
  for(const row of target.schedule_blocks)if(!tasks.has(text(row.task_id))||!profiles.has(text(row.profile_id)))errors.push(`schedule_blocks:${text(row.id)}`);
  for(const row of target.work_preferences)if(!profiles.has(text(row.profile_id)))errors.push(`work_preferences:${text(row.id)}`);
  return unique(errors);
}

async function verifyMigration(client:SupabaseAdminRestClient,plan:MigrationPlan,sourceRecords:number){
  const target={} as Record<TargetTable,Row[]>;
  for(const [table] of targetEntries(plan))target[table]=await client.select<Row>(table,"*");
  const comparisons=targetEntries(plan).map(([table,expected])=>({table,expected:expected.length,actual:target[table].length,status:expected.length===target[table].length?"ok":"error"}));
  const missingOrUnexpected=targetEntries(plan).flatMap(([table,expected])=>{
    const expectedKeys=new Set(expected.map(row=>keyFor(table,row))),actualKeys=new Set(target[table].map(row=>keyFor(table,row)));
    return [...expectedKeys].filter(key=>!actualKeys.has(key)).map(key=>`${table}:missing:${key}`)
      .concat([...actualKeys].filter(key=>!expectedKeys.has(key)).map(key=>`${table}:unexpected:${key}`));
  });
  const relationErrors=verifyReferences(target);
  const baseTables:TargetTable[]=["clients","profiles","projects","areas","project_members","initiatives","versions","tasks","subtasks","task_dependencies","schedule_blocks","work_preferences"];
  const migratedSourceRecords=baseTables.reduce((sum,table)=>sum+target[table].length,0);
  return {status:comparisons.every(row=>row.status==="ok")&&!missingOrUnexpected.length&&!relationErrors.length&&migratedSourceRecords===sourceRecords?"ok":"error",sourceRecords,migratedSourceRecords,normalizedInitiativeOwners:target.initiative_owners.length,comparisons,missingOrUnexpected,relationErrors};
}

const args=new Set(process.argv.slice(2));
const apply=args.has("--apply"),dryRun=args.has("--dry-run")||!apply;
if((apply&&args.has("--dry-run"))||[...args].some(arg=>arg!=="--apply"&&arg!=="--dry-run")){
  console.error(JSON.stringify({status:"error",error:"Usá únicamente --dry-run o --apply."},null,2));
  process.exitCode=1;
}else{
  try{
    const {report,rows}=await prevalidateSharePointMigration();
    if(report.summary.ERROR)throw new Error("La prevalidación contiene errores; no se realizó ninguna escritura.");
    const plan=buildPlan(rows);
    const plannedCounts=Object.fromEntries(targetEntries(plan).map(([table,items])=>[table,items.length]));
    if(dryRun){
      console.log(JSON.stringify({status:"ready",mode:"dry-run",writesPerformed:0,prevalidation:report.summary,sourceRecords:report.summary.records,plannedCounts,order:steps(plan).map(step=>step.table)},null,2));
    }else{
      const client=new SupabaseAdminRestClient(getSupabaseAdminConfig());
      await assertSafeTarget(client,plan);
      await applyPlan(client,plan);
      const verification=await verifyMigration(client,plan,report.summary.records);
      console.log(JSON.stringify({status:verification.status,mode:"apply",prevalidation:report.summary,verification},null,2));
      if(verification.status!=="ok")process.exitCode=1;
    }
  }catch(error){
    const safe=error instanceof SupabaseMigrationError
      ?{code:"SUPABASE_REQUEST_FAILED",operation:error.operation,table:error.table,httpStatus:error.httpStatus}
      :{code:"MIGRATION_ABORTED",message:error instanceof Error?error.message:"La migración fue abortada."};
    console.error(JSON.stringify({status:"error",mode:apply?"apply":"dry-run",error:safe},null,2));
    process.exitCode=1;
  }
}
