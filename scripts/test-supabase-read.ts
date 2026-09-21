import { assembleWorkspace } from "../src/services/sharepoint/assembler.ts";
import { SupabaseMigrationError } from "../src/services/supabase/admin-rest-client.ts";
import { SupabaseWorkspaceStore, type SupabaseTable } from "../src/services/supabase/workspace-store.ts";

const EXPECTED_SOURCE_RECORDS=331;
const EXPECTED_INITIATIVE_OWNERS=66;
const tables:SupabaseTable[]=["clients","profiles","projects","areas","project_members","initiatives","initiative_owners","versions","tasks","subtasks","task_dependencies","schedule_blocks","work_preferences"];

function sanitizedError(error:unknown):{message:string;httpStatus?:number;table?:string} {
  if(error instanceof SupabaseMigrationError)return{message:error.message,httpStatus:error.httpStatus,table:error.table};
  return{message:error instanceof Error?error.message:"Error de lectura desconocido."};
}

try {
  if(process.env.DATA_PROVIDER?.trim().toLowerCase()!=="sharepoint")throw new Error("DATA_PROVIDER debe permanecer en sharepoint durante esta prueba.");
  if(process.env.SUPABASE_SCHEMA?.trim()!=="gestion_trabajo")throw new Error("SUPABASE_SCHEMA debe ser gestion_trabajo.");

  const store=new SupabaseWorkspaceStore();
  const snapshot=await store.snapshot();
  const counts=Object.fromEntries(tables.map(table=>[table,snapshot.rows[table].length])) as Record<SupabaseTable,number>;
  const sourceRecords=tables.filter(table=>table!=="initiative_owners").reduce((total,table)=>total+counts[table],0);
  const activeUser=snapshot.source.users.find(user=>user.active);
  if(!activeUser)throw new Error("No existe un usuario activo para probar currentUserId.");

  const assembled=assembleWorkspace(snapshot.source,activeUser.id);
  const relationErrors=Object.values(assembled.relationErrors).flat();
  const loaded=await store.load(activeUser.id);
  const checks={
    tableCount:tables.length===13,
    sourceRecords:sourceRecords===EXPECTED_SOURCE_RECORDS,
    initiativeOwners:counts.initiative_owners===EXPECTED_INITIATIVE_OWNERS,
    assembled:Boolean(assembled.data),
    relationErrors:relationErrors.length===0,
    currentUserResolved:loaded.user.id===activeUser.id,
  };
  const ok=Object.values(checks).every(Boolean);
  const result={
    status:ok?"ok":"error",
    readOnly:true,
    providerUnchanged:process.env.DATA_PROVIDER,
    schema:process.env.SUPABASE_SCHEMA,
    tables:tables.map(table=>({table,count:counts[table]})),
    totals:{tables:tables.length,sourceRecords,normalizedInitiativeOwners:counts.initiative_owners,physicalRows:sourceRecords+counts.initiative_owners},
    reconstructed:{clients:loaded.clients.length,projects:loaded.projects.length,users:loaded.users.length,initiatives:loaded.initiatives.length,versions:loaded.versions.length,tasks:loaded.tasks.length},
    assembly:{status:assembled.data?"ok":"error",relationErrors},
    currentUser:{resolved:checks.currentUserResolved,role:loaded.user.role,active:loaded.user.active},
    checks,
  };
  console.log(JSON.stringify(result,null,2));
  if(!ok)process.exitCode=1;
}catch(error){
  console.error(JSON.stringify({status:"error",readOnly:true,error:sanitizedError(error)},null,2));
  process.exitCode=1;
}
