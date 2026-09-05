import type { Client, DailyTaskOutcome, Project, ScheduleBlock, Subtask, TaskStatus, User, WorkPreferences } from "../../types/index.ts";
import type { SharePointListItem } from "./list-reader.ts";

export interface MappingResult<T> { entities: T[]; errors: string[] }
export interface AreaRecord { id: string; projectId: string; name: string; active: boolean }
export interface InitiativeRecord { id:string; projectId:string; areaId:string; name:string; description?:string; successCriteria?:string; status:TaskStatus; ownerUserId:string; startDate:string; deadline:string; impact:"Alto"|"Medio"|"Bajo" }
export interface VersionRecord { id:string; initiativeId:string; code:string; name:string; status:TaskStatus; ownerUserId:string; startDate:string; deadline:string }
export interface TaskRecord { id:string; projectId:string; initiativeId:string; versionId:string; title:string; description:string; priority:"Alta"|"Media"|"Baja"; status:TaskStatus; deadline:string; estimatedMinutes:number; splittable:boolean; progress:number; assignedUserId:string }
export interface SubtaskRecord extends Omit<Subtask,"assignedTo"> { taskId:string; assignedUserId:string }
export interface DependencyRecord { id:string; taskId:string; dependsOnTaskId:string }
export interface ScheduleRecord extends ScheduleBlock { userId:string }
export interface WorkPreferencesRecord extends WorkPreferences { id:string; userId:string }
export interface ProjectMemberRecord { id:string; projectId:string; userId:string; accessLevel:"view"|"edit"|"admin" }

class InvalidFieldError extends Error {}
const fields = (item: SharePointListItem) => item.fields && typeof item.fields === "object" ? item.fields : (()=>{throw new InvalidFieldError("fields no es un objeto")})();
const requiredText = (f:Record<string,unknown>, key:string) => { const v=f[key]; if(typeof v!=="string"||!v.trim())throw new InvalidFieldError(`${key} debe ser texto no vacío`); return v.trim() };
const optionalText = (f:Record<string,unknown>, key:string) => { const v=f[key]; if(v===undefined||v===null||v==="")return undefined; if(typeof v!=="string")throw new InvalidFieldError(`${key} debe ser texto`); return v.trim() };
const boolean = (f:Record<string,unknown>, key:string) => { const v=f[key]; if(v===true||v===1||v==="1"||v==="true")return true;if(v===false||v===0||v==="0"||v==="false")return false;throw new InvalidFieldError(`${key} debe ser Sí/No`) };
const number = (f:Record<string,unknown>, key:string) => { const v=f[key]; if(typeof v==="number"&&Number.isFinite(v))return v;if(typeof v==="string"&&v.trim()!==""&&Number.isFinite(Number(v)))return Number(v);throw new InvalidFieldError(`${key} debe ser numérico`) };
const oneOf = <T extends string>(f:Record<string,unknown>,key:string,values:readonly T[]):T => {const v=requiredText(f,key);if(!values.includes(v as T))throw new InvalidFieldError(`${key} contiene un valor no permitido`);return v as T};
const date = (f:Record<string,unknown>, key:string) => {const v=requiredText(f,key);if(!/^\d{4}-\d{2}-\d{2}/.test(v)||Number.isNaN(Date.parse(v)))throw new InvalidFieldError(`${key} debe ser una fecha válida`);return v.slice(0,10)};
const optionalDateTime = (f:Record<string,unknown>,key:string) => {const v=optionalText(f,key);if(!v)return undefined;if(Number.isNaN(Date.parse(v)))throw new InvalidFieldError(`${key} debe ser fecha y hora válida`);return v};

export function mapItems<T>(list:string, items:SharePointListItem[], mapper:(f:Record<string,unknown>)=>T):MappingResult<T>{
  const entities:T[]=[],errors:string[]=[];
  items.forEach((item,index)=>{try{entities.push(mapper(fields(item)))}catch(error){errors.push(`${list}, elemento ${index+1}: ${error instanceof InvalidFieldError?error.message:"datos inválidos"}`)}});
  return {entities,errors};
}

const statuses=["Pendiente","En curso","En revisión","Completada","Retrasada"] as const;
export const listMappers = {
  projects:(items:SharePointListItem[])=>mapItems<Project>("CW_Projects",items,f=>{const area=requiredText(f,"PrimaryArea");return{id:requiredText(f,"AppId"),clientId:requiredText(f,"ClientId"),name:requiredText(f,"Title"),color:requiredText(f,"ColorHex"),area,areas:[],active:boolean(f,"IsActive")}}),
  clients:(items:SharePointListItem[])=>mapItems<Client>("CW_Clients",items,f=>({id:requiredText(f,"AppId"),name:requiredText(f,"Title")})),
  areas:(items:SharePointListItem[])=>mapItems<AreaRecord>("CW_Areas",items,f=>({id:requiredText(f,"AppId"),projectId:requiredText(f,"ProjectId"),name:requiredText(f,"Title"),active:boolean(f,"IsActive")})),
  initiatives:(items:SharePointListItem[])=>mapItems<InitiativeRecord>("CW_Initiatives",items,f=>({id:requiredText(f,"AppId"),projectId:requiredText(f,"ProjectId"),areaId:requiredText(f,"AreaId"),name:requiredText(f,"Title"),description:optionalText(f,"Description"),successCriteria:optionalText(f,"SuccessCriteria"),status:oneOf(f,"Status",statuses),ownerUserId:requiredText(f,"OwnerUserId"),startDate:date(f,"StartDate"),deadline:date(f,"Deadline"),impact:oneOf(f,"Impact",["Alto","Medio","Bajo"] as const)})),
  versions:(items:SharePointListItem[])=>mapItems<VersionRecord>("CW_Versions",items,f=>({id:requiredText(f,"AppId"),initiativeId:requiredText(f,"InitiativeId"),code:requiredText(f,"Code"),name:requiredText(f,"Title"),status:oneOf(f,"Status",statuses),ownerUserId:requiredText(f,"OwnerUserId"),startDate:date(f,"StartDate"),deadline:date(f,"Deadline")})),
  tasks:(items:SharePointListItem[])=>mapItems<TaskRecord>("CW_Tasks",items,f=>({id:requiredText(f,"AppId"),projectId:requiredText(f,"ProjectId"),initiativeId:requiredText(f,"InitiativeId"),versionId:requiredText(f,"VersionId"),title:requiredText(f,"Title"),description:optionalText(f,"Description")??"",priority:oneOf(f,"Priority",["Alta","Media","Baja"] as const),status:oneOf(f,"Status",statuses),deadline:date(f,"Deadline"),estimatedMinutes:number(f,"EstimatedMinutes"),splittable:boolean(f,"IsSplittable"),progress:number(f,"Progress"),assignedUserId:requiredText(f,"AssignedUserId")})),
  subtasks:(items:SharePointListItem[])=>mapItems<SubtaskRecord>("CW_Subtasks",items,f=>({id:requiredText(f,"AppId"),taskId:requiredText(f,"TaskId"),title:requiredText(f,"Title"),completed:boolean(f,"IsCompleted"),assignedUserId:requiredText(f,"AssignedUserId"),completedAt:optionalDateTime(f,"CompletedAt")})),
  taskDependencies:(items:SharePointListItem[])=>mapItems<DependencyRecord>("CW_TaskDependencies",items,f=>({id:requiredText(f,"AppId"),taskId:requiredText(f,"TaskId"),dependsOnTaskId:requiredText(f,"DependsOnTaskId")})),
  scheduleBlocks:(items:SharePointListItem[])=>mapItems<ScheduleRecord>("CW_ScheduleBlocks",items,f=>{const completed=boolean(f,"IsCompleted"),stored=oneOf(f,"Outcome",["planned","advanced"] as const);const outcome:DailyTaskOutcome=completed?"completed":stored;return{id:requiredText(f,"AppId"),userId:requiredText(f,"UserId"),taskId:requiredText(f,"TaskId"),date:date(f,"PlanDate"),startTime:optionalText(f,"StartTime")??"",endTime:optionalText(f,"EndTime")??"",source:oneOf(f,"Source",["manual","suggested"] as const),completed,completedAt:completed?optionalDateTime(f,"CompletedAt"):undefined,outcome}}),
  workPreferences:(items:SharePointListItem[])=>mapItems<WorkPreferencesRecord>("CW_WorkPreferences",items,f=>{const workingDays=requiredText(f,"WorkingDays").split(",").map(v=>Number(v.trim()));if(workingDays.some(v=>!Number.isInteger(v)||v<0||v>6))throw new InvalidFieldError("WorkingDays debe contener días 0–6 separados por coma");return{id:requiredText(f,"AppId"),userId:requiredText(f,"UserId"),dayStart:requiredText(f,"DayStart"),dayEnd:requiredText(f,"DayEnd"),workingDays,focusBlockMinutes:number(f,"FocusBlockMinutes")}}),
  users:(items:SharePointListItem[])=>mapItems<User>("CW_Users",items,f=>({id:requiredText(f,"AppId"),name:requiredText(f,"Title"),email:requiredText(f,"Email"),initials:requiredText(f,"Initials"),role:oneOf(f,"Role",["admin","usuario"] as const),assignedProjectIds:[],editableProjectIds:[],permissions:{manageUsers:boolean(f,"ManageUsers"),manageProjects:boolean(f,"ManageProjects"),manageSchedule:boolean(f,"ManageSchedule")},active:boolean(f,"IsActive")})),
  projectMembers:(items:SharePointListItem[])=>mapItems<ProjectMemberRecord>("CW_ProjectMembers",items,f=>({id:requiredText(f,"AppId"),projectId:requiredText(f,"ProjectId"),userId:requiredText(f,"UserId"),accessLevel:oneOf(f,"AccessLevel",["view","edit","admin"] as const)})),
};
