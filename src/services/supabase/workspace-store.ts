import type { AppData, Priority, Project, TaskStatus, UserRole } from "../../types/index.ts";
import { assembleWorkspace, type MappedWorkspaceLists } from "../sharepoint/assembler.ts";
import type { AreaRecord, DependencyRecord, InitiativeRecord, ProjectMemberRecord, ScheduleRecord, SubtaskRecord, TaskRecord, VersionRecord, WorkPreferencesRecord } from "../sharepoint/mappers.ts";
import { SupabaseAdminRestClient } from "./admin-rest-client.ts";

export type SupabaseTable = "clients"|"profiles"|"projects"|"areas"|"project_members"|"initiatives"|"initiative_owners"|"versions"|"tasks"|"subtasks"|"task_dependencies"|"schedule_blocks"|"work_preferences";
export type SupabaseRow = Record<string,unknown>;

const requiredText=(row:SupabaseRow,key:string):string=>{const value=row[key];if(typeof value!=="string"||!value.trim())throw new Error(`Supabase devolvió ${key} inválido.`);return value.trim()};
const optionalText=(row:SupabaseRow,key:string):string|undefined=>{const value=row[key];return typeof value==="string"&&value.trim()?value.trim():undefined};
const boolean=(row:SupabaseRow,key:string):boolean=>{if(typeof row[key]!=="boolean")throw new Error(`Supabase devolvió ${key} inválido.`);return row[key] as boolean};
const number=(row:SupabaseRow,key:string):number=>{if(typeof row[key]!=="number"||!Number.isFinite(row[key]))throw new Error(`Supabase devolvió ${key} inválido.`);return row[key] as number};
const stringArray=(row:SupabaseRow,key:string):number[]=>{if(!Array.isArray(row[key])||!(row[key] as unknown[]).every(value=>typeof value==="number"))throw new Error(`Supabase devolvió ${key} inválido.`);return row[key] as number[]};

export interface SupabaseSnapshot { rows:Record<SupabaseTable,SupabaseRow[]>;source:MappedWorkspaceLists }

export class SupabaseWorkspaceStore {
  readonly client:SupabaseAdminRestClient;
  constructor(client:SupabaseAdminRestClient=new SupabaseAdminRestClient()){this.client=client}

  async readRows():Promise<Record<SupabaseTable,SupabaseRow[]>>{
    const tables:SupabaseTable[]=["clients","profiles","projects","areas","project_members","initiatives","initiative_owners","versions","tasks","subtasks","task_dependencies","schedule_blocks","work_preferences"];
    const values=await Promise.all(tables.map(table=>this.client.select<SupabaseRow>(table,"*")));
    return Object.fromEntries(tables.map((table,index)=>[table,values[index]])) as Record<SupabaseTable,SupabaseRow[]>;
  }

  async snapshot():Promise<SupabaseSnapshot>{
    const rows=await this.readRows(),areasById=new Map(rows.areas.map(row=>[requiredText(row,"id"),row])),profilesById=new Map(rows.profiles.map(row=>[requiredText(row,"id"),row]));
    const ownersByInitiative=new Map<string,SupabaseRow[]>();
    for(const owner of rows.initiative_owners){const id=requiredText(owner,"initiative_id");ownersByInitiative.set(id,[...(ownersByInitiative.get(id)??[]),owner])}
    const source:MappedWorkspaceLists={
      clients:rows.clients.map(row=>({id:requiredText(row,"id"),name:requiredText(row,"name")})),
      users:rows.profiles.map(row=>({
        id:requiredText(row,"id"),name:requiredText(row,"name"),email:requiredText(row,"email").toLowerCase(),initials:requiredText(row,"initials"),
        role:requiredText(row,"role") as UserRole,assignedProjectIds:[],editableProjectIds:[],active:boolean(row,"active"),entraObjectId:optionalText(row,"entra_object_id"),
        permissions:{manageUsers:boolean(row,"manage_users"),manageProjects:boolean(row,"manage_projects"),manageSchedule:boolean(row,"manage_schedule")},revision:requiredText(row,"updated_at"),
      })),
      projects:rows.projects.map(row=>{const primary=areasById.get(requiredText(row,"primary_area_id"));return{id:requiredText(row,"id"),clientId:requiredText(row,"client_id"),name:requiredText(row,"name"),color:requiredText(row,"color"),area:primary?requiredText(primary,"name"):"",areas:[],active:boolean(row,"active"),revision:requiredText(row,"updated_at")} as Project}),
      areas:rows.areas.map(row=>({id:requiredText(row,"id"),projectId:requiredText(row,"project_id"),name:requiredText(row,"name"),active:boolean(row,"active"),revision:requiredText(row,"updated_at")} satisfies AreaRecord)),
      projectMembers:rows.project_members.map(row=>({id:requiredText(row,"id"),projectId:requiredText(row,"project_id"),userId:requiredText(row,"profile_id"),accessLevel:requiredText(row,"access_level") as ProjectMemberRecord["accessLevel"]})),
      initiatives:rows.initiatives.map(row=>{
        const id=requiredText(row,"id"),owners=ownersByInitiative.get(id)??[],primary=owners.find(owner=>boolean(owner,"is_primary"))??owners[0];
        if(!primary)throw new Error(`La iniciativa ${id} no tiene responsable.`);
        return{id,projectId:requiredText(row,"project_id"),areaId:requiredText(row,"area_id"),name:requiredText(row,"name"),description:optionalText(row,"description"),successCriteria:optionalText(row,"success_criteria"),status:requiredText(row,"status") as TaskStatus,ownerUserId:requiredText(primary,"profile_id"),ownerUserIds:owners.map(owner=>requiredText(owner,"profile_id")),startDate:requiredText(row,"start_date"),deadline:optionalText(row,"deadline")??"",impact:requiredText(row,"impact") as InitiativeRecord["impact"],revision:requiredText(row,"updated_at")} satisfies InitiativeRecord;
      }),
      versions:rows.versions.map(row=>({id:requiredText(row,"id"),initiativeId:requiredText(row,"initiative_id"),code:requiredText(row,"code"),name:requiredText(row,"name"),status:requiredText(row,"status") as TaskStatus,ownerUserId:requiredText(row,"owner_profile_id"),startDate:requiredText(row,"start_date"),deadline:requiredText(row,"deadline"),validated:boolean(row,"validated"),revision:requiredText(row,"updated_at")} satisfies VersionRecord)),
      tasks:rows.tasks.map(row=>({id:requiredText(row,"id"),projectId:requiredText(row,"project_id"),initiativeId:requiredText(row,"initiative_id"),versionId:requiredText(row,"version_id"),title:requiredText(row,"title"),description:optionalText(row,"description")??"",priority:requiredText(row,"priority") as Priority,status:requiredText(row,"status") as TaskStatus,deadline:requiredText(row,"deadline"),estimatedMinutes:number(row,"estimated_minutes"),splittable:boolean(row,"splittable"),progress:number(row,"progress"),assignedUserId:requiredText(row,"assigned_profile_id"),assignedProfileId:requiredText(row,"assigned_profile_id"),revision:requiredText(row,"updated_at")} satisfies TaskRecord)),
      subtasks:rows.subtasks.map(row=>({id:requiredText(row,"id"),taskId:requiredText(row,"task_id"),title:requiredText(row,"title"),completed:boolean(row,"completed"),assignedUserId:requiredText(row,"assigned_profile_id"),assignedProfileId:requiredText(row,"assigned_profile_id"),completedAt:optionalText(row,"completed_at"),revision:requiredText(row,"updated_at")} satisfies SubtaskRecord)),
      taskDependencies:rows.task_dependencies.map(row=>({id:requiredText(row,"id"),taskId:requiredText(row,"task_id"),dependsOnTaskId:requiredText(row,"depends_on_task_id")} satisfies DependencyRecord)),
      scheduleBlocks:rows.schedule_blocks.map(row=>({id:requiredText(row,"id"),userId:requiredText(row,"profile_id"),taskId:requiredText(row,"task_id"),date:requiredText(row,"plan_date"),startTime:optionalText(row,"start_time")??"",endTime:optionalText(row,"end_time")??"",source:requiredText(row,"source") as ScheduleRecord["source"],completed:boolean(row,"completed"),completedAt:optionalText(row,"completed_at"),outcome:requiredText(row,"outcome") as ScheduleRecord["outcome"],revision:requiredText(row,"updated_at")} satisfies ScheduleRecord)),
      workPreferences:rows.work_preferences.map(row=>({id:requiredText(row,"id"),userId:requiredText(row,"profile_id"),dayStart:requiredText(row,"day_start"),dayEnd:requiredText(row,"day_end"),workingDays:stringArray(row,"working_days"),focusBlockMinutes:number(row,"focus_block_minutes"),revision:requiredText(row,"updated_at")} satisfies WorkPreferencesRecord)),
    };
    for(const owner of rows.initiative_owners)if(!profilesById.has(requiredText(owner,"profile_id")))throw new Error("Una iniciativa referencia un perfil inexistente.");
    return{rows,source};
  }

  async load(currentUserId?:string):Promise<AppData>{
    const result=assembleWorkspace((await this.snapshot()).source,currentUserId);
    if(!result.data||Object.values(result.relationErrors).some(errors=>errors.length))throw new Error("Supabase contiene relaciones inválidas para ensamblar el workspace.");
    return result.data;
  }

  async list(table:SupabaseTable):Promise<SupabaseRow[]>{return this.client.select<SupabaseRow>(table,"*")}
  async byId(table:SupabaseTable,id:string):Promise<SupabaseRow|undefined>{return(await this.list(table)).find(row=>row.id===id)}
  async insert(table:SupabaseTable,row:SupabaseRow):Promise<SupabaseRow>{return this.client.insert<SupabaseRow>(table,row)}
  async update(table:SupabaseTable,id:string,row:SupabaseRow,expectedUpdatedAt?:string):Promise<SupabaseRow>{return this.client.updateById<SupabaseRow>(table,id,row,expectedUpdatedAt)}
  async upsert(table:SupabaseTable,rows:SupabaseRow[],conflict="id"):Promise<void>{await this.client.upsert(table,rows,conflict)}
  async delete(table:SupabaseTable,id:string,expectedUpdatedAt?:string):Promise<void>{await this.client.deleteById(table,id,expectedUpdatedAt)}
  async deleteWhere(table:SupabaseTable,filters:Record<string,string>):Promise<void>{await this.client.deleteWhere(table,filters)}
  async rpc<T>(name:string,parameters:Record<string,unknown>):Promise<T>{return this.client.rpc<T>(name,parameters)}
}
