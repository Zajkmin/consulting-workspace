import { randomUUID } from "node:crypto";
import { SupabaseConcurrencyError, SupabaseMigrationError } from "../src/services/supabase/admin-rest-client.ts";
import { SupabaseWorkspaceStore, type SupabaseRow, type SupabaseTable } from "../src/services/supabase/workspace-store.ts";

const expectedCounts:Record<SupabaseTable,number>={clients:6,profiles:14,projects:6,areas:14,project_members:15,initiatives:39,initiative_owners:66,versions:60,tasks:134,subtasks:0,task_dependencies:0,schedule_blocks:43,work_preferences:0};
const tables=Object.keys(expectedCounts) as SupabaseTable[];
const apply=process.argv.includes("--apply");
const store=new SupabaseWorkspaceStore();
const runId=`CRUD_TEST_${randomUUID()}`;
const ids={client:`${runId}_CLIENT`,profile:`${runId}_PROFILE`,project:`${runId}_PROJECT`,area1:`${runId}_AREA_1`,area2:`${runId}_AREA_2`,initiative:`${runId}_INITIATIVE`,version:`${runId}_VERSION`,task1:`${runId}_TASK_1`,task2:`${runId}_TASK_2`,subtask:`${runId}_SUBTASK`,dependency:`${runId}_DEPENDENCY`,block:`${runId}_BLOCK`,preferences:`${runId}_PREFERENCES`};
const operations:Array<{operation:string;status:"ok"|"error";detail?:string}>=[];

const text=(row:SupabaseRow,key:string):string=>typeof row[key]==="string"?row[key] as string:"";
const counts=async()=>{const rows=await store.readRows();return Object.fromEntries(tables.map(table=>[table,rows[table].length])) as Record<SupabaseTable,number>};
const total=(value:Record<SupabaseTable,number>)=>Object.values(value).reduce((sum,count)=>sum+count,0);
const sameCounts=(left:Record<SupabaseTable,number>,right:Record<SupabaseTable,number>)=>tables.every(table=>left[table]===right[table]);
const record=(operation:string,action:()=>Promise<unknown>)=>action().then(()=>operations.push({operation,status:"ok"})).catch(error=>{operations.push({operation,status:"error",detail:error instanceof Error?error.message:"Error desconocido"});throw error});
const sanitized=(error:unknown)=>error instanceof SupabaseMigrationError?{message:error.message,httpStatus:error.httpStatus,resource:error.table}:{message:error instanceof Error?error.message:"Error desconocido"};

let initial:Record<SupabaseTable,number>|undefined;
let final:Record<SupabaseTable,number>|undefined;
let testError:unknown;
let cleanupError:unknown;
let staleConflict=false;
let stalePreserved=false;

try {
  if(!apply)throw new Error("Este comando no escribe sin --apply.");
  if(process.env.DATA_PROVIDER?.trim().toLowerCase()!=="sharepoint")throw new Error("DATA_PROVIDER debe permanecer en sharepoint.");
  if(process.env.SUPABASE_SCHEMA?.trim()!=="gestion_trabajo")throw new Error("SUPABASE_SCHEMA debe ser gestion_trabajo.");
  initial=await counts();
  if(!sameCounts(initial,expectedCounts)||total(initial)!==397)throw new Error("Los conteos iniciales no coinciden; la prueba se abortó antes de escribir.");

  await record("create client",()=>store.insert("clients",{id:ids.client,name:`${runId} Cliente`}));
  await record("save_profile_with_members create",()=>store.rpc("save_profile_with_members",{p_record:{id:ids.profile,name:`${runId} Usuario`,email:`${runId.toLowerCase()}@example.invalid`,initials:"CT",role:"gestor",manage_users:false,manage_projects:true,manage_schedule:true,active:true,entra_object_id:null},p_members:[],p_expected_updated_at:null}));
  await record("save_project_with_areas create",()=>store.rpc("save_project_with_areas",{p_record:{id:ids.project,client_id:ids.client,name:`${runId} Proyecto`,color:"#8AA6B8",active:true,primary_area:"Área principal"},p_areas:[{id:ids.area1,name:"Área principal"},{id:ids.area2,name:"Área secundaria"}],p_manager_profile_id:ids.profile,p_expected_updated_at:null}));
  await record("save_initiative_with_owners create",()=>store.rpc("save_initiative_with_owners",{p_record:{id:ids.initiative,project_id:ids.project,area_id:ids.area1,name:`${runId} Iniciativa`,description:"Registro temporal",success_criteria:null,status:"Pendiente",start_date:"2026-09-19",deadline:null,impact:"Medio"},p_owners:[{profile_id:ids.profile,is_primary:true}],p_expected_updated_at:null}));
  await record("create version",()=>store.insert("versions",{id:ids.version,initiative_id:ids.initiative,code:"TEST",name:`${runId} Versión`,status:"Pendiente",owner_profile_id:ids.profile,start_date:"2026-09-19",deadline:"2026-09-30",validated:false}));
  await record("save_task_with_relations task and subtask",()=>store.rpc("save_task_with_relations",{p_record:{id:ids.task1,project_id:ids.project,initiative_id:ids.initiative,version_id:ids.version,title:`${runId} Tarea base`,description:"Temporal",priority:"Media",status:"Pendiente",deadline:"2026-09-30",estimated_minutes:0,splittable:true,progress:0,assigned_profile_id:ids.profile},p_subtasks:[{id:ids.subtask,title:"Subtarea temporal",completed:false,assigned_profile_id:ids.profile,completed_at:null}],p_dependencies:[],p_expected_updated_at:null}));
  await record("save_task_with_relations task and dependency",()=>store.rpc("save_task_with_relations",{p_record:{id:ids.task2,project_id:ids.project,initiative_id:ids.initiative,version_id:ids.version,title:`${runId} Tarea dependiente`,description:"Temporal",priority:"Alta",status:"Pendiente",deadline:"2026-09-30",estimated_minutes:0,splittable:true,progress:0,assigned_profile_id:ids.profile},p_subtasks:[],p_dependencies:[{id:ids.dependency,depends_on_task_id:ids.task1}],p_expected_updated_at:null}));
  await record("create schedule block",()=>store.insert("schedule_blocks",{id:ids.block,profile_id:ids.profile,task_id:ids.task2,plan_date:"2026-09-20",start_time:null,end_time:null,source:"manual",outcome:"planned",completed:false,completed_at:null}));
  await record("create work preferences",()=>store.insert("work_preferences",{id:ids.preferences,profile_id:ids.profile,day_start:"08:00",day_end:"17:00",working_days:[1,2,3,4,5],focus_block_minutes:60}));

  await record("workspace reconstruction",async()=>{const workspace=await store.load(ids.profile);if(workspace.user.id!==ids.profile||!workspace.projects.some(row=>row.id===ids.project)||!workspace.initiatives.some(row=>row.id===ids.initiative)||workspace.tasks.filter(row=>row.projectId===ids.project).length!==2)throw new Error("El workspace temporal no se reconstruyó correctamente.");const dependent=workspace.tasks.find(row=>row.id===ids.task2);if(!dependent?.dependencies.includes(ids.task1))throw new Error("La dependencia temporal no se reconstruyó.");const base=workspace.tasks.find(row=>row.id===ids.task1);if(!base?.subtasks.some(row=>row.id===ids.subtask))throw new Error("La subtarea temporal no se reconstruyó.")});

  const projectBefore=await store.byId("projects",ids.project);if(!projectBefore)throw new Error("No se encontró el proyecto temporal.");const oldRevision=text(projectBefore,"updated_at");
  await record("save_project_with_areas valid revision",()=>store.rpc("save_project_with_areas",{p_record:{id:ids.project,client_id:ids.client,name:`${runId} Proyecto actualizado`,color:"#8AA6B8",active:true,primary_area:"Área principal"},p_areas:[{id:ids.area1,name:"Área principal"},{id:ids.area2,name:"Área secundaria"}],p_manager_profile_id:null,p_expected_updated_at:oldRevision}));
  try {await store.rpc("save_project_with_areas",{p_record:{id:ids.project,client_id:ids.client,name:`${runId} NO DEBE GUARDARSE`,color:"#8AA6B8",active:true,primary_area:"Área principal"},p_areas:[{id:ids.area1,name:"Área principal"},{id:ids.area2,name:"Área secundaria"}],p_manager_profile_id:null,p_expected_updated_at:oldRevision});operations.push({operation:"stale revision rejected",status:"error",detail:"La actualización obsoleta fue aceptada."})}catch(error){if(!(error instanceof SupabaseConcurrencyError))throw error;staleConflict=true;operations.push({operation:"stale revision rejected",status:"ok"})}
  const projectAfter=await store.byId("projects",ids.project);stalePreserved=text(projectAfter??{},"name")===`${runId} Proyecto actualizado`;if(!stalePreserved)throw new Error("El conflicto de concurrencia modificó el proyecto.");

  const block=await store.byId("schedule_blocks",ids.block);if(!block)throw new Error("No se encontró el bloque temporal.");
  await record("set_block_outcome",()=>store.rpc("set_block_outcome",{p_id:ids.block,p_profile_id:ids.profile,p_outcome:"completed",p_expected_updated_at:text(block,"updated_at")}));
  const completedBlock=await store.byId("schedule_blocks",ids.block);if(completedBlock?.completed!==true||text(completedBlock,"outcome")!=="completed")throw new Error("set_block_outcome no completó el bloque temporal.");
}catch(error){testError=error}
finally{
  if(initial){
    try{
      await store.delete("projects",ids.project);
      await store.delete("profiles",ids.profile);
      await store.delete("clients",ids.client);
      operations.push({operation:"cleanup temporary roots",status:"ok"});
    }catch(error){cleanupError=error;operations.push({operation:"cleanup temporary roots",status:"error",detail:error instanceof Error?error.message:"Error desconocido"})}
    try{final=await counts()}catch(error){cleanupError=cleanupError??error}
  }
}

const countsRestored=Boolean(initial&&final&&sameCounts(initial,final)&&sameCounts(final,expectedCounts)&&total(final)===397);
const status=!testError&&!cleanupError&&staleConflict&&stalePreserved&&countsRestored?"ok":"error";
console.log(JSON.stringify({status,readWriteScope:"temporary records only",providerUnchanged:process.env.DATA_PROVIDER,operations,optimisticConcurrency:{staleConflict,stalePreserved},cleanup:{status:cleanupError?"error":"ok",countsRestored},counts:{initial,final,expected:expectedCounts,finalPhysicalRows:final?total(final):null},errors:[testError,cleanupError].filter(Boolean).map(sanitized)},null,2));
if(status!=="ok")process.exitCode=1;
